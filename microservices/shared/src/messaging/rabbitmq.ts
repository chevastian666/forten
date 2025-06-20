// RabbitMQ client for event-driven communication between microservices

import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../logger';
import { BaseEvent, EventType, EventSubscription, EXCHANGE_NAME, EXCHANGE_TYPE, DEAD_LETTER_EXCHANGE, DEAD_LETTER_QUEUE, getRoutingKey } from '../events';

// RabbitMQ connection configuration
export interface RabbitMQConfig {
  url: string;
  heartbeat?: number;
  prefetch?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  logger?: Logger;
}

// Message publishing options
export interface PublishOptions {
  persistent?: boolean;
  priority?: number;
  expiration?: string;
  correlationId?: string;
  replyTo?: string;
  headers?: Record<string, any>;
}

// Consumer options
export interface ConsumerOptions {
  noAck?: boolean;
  exclusive?: boolean;
  priority?: number;
  arguments?: Record<string, any>;
}

// RabbitMQ client class
export class RabbitMQClient {
  private config: RabbitMQConfig;
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private logger?: Logger;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private subscriptions: Map<string, EventSubscription> = new Map();

  constructor(config: RabbitMQConfig) {
    this.config = {
      heartbeat: 60,
      prefetch: 10,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      ...config,
    };
    this.logger = config.logger;
  }

  // Connect to RabbitMQ
  async connect(): Promise<void> {
    if (this.isConnecting) {
      this.logger?.warn('Already attempting to connect to RabbitMQ');
      return;
    }

    this.isConnecting = true;

    try {
      this.logger?.info('Connecting to RabbitMQ', { url: this.config.url });

      // Create connection
      this.connection = await amqp.connect(this.config.url, {
        heartbeat: this.config.heartbeat,
      });

      // Handle connection events
      this.connection.on('error', (err) => {
        this.logger?.error('RabbitMQ connection error', err);
      });

      this.connection.on('close', () => {
        this.logger?.warn('RabbitMQ connection closed');
        this.handleDisconnect();
      });

      // Create channel
      this.channel = await this.connection.createChannel();
      
      // Set prefetch
      await this.channel.prefetch(this.config.prefetch!);

      // Setup exchanges
      await this.setupExchanges();

      // Re-establish subscriptions if any
      await this.reestablishSubscriptions();

      this.reconnectAttempts = 0;
      this.isConnecting = false;

      this.logger?.info('Successfully connected to RabbitMQ');
    } catch (error) {
      this.isConnecting = false;
      this.logger?.error('Failed to connect to RabbitMQ', error as Error);
      throw error;
    }
  }

