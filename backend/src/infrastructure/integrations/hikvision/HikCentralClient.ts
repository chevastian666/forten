import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import { Logger } from '../../logging/Logger';
import WebSocket from 'ws';
import {
  HikCentralConfig,
  HikCentralAuth,
  HikDevice,
  HikStream,
  HikRecording,
  HikEvent,
  HikAlarm,
  TimeRange,
  MotionCallback,
  AlarmCallback,
  ConnectionCallback
} from './types';

export class HikCentralClient extends EventEmitter {
  private readonly logger: Logger;
  private client: AxiosInstance;
  private auth?: HikCentralAuth;
  private websocket?: WebSocket;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private eventCallbacks: Map<string, Set<MotionCallback>> = new Map();
  private alarmCallbacks: Set<AlarmCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  
  constructor(private readonly config: HikCentralConfig) {
    super();
    this.logger = new Logger('HikCentralClient');
    
    this.client = axios.create({
      baseURL: `${config.ssl ? 'https' : 'http'}://${config.host}:${config.port}/api`,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    this.setupInterceptors();
  }

  /**
   * Connect to HikCentral and authenticate
   */
  async connect(): Promise<void> {
    try {
      this.logger.info('Connecting to HikCentral', { host: this.config.host });
      
      // Authenticate
      await this.authenticate();
      
      // Establish WebSocket connection for real-time events
      await this.connectWebSocket();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.notifyConnectionStatus('connected');
      this.logger.info('Successfully connected to HikCentral');
    } catch (error) {
      this.logger.error('Failed to connect to HikCentral', error);
      this.notifyConnectionStatus('error', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from HikCentral
   */
  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting from HikCentral');
    
    // Clear timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }
    
    // Clear auth
    this.auth = undefined;
    
    this.notifyConnectionStatus('disconnected');
    this.logger.info('Disconnected from HikCentral');
  }

  /**
   * Get all devices
   */
  async getDevices(): Promise<HikDevice[]> {
    try {
      const response = await this.client.get('/devices', {
        params: {
          pageSize: 1000,
          pageNo: 1
        }
      });
      
      return response.data.data.list.map(this.mapDevice);
    } catch (error) {
      this.logger.error('Failed to get devices', error);
      throw error;
    }
  }

  /**
   * Get device by ID
   */
  async getDevice(deviceId: string): Promise<HikDevice> {
    try {
      const response = await this.client.get(`/devices/${deviceId}`);
      return this.mapDevice(response.data.data);
    } catch (error) {
      this.logger.error('Failed to get device', error, { deviceId });
      throw error;
    }
  }

  /**
   * Get live stream URL
   */
  async getLiveStream(deviceId: string, channelId: number = 1): Promise<HikStream> {
    try {
      const response = await this.client.post('/streaming/live', {
        deviceId,
        channelId,
        streamType: 'main',
        protocol: 'rtsp'
      });
      
      const { url, token, expires } = response.data.data;
      
      return {
        url,
        protocol: 'rtsp',
        token,
        expires: expires ? new Date(expires) : undefined
      };
    } catch (error) {
      this.logger.error('Failed to get live stream', error, { deviceId, channelId });
      throw error;
    }
  }

  /**
   * Get HLS stream URL (for web playback)
   */
  async getHLSStream(deviceId: string, channelId: number = 1): Promise<HikStream> {
    try {
      const response = await this.client.post('/streaming/hls', {
        deviceId,
        channelId,
        streamType: 'sub' // Use sub-stream for web
      });
      
      return {
        url: response.data.data.url,
        protocol: 'hls',
        token: response.data.data.token
      };
    } catch (error) {
      this.logger.error('Failed to get HLS stream', error, { deviceId, channelId });
      throw error;
    }
  }

  /**
   * Search recordings
   */
  async getRecordings(
    deviceId: string,
    timeRange: TimeRange,
    channelId?: number
  ): Promise<HikRecording[]> {
    try {
      const response = await this.client.post('/recording/search', {
        deviceId,
        channelId: channelId || 1,
        beginTime: timeRange.start.toISOString(),
        endTime: timeRange.end.toISOString(),
        recordType: 'all'
      });
      
      return response.data.data.list.map((rec: any) => ({
        id: rec.recordId,
        deviceId: rec.deviceId,
        channelId: rec.channelId,
        startTime: new Date(rec.beginTime),
        endTime: new Date(rec.endTime),
        fileSize: rec.fileSize,
        downloadUrl: rec.downloadUrl,
        thumbnailUrl: rec.thumbnailUrl,
        events: rec.events?.map(this.mapRecordingEvent)
      }));
    } catch (error) {
      this.logger.error('Failed to search recordings', error, { deviceId, timeRange });
      throw error;
    }
  }

  /**
   * Get recording playback URL
   */
  async getRecordingPlayback(recordingId: string): Promise<HikStream> {
    try {
      const response = await this.client.post(`/recording/playback/${recordingId}`);
      
      return {
        url: response.data.data.url,
        protocol: 'rtsp',
        token: response.data.data.token
      };
    } catch (error) {
      this.logger.error('Failed to get recording playback', error, { recordingId });
      throw error;
    }
  }

  /**
   * Enable motion detection for a device
   */
  async enableMotionDetection(
    deviceId: string,
    channelId: number,
    config?: {
      sensitivity?: number;
      regions?: Array<{ x: number; y: number }>[];
    }
  ): Promise<void> {
    try {
      await this.client.put(`/devices/${deviceId}/motion`, {
        channelId,
        enabled: true,
        sensitivity: config?.sensitivity || 50,
        regions: config?.regions
      });
      
      this.logger.info('Motion detection enabled', { deviceId, channelId });
    } catch (error) {
      this.logger.error('Failed to enable motion detection', error, { deviceId });
      throw error;
    }
  }

  /**
   * Subscribe to motion events
   */
  detectMotion(deviceId: string, callback: MotionCallback): void {
    const callbacks = this.eventCallbacks.get(deviceId) || new Set();
    callbacks.add(callback);
    this.eventCallbacks.set(deviceId, callbacks);
    
    // Subscribe to device events if not already subscribed
    this.subscribeToDeviceEvents(deviceId);
  }

  /**
   * Unsubscribe from motion events
   */
  undetectMotion(deviceId: string, callback: MotionCallback): void {
    const callbacks = this.eventCallbacks.get(deviceId);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.eventCallbacks.delete(deviceId);
        this.unsubscribeFromDeviceEvents(deviceId);
      }
    }
  }

  /**
   * Subscribe to alarm events
   */
  onAlarm(callback: AlarmCallback): void {
    this.alarmCallbacks.add(callback);
  }

  /**
   * Unsubscribe from alarm events
   */
  offAlarm(callback: AlarmCallback): void {
    this.alarmCallbacks.delete(callback);
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(callback: ConnectionCallback): void {
    this.connectionCallbacks.add(callback);
  }

  /**
   * Take snapshot from camera
   */
  async takeSnapshot(deviceId: string, channelId: number = 1): Promise<Buffer> {
    try {
      const response = await this.client.get(`/devices/${deviceId}/snapshot`, {
        params: { channelId },
        responseType: 'arraybuffer'
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error('Failed to take snapshot', error, { deviceId, channelId });
      throw error;
    }
  }

  /**
   * Control PTZ (Pan-Tilt-Zoom)
   */
  async controlPTZ(
    deviceId: string,
    channelId: number,
    command: 'up' | 'down' | 'left' | 'right' | 'zoom_in' | 'zoom_out' | 'stop',
    speed: number = 5
  ): Promise<void> {
    try {
      await this.client.post(`/devices/${deviceId}/ptz`, {
        channelId,
        command,
        speed
      });
    } catch (error) {
      this.logger.error('Failed to control PTZ', error, { deviceId, command });
      throw error;
    }
  }

  /**
   * Get device events
   */
  async getEvents(
    deviceId: string,
    timeRange: TimeRange,
    eventTypes?: string[]
  ): Promise<HikEvent[]> {
    try {
      const response = await this.client.post('/events/search', {
        deviceId,
        beginTime: timeRange.start.toISOString(),
        endTime: timeRange.end.toISOString(),
        eventTypes: eventTypes || ['all']
      });
      
      return response.data.data.list.map(this.mapEvent);
    } catch (error) {
      this.logger.error('Failed to get events', error, { deviceId });
      throw error;
    }
  }

  // Private methods

  private async authenticate(): Promise<void> {
    try {
      const response = await this.client.post('/auth/login', {
        username: this.config.username,
        password: this.config.password
      });
      
      const { accessToken, refreshToken, expiresIn } = response.data.data;
      
      this.auth = {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000)
      };
      
      // Update client headers
      this.client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
      this.logger.debug('Authentication successful');
    } catch (error) {
      this.logger.error('Authentication failed', error);
      throw new Error('Failed to authenticate with HikCentral');
    }
  }

  private async refreshAuth(): Promise<void> {
    if (!this.auth?.refreshToken) {
      return this.authenticate();
    }
    
    try {
      const response = await this.client.post('/auth/refresh', {
        refreshToken: this.auth.refreshToken
      });
      
      const { accessToken, expiresIn } = response.data.data;
      
      this.auth.accessToken = accessToken;
      this.auth.expiresAt = new Date(Date.now() + expiresIn * 1000);
      
      this.client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } catch (error) {
      this.logger.error('Token refresh failed', error);
      return this.authenticate();
    }
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Check if token needs refresh
        if (this.auth && this.auth.expiresAt < new Date(Date.now() + 60000)) {
          await this.refreshAuth();
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          await this.refreshAuth();
          return this.client(originalRequest);
        }
        
        return Promise.reject(error);
      }
    );
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.config.ssl ? 'wss' : 'ws'}://${this.config.host}:${this.config.port}/ws/events`;
      
      this.websocket = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.auth?.accessToken}`
        }
      });
      
      this.websocket.on('open', () => {
        this.logger.info('WebSocket connected');
        resolve();
      });
      
      this.websocket.on('message', (data) => {
        this.handleWebSocketMessage(data.toString());
      });
      
      this.websocket.on('error', (error) => {
        this.logger.error('WebSocket error', error);
        reject(error);
      });
      
      this.websocket.on('close', () => {
        this.logger.warn('WebSocket disconnected');
        this.scheduleReconnect();
      });
    });
  }

  private handleWebSocketMessage(message: string): void {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'event':
          this.handleEvent(data.payload);
          break;
        case 'alarm':
          this.handleAlarm(data.payload);
          break;
        case 'heartbeat':
          // Heartbeat response
          break;
        default:
          this.logger.debug('Unknown WebSocket message type', { type: data.type });
      }
    } catch (error) {
      this.logger.error('Failed to parse WebSocket message', error, { message });
    }
  }

  private handleEvent(event: any): void {
    const hikEvent = this.mapEvent(event);
    
    // Notify specific device callbacks
    const callbacks = this.eventCallbacks.get(hikEvent.deviceId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(hikEvent);
        } catch (error) {
          this.logger.error('Event callback error', error);
        }
      });
    }
    
    // Emit general event
    this.emit('event', hikEvent);
  }

  private handleAlarm(alarm: any): void {
    const hikAlarm = this.mapAlarm(alarm);
    
    // Notify alarm callbacks
    this.alarmCallbacks.forEach(callback => {
      try {
        callback(hikAlarm);
      } catch (error) {
        this.logger.error('Alarm callback error', error);
      }
    });
    
    // Emit alarm event
    this.emit('alarm', hikAlarm);
  }

  private subscribeToDeviceEvents(deviceId: string): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        action: 'subscribe',
        deviceId,
        eventTypes: ['motion', 'line_crossing', 'intrusion']
      }));
    }
  }

  private unsubscribeFromDeviceEvents(deviceId: string): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        action: 'unsubscribe',
        deviceId
      }));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000); // 30 seconds
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined;
      
      try {
        await this.connectWebSocket();
        this.notifyConnectionStatus('connected');
      } catch (error) {
        this.logger.error('Reconnection failed', error);
        this.scheduleReconnect();
      }
    }, 5000); // 5 seconds
  }

  private notifyConnectionStatus(status: 'connected' | 'disconnected' | 'error', error?: Error): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(status, error);
      } catch (err) {
        this.logger.error('Connection callback error', err);
      }
    });
  }

  // Mapping functions

  private mapDevice(data: any): HikDevice {
    return {
      id: data.deviceId,
      name: data.deviceName,
      type: data.deviceType,
      model: data.deviceModel,
      serialNumber: data.serialNumber,
      ipAddress: data.ipAddress,
      status: data.online ? 'online' : 'offline',
      lastHeartbeat: new Date(data.lastHeartbeat),
      capabilities: data.capabilities || [],
      channels: data.channels?.map((ch: any) => ({
        id: ch.channelId,
        name: ch.channelName,
        enabled: ch.enabled,
        streamingCapability: {
          mainStream: {
            resolution: ch.mainStream.resolution,
            frameRate: ch.mainStream.frameRate,
            bitRate: ch.mainStream.bitRate,
            codec: ch.mainStream.codec
          },
          subStream: {
            resolution: ch.subStream.resolution,
            frameRate: ch.subStream.frameRate,
            bitRate: ch.subStream.bitRate,
            codec: ch.subStream.codec
          }
        }
      })),
      metadata: data.metadata
    };
  }

  private mapEvent(data: any): HikEvent {
    return {
      id: data.eventId,
      deviceId: data.deviceId,
      channelId: data.channelId,
      type: data.eventType,
      subType: data.eventSubType,
      timestamp: new Date(data.eventTime),
      description: data.description,
      imageUrl: data.imageUrl,
      videoClipUrl: data.videoClipUrl,
      metadata: data.metadata
    };
  }

  private mapAlarm(data: any): HikAlarm {
    return {
      id: data.alarmId,
      deviceId: data.deviceId,
      type: data.alarmType,
      severity: data.severity,
      timestamp: new Date(data.alarmTime),
      acknowledged: data.acknowledged || false,
      acknowledgedBy: data.acknowledgedBy,
      acknowledgedAt: data.acknowledgedAt ? new Date(data.acknowledgedAt) : undefined,
      resolved: data.resolved || false,
      resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
      details: data.details || {}
    };
  }

  private mapRecordingEvent(data: any): any {
    return {
      type: data.eventType,
      timestamp: new Date(data.eventTime),
      confidence: data.confidence,
      metadata: data.metadata
    };
  }
}