import { HikCentralClient } from './HikCentralClient';
import { CacheService } from '../../cache/CacheService';
import { Logger } from '../../logging/Logger';
import { EventEmitter } from 'events';
import {
  HikDevice,
  HikStream,
  HikRecording,
  TimeRange,
  HikEvent,
  HikAlarm,
  MotionCallback,
  HikCentralConfig
} from './types';

export interface Device extends HikDevice {
  buildingId?: string;
  location?: string;
  tags?: string[];
}

export interface Stream extends HikStream {
  deviceName?: string;
  location?: string;
}

export interface Recording extends HikRecording {
  deviceName?: string;
  location?: string;
}

export class HikCentralService extends EventEmitter {
  private readonly logger: Logger;
  private readonly client: HikCentralClient;
  private deviceCache: Map<string, Device> = new Map();
  private streamCache: Map<string, { stream: Stream; expires: Date }> = new Map();
  private connected: boolean = false;
  
  constructor(
    config: HikCentralConfig,
    private readonly cache: CacheService
  ) {
    super();
    this.logger = new Logger('HikCentralService');
    this.client = new HikCentralClient(config);
    
    this.setupEventHandlers();
  }

  /**
   * Connect to HikCentral
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
      
      // Load devices into cache
      await this.refreshDeviceCache();
      
      this.emit('connected');
      this.logger.info('HikCentral service connected');
    } catch (error) {
      this.connected = false;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from HikCentral
   */
  async disconnect(): Promise<void> {
    await this.client.disconnect();
    this.connected = false;
    this.deviceCache.clear();
    this.streamCache.clear();
    
    this.emit('disconnected');
    this.logger.info('HikCentral service disconnected');
  }

  /**
   * Get all devices with caching
   */
  async getDevices(): Promise<Device[]> {
    const cached = await this.cache.buildings.getBuildingList({ type: 'cameras' });
    if (cached) {
      return cached;
    }
    
    const devices = await this.client.getDevices();
    const enrichedDevices = devices.map(device => this.enrichDevice(device));
    
    await this.cache.buildings.setBuildingList({ type: 'cameras' }, enrichedDevices);
    
    return enrichedDevices;
  }

  /**
   * Get device by ID
   */
  async getDevice(deviceId: string): Promise<Device | null> {
    // Check local cache first
    if (this.deviceCache.has(deviceId)) {
      return this.deviceCache.get(deviceId)!;
    }
    
    try {
      const device = await this.client.getDevice(deviceId);
      const enrichedDevice = this.enrichDevice(device);
      
      this.deviceCache.set(deviceId, enrichedDevice);
      
      return enrichedDevice;
    } catch (error) {
      this.logger.error('Failed to get device', error, { deviceId });
      return null;
    }
  }

  /**
   * Get devices by building
   */
  async getDevicesByBuilding(buildingId: string): Promise<Device[]> {
    const allDevices = await this.getDevices();
    return allDevices.filter(device => device.buildingId === buildingId);
  }

  /**
   * Get live stream with caching
   */
  async getLiveStream(deviceId: string, channelId: number = 1): Promise<Stream> {
    const cacheKey = `${deviceId}:${channelId}`;
    
    // Check stream cache
    const cached = this.streamCache.get(cacheKey);
    if (cached && cached.expires > new Date()) {
      return cached.stream;
    }
    
    const device = await this.getDevice(deviceId);
    const hikStream = await this.client.getLiveStream(deviceId, channelId);
    
    const stream: Stream = {
      ...hikStream,
      deviceName: device?.name,
      location: device?.location
    };
    
    // Cache stream URL for 5 minutes
    this.streamCache.set(cacheKey, {
      stream,
      expires: new Date(Date.now() + 5 * 60 * 1000)
    });
    
    return stream;
  }

  /**
   * Get HLS stream for web playback
   */
  async getWebStream(deviceId: string, channelId: number = 1): Promise<Stream> {
    const device = await this.getDevice(deviceId);
    const hikStream = await this.client.getHLSStream(deviceId, channelId);
    
    return {
      ...hikStream,
      deviceName: device?.name,
      location: device?.location
    };
  }

  /**
   * Get recordings with enriched data
   */
  async getRecording(
    deviceId: string,
    timeRange: TimeRange,
    channelId?: number
  ): Promise<Recording[]> {
    const device = await this.getDevice(deviceId);
    const recordings = await this.client.getRecordings(deviceId, timeRange, channelId);
    
    return recordings.map(recording => ({
      ...recording,
      deviceName: device?.name,
      location: device?.location
    }));
  }

  /**
   * Take snapshot and return as base64
   */
  async takeSnapshot(deviceId: string, channelId: number = 1): Promise<string> {
    const buffer = await this.client.takeSnapshot(deviceId, channelId);
    return buffer.toString('base64');
  }

  /**
   * Control PTZ camera
   */
  async controlPTZ(
    deviceId: string,
    channelId: number,
    command: 'up' | 'down' | 'left' | 'right' | 'zoom_in' | 'zoom_out' | 'stop',
    speed?: number
  ): Promise<void> {
    await this.client.controlPTZ(deviceId, channelId, command, speed);
  }

