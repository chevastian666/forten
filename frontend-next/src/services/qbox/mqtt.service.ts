/**
 * Q-Box MQTT Service
 * Handles real-time communication with Q-Box devices via MQTT
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { QBOX_CONFIG, QBOX_EVENT_TYPES } from './config';
import { EventEmitter } from 'events';

interface MqttMessage {
  topic: string;
  payload: any;
  deviceId?: string;
  timestamp: Date;
}

interface DeviceStatus {
  deviceId: string;
  online: boolean;
  lastSeen: Date;
  firmwareVersion?: string;
  model?: string;
}

export class QBoxMqttService extends EventEmitter {
  private static instance: QBoxMqttService;
  private client: MqttClient | null = null;
  private connected = false;
  private subscribedTopics = new Set<string>();
  private deviceStatuses = new Map<string, DeviceStatus>();
  private reconnectAttempts = 0;
  private messageQueue: MqttMessage[] = [];

  private constructor() {
    super();
  }

  static getInstance(): QBoxMqttService {
    if (!QBoxMqttService.instance) {
      QBoxMqttService.instance = new QBoxMqttService();
    }
    return QBoxMqttService.instance;
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    if (this.connected) {
      console.log('MQTT already connected');
      return;
    }

    const clientId = `${QBOX_CONFIG.MQTT.CLIENT_ID_PREFIX}${Date.now()}`;
    
    const options: IClientOptions = {
      clientId,
      username: QBOX_CONFIG.MQTT.USERNAME,
      password: QBOX_CONFIG.MQTT.PASSWORD,
      reconnectPeriod: QBOX_CONFIG.MQTT.RECONNECT_PERIOD,
      connectTimeout: QBOX_CONFIG.MQTT.CONNECT_TIMEOUT,
      clean: true,
      rejectUnauthorized: true,
      protocol: 'wss',
      will: {
        topic: 'qbox/crm/status',
        payload: JSON.stringify({ status: 'offline', clientId }),
        qos: 1,
        retain: true
      }
    };

    try {
      this.client = mqtt.connect(QBOX_CONFIG.MQTT.BROKER_URL, options);
      
      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('MQTT connection timeout'));
        }, QBOX_CONFIG.MQTT.CONNECT_TIMEOUT);

        this.client!.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.client!.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      console.error('MQTT connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.connected = false;
      this.subscribedTopics.clear();
      this.deviceStatuses.clear();
      this.messageQueue = [];
    }
  }

  /**
   * Setup MQTT event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('MQTT connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Publish online status
      this.publishStatus('online');
      
      // Subscribe to default topics
      this.subscribeToDefaultTopics();
      
      // Process queued messages
      this.processMessageQueue();
      
      this.emit('connected');
    });

    this.client.on('message', (topic, payload) => {
      try {
        const message = JSON.parse(payload.toString());
        const deviceId = this.extractDeviceId(topic);
        
        const mqttMessage: MqttMessage = {
          topic,
          payload: message,
          deviceId,
          timestamp: new Date()
        };

        this.handleMessage(mqttMessage);
      } catch (error) {
        console.error('Error parsing MQTT message:', error);
      }
    });

    this.client.on('error', (error) => {
      console.error('MQTT error:', error);
      this.emit('error', error);
    });

    this.client.on('offline', () => {
      console.log('MQTT offline');
      this.connected = false;
      this.emit('offline');
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      console.log(`MQTT reconnecting (attempt ${this.reconnectAttempts})`);
      this.emit('reconnecting', this.reconnectAttempts);
    });

    this.client.on('close', () => {
      console.log('MQTT connection closed');
      this.connected = false;
      this.emit('disconnected');
    });
  }

  /**
   * Subscribe to default topics
   */
  private subscribeToDefaultTopics(): void {
    const topics = [
      QBOX_CONFIG.MQTT_TOPICS.DEVICE_STATUS,
      QBOX_CONFIG.MQTT_TOPICS.DEVICE_EVENT,
      QBOX_CONFIG.MQTT_TOPICS.DEVICE_HEARTBEAT,
      QBOX_CONFIG.MQTT_TOPICS.ACCESS_REQUEST,
      QBOX_CONFIG.MQTT_TOPICS.ACCESS_GRANTED,
      QBOX_CONFIG.MQTT_TOPICS.ACCESS_DENIED,
      QBOX_CONFIG.MQTT_TOPICS.PIN_ENTERED,
      QBOX_CONFIG.MQTT_TOPICS.SYSTEM_BROADCAST
    ];

    topics.forEach(topic => this.subscribe(topic));
  }

  /**
   * Subscribe to topic
   */
  subscribe(topic: string): void {
    if (!this.client || !this.connected) {
      console.warn('MQTT not connected, queuing subscription:', topic);
      return;
    }

    if (this.subscribedTopics.has(topic)) {
      return;
    }

    this.client.subscribe(topic, { qos: QBOX_CONFIG.MQTT.QOS }, (error) => {
      if (error) {
        console.error(`Failed to subscribe to ${topic}:`, error);
        this.emit('subscribeError', { topic, error });
      } else {
        this.subscribedTopics.add(topic);
        console.log(`Subscribed to ${topic}`);
        this.emit('subscribed', topic);
      }
    });
  }

  /**
   * Unsubscribe from topic
   */
  unsubscribe(topic: string): void {
    if (!this.client || !this.connected) return;

    this.client.unsubscribe(topic, (error) => {
      if (error) {
        console.error(`Failed to unsubscribe from ${topic}:`, error);
      } else {
        this.subscribedTopics.delete(topic);
        console.log(`Unsubscribed from ${topic}`);
        this.emit('unsubscribed', topic);
      }
    });
  }

  /**
   * Publish message
   */
  publish(topic: string, message: any, options?: mqtt.IClientPublishOptions): void {
    const payload = JSON.stringify(message);
    
    if (!this.client || !this.connected) {
      // Queue message for later
      this.messageQueue.push({
        topic,
        payload: message,
        timestamp: new Date()
      });
      return;
    }

    const publishOptions = {
      qos: QBOX_CONFIG.MQTT.QOS,
      retain: QBOX_CONFIG.MQTT.RETAIN,
      ...options
    };

    this.client.publish(topic, payload, publishOptions, (error) => {
      if (error) {
        console.error(`Failed to publish to ${topic}:`, error);
        this.emit('publishError', { topic, error });
      } else {
        this.emit('published', { topic, message });
      }
    });
  }

  /**
   * Send command to device
   */
  sendCommand(deviceId: string, command: string, params?: any): void {
    const topic = `qbox/${deviceId}/command`;
    const message = {
      command,
      params,
      timestamp: Date.now(),
      requestId: this.generateRequestId()
    };

    this.publish(topic, message);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: MqttMessage): void {
    const { topic, payload, deviceId } = message;

    // Handle device status
    if (topic.includes('/status')) {
      this.handleDeviceStatus(deviceId!, payload);
    }
    
    // Handle device events
    else if (topic.includes('/event')) {
      this.handleDeviceEvent(deviceId!, payload);
    }
    
    // Handle heartbeat
    else if (topic.includes('/heartbeat')) {
      this.handleHeartbeat(deviceId!, payload);
    }
    
    // Handle access events
    else if (topic.includes('/access/')) {
      this.handleAccessEvent(topic, deviceId!, payload);
    }
    
    // Handle PIN events
    else if (topic.includes('/pin/')) {
      this.handlePinEvent(topic, deviceId!, payload);
    }
    
    // Handle system broadcast
    else if (topic.includes('/system/broadcast')) {
      this.handleSystemBroadcast(payload);
    }

    // Emit raw message for custom handling
    this.emit('message', message);
  }

  /**
   * Handle device status update
   */
  private handleDeviceStatus(deviceId: string, status: any): void {
    const deviceStatus: DeviceStatus = {
      deviceId,
      online: status.online,
      lastSeen: new Date(),
      firmwareVersion: status.firmwareVersion,
      model: status.model
    };

    this.deviceStatuses.set(deviceId, deviceStatus);
    this.emit('deviceStatus', deviceStatus);
  }

  /**
   * Handle device event
   */
  private handleDeviceEvent(deviceId: string, event: any): void {
    const eventType = event.type || 'unknown';
    
    this.emit('deviceEvent', {
      deviceId,
      eventType,
      data: event,
      timestamp: new Date()
    });

    // Emit specific event types
    if (Object.values(QBOX_EVENT_TYPES).includes(eventType)) {
      this.emit(eventType, { deviceId, ...event });
    }
  }

  /**
   * Handle heartbeat
   */
  private handleHeartbeat(deviceId: string, data: any): void {
    const status = this.deviceStatuses.get(deviceId) || {
      deviceId,
      online: true,
      lastSeen: new Date()
    };

    status.lastSeen = new Date();
    status.online = true;
    
    this.deviceStatuses.set(deviceId, status);
    this.emit('heartbeat', { deviceId, ...data });
  }

  /**
   * Handle access event
   */
  private handleAccessEvent(topic: string, deviceId: string, data: any): void {
    const eventType = topic.includes('granted') ? 'accessGranted' : 
                     topic.includes('denied') ? 'accessDenied' : 
                     'accessRequest';
    
    this.emit(eventType, {
      deviceId,
      userId: data.userId,
      method: data.method,
      reason: data.reason,
      timestamp: new Date()
    });
  }

  /**
   * Handle PIN event
   */
  private handlePinEvent(topic: string, deviceId: string, data: any): void {
    const eventType = topic.includes('entered') ? 'pinEntered' : 'pinValidated';
    
    this.emit(eventType, {
      deviceId,
      pin: data.pin?.replace(/./g, '*'), // Mask PIN for security
      valid: data.valid,
      userId: data.userId,
      timestamp: new Date()
    });
  }

  /**
   * Handle system broadcast
   */
  private handleSystemBroadcast(data: any): void {
    this.emit('systemBroadcast', data);
  }

  /**
   * Extract device ID from topic
   */
  private extractDeviceId(topic: string): string | undefined {
    const parts = topic.split('/');
    return parts[1] !== '+' ? parts[1] : undefined;
  }

  /**
   * Publish status
   */
  private publishStatus(status: 'online' | 'offline'): void {
    const topic = 'qbox/crm/status';
    const message = {
      status,
      clientId: this.client?.options.clientId,
      timestamp: Date.now()
    };

    this.publish(topic, message, { retain: true });
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.publish(message.topic, message.payload);
    }
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device status
   */
  getDeviceStatus(deviceId: string): DeviceStatus | undefined {
    return this.deviceStatuses.get(deviceId);
  }

  /**
   * Get all device statuses
   */
  getAllDeviceStatuses(): Map<string, DeviceStatus> {
    return new Map(this.deviceStatuses);
  }

  /**
   * Is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get subscribed topics
   */
  getSubscribedTopics(): string[] {
    return Array.from(this.subscribedTopics);
  }
}

export const qboxMqttService = QBoxMqttService.getInstance();