  // Setup exchanges
  private async setupExchanges(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    // Main exchange for events
    await this.channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
      durable: true,
    });

    // Dead letter exchange
    await this.channel.assertExchange(DEAD_LETTER_EXCHANGE, 'direct', {
      durable: true,
    });

    // Dead letter queue
    await this.channel.assertQueue(DEAD_LETTER_QUEUE, {
      durable: true,
    });

    await this.channel.bindQueue(DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE, '');
  }

  // Disconnect from RabbitMQ
  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.logger?.info('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger?.error('Error disconnecting from RabbitMQ', error as Error);
    }
  }

  // Handle disconnection and attempt reconnection
  private async handleDisconnect(): Promise<void> {
    this.connection = null;
    this.channel = null;

    if (this.reconnectAttempts < this.config.maxReconnectAttempts!) {
      this.reconnectAttempts++;
      
      this.logger?.info(`Attempting to reconnect to RabbitMQ (attempt ${this.reconnectAttempts})`);
      
      setTimeout(async () => {
        try {
          await this.connect();
        } catch (error) {
          this.logger?.error('Reconnection attempt failed', error as Error);
          this.handleDisconnect();
        }
      }, this.config.reconnectInterval);
    } else {
      this.logger?.error('Max reconnection attempts reached. Giving up.');
    }
  }

  // Publish an event
  async publish<T extends BaseEvent>(event: T, options: PublishOptions = {}): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    try {
      const routingKey = getRoutingKey(event.type);
      const message = Buffer.from(JSON.stringify(event));

      const publishOptions: amqp.Options.Publish = {
        persistent: options.persistent ?? true,
        contentType: 'application/json',
        timestamp: Date.now(),
        messageId: event.id,
        correlationId: options.correlationId || event.correlationId,
        headers: {
          ...options.headers,
          'x-event-type': event.type,
          'x-source': event.source,
        },
        ...options,
      };

      this.channel.publish(EXCHANGE_NAME, routingKey, message, publishOptions);

      this.logger?.debug('Event published', {
        eventId: event.id,
        eventType: event.type,
        routingKey,
      });
    } catch (error) {
      this.logger?.error('Failed to publish event', error as Error, {
        eventId: event.id,
        eventType: event.type,
      });
      throw error;
    }
  }

  // Subscribe to events
  async subscribe(subscription: EventSubscription): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    const { eventType, handler, queue, retries = 3, retryDelay = 1000 } = subscription;
    const queueName = queue || `${this.config.logger?.service || 'service'}.${eventType}`;
    const routingKey = getRoutingKey(eventType);

    try {
      // Assert queue with dead letter exchange
      await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': DEAD_LETTER_EXCHANGE,
          'x-message-ttl': 3600000, // 1 hour
        },
      });

      // Bind queue to exchange
      await this.channel.bindQueue(queueName, EXCHANGE_NAME, routingKey);

      // Store subscription for reconnection
      this.subscriptions.set(queueName, subscription);

      // Consume messages
      await this.channel.consume(queueName, async (msg) => {
        if (!msg) return;

        const startTime = Date.now();
        let attempt = 0;

        while (attempt <= retries) {
          try {
            const event = JSON.parse(msg.content.toString()) as BaseEvent;
            
            this.logger?.debug('Processing event', {
              eventId: event.id,
              eventType: event.type,
              attempt,
            });

            await handler(event);

            // Acknowledge message
            this.channel!.ack(msg);

            const duration = Date.now() - startTime;
            this.logger?.info('Event processed successfully', {
              eventId: event.id,
              eventType: event.type,
              duration,
            });

            break;
          } catch (error) {
            attempt++;
            
            this.logger?.error(`Failed to process event (attempt ${attempt})`, error as Error, {
              eventType,
              messageId: msg.properties.messageId,
            });

            if (attempt > retries) {
              // Send to dead letter queue
              this.channel!.nack(msg, false, false);
              
              this.logger?.error('Event sent to dead letter queue', error as Error, {
                eventType,
                messageId: msg.properties.messageId,
              });
            } else {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            }
          }
        }
      });

      this.logger?.info('Subscribed to events', {
        eventType,
        queue: queueName,
        routingKey,
      });
    } catch (error) {
      this.logger?.error('Failed to subscribe to events', error as Error, {
        eventType,
        queue: queueName,
      });
      throw error;
    }
  }

  // Unsubscribe from events
  async unsubscribe(eventType: EventType): Promise<void> {
    const queueName = `${this.config.logger?.service || 'service'}.${eventType}`;
    
    if (this.subscriptions.has(queueName)) {
      this.subscriptions.delete(queueName);
      
      if (this.channel) {
        await this.channel.deleteQueue(queueName);
      }
      
      this.logger?.info('Unsubscribed from events', { eventType, queue: queueName });
    }
  }

  // Re-establish subscriptions after reconnection
  private async reestablishSubscriptions(): Promise<void> {
    for (const [_, subscription] of this.subscriptions) {
      try {
        await this.subscribe(subscription);
      } catch (error) {
        this.logger?.error('Failed to re-establish subscription', error as Error, {
          eventType: subscription.eventType,
        });
      }
    }
  }

  // Request-Reply pattern
  async request<TRequest, TResponse>(
    queue: string,
    request: TRequest,
    timeout: number = 30000
  ): Promise<TResponse> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    const correlationId = uuidv4();
    const replyQueue = await this.channel.assertQueue('', { exclusive: true });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      // Consume reply
      this.channel!.consume(replyQueue.queue, (msg) => {
        if (!msg || msg.properties.correlationId !== correlationId) {
          return;
        }

        clearTimeout(timer);
        
        try {
          const response = JSON.parse(msg.content.toString()) as TResponse;
          resolve(response);
        } catch (error) {
          reject(error);
        }
      }, { noAck: true });

      // Send request
      this.channel!.sendToQueue(queue, Buffer.from(JSON.stringify(request)), {
        correlationId,
        replyTo: replyQueue.queue,
        expiration: timeout.toString(),
      });
    });
  }

  // Reply to request
  async reply<TResponse>(
    msg: ConsumeMessage,
    response: TResponse
  ): Promise<void> {
    if (!this.channel || !msg.properties.replyTo) {
      return;
    }

    this.channel.sendToQueue(
      msg.properties.replyTo,
      Buffer.from(JSON.stringify(response)),
      {
        correlationId: msg.properties.correlationId,
      }
    );
  }

  // Get channel (for advanced usage)
  getChannel(): Channel | null {
    return this.channel;
  }

  // Check if connected
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}

// Event builder helper
export class EventBuilder {
  static create<T extends BaseEvent>(
    type: EventType,
    data: Omit<T, 'id' | 'type' | 'timestamp' | 'source'>,
    source: string
  ): T {
    return {
      id: uuidv4(),
      type,
      timestamp: new Date(),
      source,
      ...data,
    } as T;
  }
}

// Singleton instance management
let defaultClient: RabbitMQClient | null = null;

export const createRabbitMQClient = (config: RabbitMQConfig): RabbitMQClient => {
  const client = new RabbitMQClient(config);
  
  if (!defaultClient) {
    defaultClient = client;
  }
  
  return client;
};

export const getDefaultClient = (): RabbitMQClient => {
  if (!defaultClient) {
    throw new Error('RabbitMQ client not initialized. Call createRabbitMQClient first.');
  }
  
  return defaultClient;
};