  /**
   * Enable motion detection with building context
   */
  async enableMotionDetection(
    deviceId: string,
    channelId: number,
    buildingId: string,
    config?: any
  ): Promise<void> {
    await this.client.enableMotionDetection(deviceId, channelId, config);
    
    // Update device metadata
    const device = await this.getDevice(deviceId);
    if (device) {
      device.metadata = {
        ...device.metadata,
        motionDetection: {
          enabled: true,
          buildingId,
          channelId,
          config
        }
      };
      this.deviceCache.set(deviceId, device);
    }
  }

  /**
   * Subscribe to motion detection with enriched events
   */
  detectMotion(deviceId: string, callback: MotionCallback): void {
    const enrichedCallback = async (event: HikEvent) => {
      const device = await this.getDevice(event.deviceId);
      
      const enrichedEvent = {
        ...event,
        deviceName: device?.name,
        location: device?.location,
        buildingId: device?.buildingId
      };
      
      callback(enrichedEvent);
      
      // Store event
      await this.storeEvent(enrichedEvent);
    };
    
    this.client.detectMotion(deviceId, enrichedCallback);
  }

  /**
   * Get device events with caching
   */
  async getEvents(
    deviceId: string,
    timeRange: TimeRange,
    eventTypes?: string[]
  ): Promise<HikEvent[]> {
    const cacheKey = `events:${deviceId}:${timeRange.start.toISOString()}:${timeRange.end.toISOString()}`;
    
    const cached = await this.cache.events.getRecentEvents(deviceId);
    if (cached && cached.length > 0) {
      return cached.filter(event => 
        event.timestamp >= timeRange.start && 
        event.timestamp <= timeRange.end &&
        (!eventTypes || eventTypes.includes(event.type))
      );
    }
    
    const events = await this.client.getEvents(deviceId, timeRange, eventTypes);
    await this.cache.events.setRecentEvents(deviceId, events);
    
    return events;
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    connected: boolean;
    devices: {
      total: number;
      online: number;
      offline: number;
      error: number;
    };
    alarms: {
      active: number;
      acknowledged: number;
      critical: number;
    };
  }> {
    const devices = Array.from(this.deviceCache.values());
    
    const deviceStatus = {
      total: devices.length,
      online: devices.filter(d => d.status === 'online').length,
      offline: devices.filter(d => d.status === 'offline').length,
      error: devices.filter(d => d.status === 'error').length
    };
    
    return {
      connected: this.connected,
      devices: deviceStatus,
      alarms: {
        active: 0, // Would need to track active alarms
        acknowledged: 0,
        critical: 0
      }
    };
  }

  /**
   * Batch get streams for multiple devices
   */
  async getMultipleStreams(
    deviceIds: string[],
    streamType: 'live' | 'web' = 'web'
  ): Promise<Map<string, Stream>> {
    const streams = new Map<string, Stream>();
    
    await Promise.all(
      deviceIds.map(async (deviceId) => {
        try {
          const stream = streamType === 'live' 
            ? await this.getLiveStream(deviceId)
            : await this.getWebStream(deviceId);
          
          streams.set(deviceId, stream);
        } catch (error) {
          this.logger.error('Failed to get stream', error, { deviceId });
        }
      })
    );
    
    return streams;
  }

  // Private methods

  private setupEventHandlers(): void {
    // Handle client events
    this.client.on('event', (event: HikEvent) => {
      this.emit('deviceEvent', event);
    });
    
    this.client.on('alarm', async (alarm: HikAlarm) => {
      await this.handleAlarm(alarm);
      this.emit('alarm', alarm);
    });
    
    // Handle connection status
    this.client.onConnectionChange((status, error) => {
      this.connected = status === 'connected';
      
      if (status === 'error' && error) {
        this.logger.error('Connection error', error);
        this.emit('error', error);
      }
    });
  }

  private async refreshDeviceCache(): Promise<void> {
    try {
      const devices = await this.client.getDevices();
      
      this.deviceCache.clear();
      devices.forEach(device => {
        const enrichedDevice = this.enrichDevice(device);
        this.deviceCache.set(device.id, enrichedDevice);
      });
      
      this.logger.info(`Cached ${devices.length} devices`);
    } catch (error) {
      this.logger.error('Failed to refresh device cache', error);
    }
  }

  private enrichDevice(device: HikDevice): Device {
    // This would be enriched with building data from database
    return {
      ...device,
      buildingId: device.metadata?.buildingId,
      location: device.metadata?.location,
      tags: device.metadata?.tags || []
    };
  }

  private async storeEvent(event: HikEvent): Promise<void> {
    try {
      // Store event in database via event service
      // This would integrate with your event tracking system
      
      // Update cache
      const deviceEvents = await this.cache.events.getRecentEvents(event.deviceId) || [];
      deviceEvents.unshift(event);
      
      // Keep only last 100 events
      if (deviceEvents.length > 100) {
        deviceEvents.splice(100);
      }
      
      await this.cache.events.setRecentEvents(event.deviceId, deviceEvents);
    } catch (error) {
      this.logger.error('Failed to store event', error);
    }
  }

  private async handleAlarm(alarm: HikAlarm): Promise<void> {
    try {
      // Process alarm based on severity
      if (alarm.severity === 'critical') {
        // Send immediate notifications
        this.emit('criticalAlarm', alarm);
      }
      
      // Store alarm in database
      // Update device status if needed
      const device = await this.getDevice(alarm.deviceId);
      if (device && alarm.type === 'video_loss') {
        device.status = 'error';
        this.deviceCache.set(device.id, device);
      }
    } catch (error) {
      this.logger.error('Failed to handle alarm', error);
    }
  }
}