/**
 * HikCentral WebSocket Service
 * Handles real-time events and notifications from HikCentral
 */

import { HIKVISION_CONFIG, HIKVISION_EVENT_TYPES } from './config';
import { hikCentralAuth } from './auth';

interface WebSocketMessage {
  eventType: number;
  eventTypeName: string;
  eventTime: string;
  resourceType: string;
  resourceIndexCode: string;
  resourceName: string;
  eventData: any;
}

interface EventSubscription {
  id: string;
  resourceType: string;
  resourceIndexCodes: string[];
  eventTypes: number[];
  callback: (event: WebSocketMessage) => void;
}

class HikCentralWebSocket {
  private static instance: HikCentralWebSocket;
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private messageQueue: any[] = [];

  private constructor() {}

  static getInstance(): HikCentralWebSocket {
    if (!HikCentralWebSocket.instance) {
      HikCentralWebSocket.instance = new HikCentralWebSocket();
    }
    return HikCentralWebSocket.instance;
  }

  /**
   * Connect to HikCentral WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws && this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      // Get authentication token
      const token = await hikCentralAuth.getValidToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }

      // Construct WebSocket URL with authentication
      const wsUrl = `${HIKVISION_CONFIG.WEBSOCKET.URL}?token=${token.access_token}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('HikCentral WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Process queued messages
        this.processMessageQueue();
        
        // Re-subscribe to all events
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
        this.stopHeartbeat();
        
        // Attempt reconnection
        if (this.reconnectAttempts < HIKVISION_CONFIG.STREAMING.MAX_RECONNECT_ATTEMPTS) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      throw error;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.stopHeartbeat();
    this.subscriptions.clear();
    this.messageQueue = [];
  }

  /**
   * Subscribe to events
   */
  subscribeToEvents(params: {
    resourceType: string;
    resourceIndexCodes: string[];
    eventTypes: number[];
    callback: (event: WebSocketMessage) => void;
  }): string {
    const subscriptionId = this.generateSubscriptionId();
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      ...params
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Send subscription message
    const message = {
      type: 'subscribe',
      subscriptionId,
      resourceType: params.resourceType,
      resourceIndexCodes: params.resourceIndexCodes,
      eventTypes: params.eventTypes
    };

    this.sendMessage(message);

    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribeFromEvents(subscriptionId: string): void {
    if (!this.subscriptions.has(subscriptionId)) {
      console.warn('Subscription not found:', subscriptionId);
      return;
    }

    this.subscriptions.delete(subscriptionId);

    // Send unsubscribe message
    const message = {
      type: 'unsubscribe',
      subscriptionId
    };

    this.sendMessage(message);
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(message: any): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle different message types
      switch (message.type) {
        case 'event':
          this.handleEventMessage(message);
          break;
        case 'heartbeat':
          // Heartbeat response received
          break;
        case 'error':
          console.error('WebSocket error message:', message);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle event message
   */
  private handleEventMessage(message: any): void {
    const wsMessage: WebSocketMessage = {
      eventType: message.eventType,
      eventTypeName: this.getEventTypeName(message.eventType),
      eventTime: message.eventTime,
      resourceType: message.resourceType,
      resourceIndexCode: message.resourceIndexCode,
      resourceName: message.resourceName,
      eventData: message.eventData
    };

    // Find matching subscriptions
    this.subscriptions.forEach(subscription => {
      if (
        subscription.resourceType === wsMessage.resourceType &&
        subscription.resourceIndexCodes.includes(wsMessage.resourceIndexCode) &&
        subscription.eventTypes.includes(wsMessage.eventType)
      ) {
        subscription.callback(wsMessage);
      }
    });
  }

  /**
   * Get event type name
   */
  private getEventTypeName(eventType: number): string {
    const eventNames = Object.entries(HIKVISION_EVENT_TYPES).find(
      ([_, value]) => value === eventType
    );
    return eventNames ? eventNames[0] : 'UNKNOWN_EVENT';
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.sendMessage({ type: 'heartbeat' });
      }
    }, HIKVISION_CONFIG.WEBSOCKET.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = HIKVISION_CONFIG.WEBSOCKET.RECONNECT_DELAY * this.reconnectAttempts;
    
    console.log(`Scheduling WebSocket reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  /**
   * Re-subscribe to all events after reconnection
   */
  private resubscribeAll(): void {
    this.subscriptions.forEach(subscription => {
      const message = {
        type: 'subscribe',
        subscriptionId: subscription.id,
        resourceType: subscription.resourceType,
        resourceIndexCodes: subscription.resourceIndexCodes,
        eventTypes: subscription.eventTypes
      };
      this.sendMessage(message);
    });
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Subscribe to motion detection events
   */
  subscribeToMotionDetection(
    cameraIndexCodes: string[],
    callback: (event: WebSocketMessage) => void
  ): string {
    return this.subscribeToEvents({
      resourceType: 'camera',
      resourceIndexCodes: cameraIndexCodes,
      eventTypes: [HIKVISION_EVENT_TYPES.MOTION_DETECTION],
      callback
    });
  }

  /**
   * Subscribe to access control events
   */
  subscribeToAccessControl(
    doorIndexCodes: string[],
    callback: (event: WebSocketMessage) => void
  ): string {
    return this.subscribeToEvents({
      resourceType: 'door',
      resourceIndexCodes: doorIndexCodes,
      eventTypes: [
        HIKVISION_EVENT_TYPES.DOOR_OPEN,
        HIKVISION_EVENT_TYPES.DOOR_CLOSE,
        HIKVISION_EVENT_TYPES.DOOR_ABNORMAL
      ],
      callback
    });
  }

  /**
   * Subscribe to device status events
   */
  subscribeToDeviceStatus(
    deviceIndexCodes: string[],
    callback: (event: WebSocketMessage) => void
  ): string {
    return this.subscribeToEvents({
      resourceType: 'device',
      resourceIndexCodes: deviceIndexCodes,
      eventTypes: [
        HIKVISION_EVENT_TYPES.DEVICE_ONLINE,
        HIKVISION_EVENT_TYPES.DEVICE_OFFLINE
      ],
      callback
    });
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    reconnectAttempts: number;
    subscriptionCount: number;
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscriptionCount: this.subscriptions.size
    };
  }
}

export const hikCentralWebSocket = HikCentralWebSocket.getInstance();