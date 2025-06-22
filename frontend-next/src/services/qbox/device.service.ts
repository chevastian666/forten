/**
 * Q-Box Device Service
 * Manages Q-Box device operations and communication
 */

import { QBOX_CONFIG, QBOX_COMMANDS, QBOX_RESPONSE_CODES } from './config';
import { qboxMqttService } from './mqtt.service';
import { api } from '@/lib/api';

export interface QBoxDevice {
  id: string;
  serialNumber: string;
  model: string;
  firmwareVersion: string;
  buildingId: string;
  buildingName: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  lastSeen: Date;
  ipAddress: string;
  macAddress: string;
  features: {
    camera: boolean;
    audio: boolean;
    pin: boolean;
    card: boolean;
    qr: boolean;
    facial: boolean;
  };
  config: {
    doorOpenTime: number; // seconds
    maxPinAttempts: number;
    volumeLevel: number;
    brightness: number;
    language: string;
  };
  stats: {
    uptime: number;
    totalAccess: number;
    failedAttempts: number;
    lastRestart: Date;
  };
}

export interface QBoxCommand {
  deviceId: string;
  command: keyof typeof QBOX_COMMANDS;
  params?: any;
  timeout?: number;
}

export interface QBoxResponse {
  success: boolean;
  code: number;
  message?: string;
  data?: any;
}

export interface AccessRequest {
  deviceId: string;
  userId: string;
  accessType: string;
  method: 'pin' | 'card' | 'qr' | 'facial' | 'remote';
  duration?: number; // seconds
  reason?: string;
}

class QBoxDeviceService {
  private static instance: QBoxDeviceService;
  private devices: Map<string, QBoxDevice> = new Map();
  private commandCallbacks: Map<string, (response: QBoxResponse) => void> = new Map();
  private syncTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.setupMqttListeners();
  }

  static getInstance(): QBoxDeviceService {
    if (!QBoxDeviceService.instance) {
      QBoxDeviceService.instance = new QBoxDeviceService();
    }
    return QBoxDeviceService.instance;
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    try {
      // Connect to MQTT
      await qboxMqttService.connect();
      
      // Load devices
      await this.loadDevices();
      
      // Start sync timer
      this.startSyncTimer();
      
      console.log('Q-Box device service initialized');
    } catch (error) {
      console.error('Failed to initialize Q-Box service:', error);
      throw error;
    }
  }

  /**
   * Setup MQTT listeners
   */
  private setupMqttListeners(): void {
    // Device events
    qboxMqttService.on('deviceStatus', (status) => {
      this.updateDeviceStatus(status.deviceId, status);
    });

    qboxMqttService.on('deviceEvent', (event) => {
      this.handleDeviceEvent(event);
    });

    // Command responses
    qboxMqttService.on('message', (message) => {
      if (message.topic.includes('/response')) {
        this.handleCommandResponse(message);
      }
    });

    // Connection events
    qboxMqttService.on('connected', () => {
      console.log('Q-Box MQTT connected');
      this.subscribeToDevices();
    });

    qboxMqttService.on('disconnected', () => {
      console.log('Q-Box MQTT disconnected');
    });
  }

  /**
   * Load devices from API
   */
  async loadDevices(): Promise<void> {
    try {
      const response = await api.get(QBOX_CONFIG.ENDPOINTS.DEVICES_LIST);
      const devices = response.data;
      
      this.devices.clear();
      devices.forEach((device: QBoxDevice) => {
        this.devices.set(device.id, device);
      });
      
      console.log(`Loaded ${devices.length} Q-Box devices`);
    } catch (error) {
      console.error('Failed to load devices:', error);
      throw error;
    }
  }

  /**
   * Get all devices
   */
  getDevices(): QBoxDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId: string): QBoxDevice | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * Get devices by building
   */
  getDevicesByBuilding(buildingId: string): QBoxDevice[] {
    return this.getDevices().filter(device => device.buildingId === buildingId);
  }

  /**
   * Register new device
   */
  async registerDevice(params: {
    serialNumber: string;
    model: string;
    buildingId: string;
    location: string;
  }): Promise<QBoxDevice> {
    try {
      const response = await api.post(QBOX_CONFIG.ENDPOINTS.DEVICE_REGISTER, params);
      const device = response.data;
      
      this.devices.set(device.id, device);
      this.subscribeToDevice(device.id);
      
      return device;
    } catch (error) {
      console.error('Failed to register device:', error);
      throw error;
    }
  }

  /**
   * Update device configuration
   */
  async updateDeviceConfig(deviceId: string, config: Partial<QBoxDevice['config']>): Promise<void> {
    try {
      // Update via API
      await api.put(
        QBOX_CONFIG.ENDPOINTS.DEVICE_CONFIG.replace(':deviceId', deviceId),
        config
      );
      
      // Send command to device
      await this.sendCommand({
        deviceId,
        command: 'UPDATE_CONFIG',
        params: config
      });
      
      // Update local cache
      const device = this.devices.get(deviceId);
      if (device) {
        device.config = { ...device.config, ...config };
        this.devices.set(deviceId, device);
      }
    } catch (error) {
      console.error('Failed to update device config:', error);
      throw error;
    }
  }

  /**
   * Send command to device
   */
  async sendCommand(command: QBoxCommand): Promise<QBoxResponse> {
    const { deviceId, command: cmd, params, timeout = QBOX_CONFIG.DEVICE.COMMAND_TIMEOUT } = command;
    
    // Check if device is online
    const device = this.devices.get(deviceId);
    if (!device || device.status !== 'online') {
      return {
        success: false,
        code: QBOX_RESPONSE_CODES.SERVICE_UNAVAILABLE,
        message: 'Device is offline'
      };
    }

    return new Promise((resolve) => {
      const requestId = this.generateRequestId();
      
      // Set timeout
      const timer = setTimeout(() => {
        this.commandCallbacks.delete(requestId);
        resolve({
          success: false,
          code: QBOX_RESPONSE_CODES.TIMEOUT,
          message: 'Command timeout'
        });
      }, timeout);

      // Store callback
      this.commandCallbacks.set(requestId, (response) => {
        clearTimeout(timer);
        this.commandCallbacks.delete(requestId);
        resolve(response);
      });

      // Send command via MQTT
      qboxMqttService.sendCommand(deviceId, cmd, {
        ...params,
        requestId
      });
    });
  }

  /**
   * Grant access
   */
  async grantAccess(request: AccessRequest): Promise<QBoxResponse> {
    try {
      // Log access request
      await api.post(QBOX_CONFIG.ENDPOINTS.ACCESS_GRANT, request);
      
      // Send command to device
      const response = await this.sendCommand({
        deviceId: request.deviceId,
        command: 'OPEN_DOOR',
        params: {
          userId: request.userId,
          method: request.method,
          duration: request.duration || 5,
          reason: request.reason
        }
      });

      return response;
    } catch (error) {
      console.error('Failed to grant access:', error);
      return {
        success: false,
        code: QBOX_RESPONSE_CODES.DEVICE_ERROR,
        message: 'Failed to grant access'
      };
    }
  }

  /**
   * Open door remotely
   */
  async openDoor(deviceId: string, duration: number = 5): Promise<QBoxResponse> {
    return this.sendCommand({
      deviceId,
      command: 'OPEN_DOOR',
      params: { duration }
    });
  }

  /**
   * Emergency open all doors
   */
  async emergencyOpenAll(buildingId: string): Promise<void> {
    const devices = this.getDevicesByBuilding(buildingId);
    
    const promises = devices.map(device => 
      this.sendCommand({
        deviceId: device.id,
        command: 'EMERGENCY_OPEN'
      })
    );

    await Promise.all(promises);
  }

  /**
   * Restart device
   */
  async restartDevice(deviceId: string): Promise<QBoxResponse> {
    return this.sendCommand({
      deviceId,
      command: 'RESTART'
    });
  }

  /**
   * Take snapshot from device camera
   */
  async takeSnapshot(deviceId: string): Promise<string | null> {
    const response = await this.sendCommand({
      deviceId,
      command: 'TAKE_SNAPSHOT'
    });

    if (response.success && response.data?.imageUrl) {
      return response.data.imageUrl;
    }

    return null;
  }

  /**
   * Play sound on device
   */
  async playSound(deviceId: string, soundFile: string): Promise<QBoxResponse> {
    return this.sendCommand({
      deviceId,
      command: 'PLAY_SOUND',
      params: { soundFile }
    });
  }

  /**
   * Display message on device screen
   */
  async displayMessage(deviceId: string, message: string, duration: number = 5): Promise<QBoxResponse> {
    return this.sendCommand({
      deviceId,
      command: 'DISPLAY_MESSAGE',
      params: { message, duration }
    });
  }

  /**
   * Get device logs
   */
  async getDeviceLogs(deviceId: string, limit: number = 100): Promise<any[]> {
    try {
      const response = await api.get(
        QBOX_CONFIG.ENDPOINTS.DEVICE_LOGS.replace(':deviceId', deviceId),
        { params: { limit } }
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to get device logs:', error);
      return [];
    }
  }

  /**
   * Update device status
   */
  private updateDeviceStatus(deviceId: string, status: any): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.status = status.online ? 'online' : 'offline';
      device.lastSeen = new Date();
      
      if (status.firmwareVersion) {
        device.firmwareVersion = status.firmwareVersion;
      }
      
      this.devices.set(deviceId, device);
    }
  }

  /**
   * Handle device event
   */
  private handleDeviceEvent(event: any): void {
    console.log('Device event:', event);
    // Handle specific event types as needed
  }

  /**
   * Handle command response
   */
  private handleCommandResponse(message: any): void {
    const { requestId, code, data } = message.payload;
    
    const callback = this.commandCallbacks.get(requestId);
    if (callback) {
      callback({
        success: code === QBOX_RESPONSE_CODES.SUCCESS,
        code,
        data
      });
    }
  }

  /**
   * Subscribe to all devices
   */
  private subscribeToDevices(): void {
    this.devices.forEach((device) => {
      this.subscribeToDevice(device.id);
    });
  }

  /**
   * Subscribe to device topics
   */
  private subscribeToDevice(deviceId: string): void {
    const topics = [
      `qbox/${deviceId}/status`,
      `qbox/${deviceId}/event`,
      `qbox/${deviceId}/response`,
      `qbox/${deviceId}/heartbeat`
    ];

    topics.forEach(topic => qboxMqttService.subscribe(topic));
  }

  /**
   * Start sync timer
   */
  private startSyncTimer(): void {
    this.syncTimer = setInterval(() => {
      this.syncDevices();
    }, QBOX_CONFIG.DEVICE.SYNC_INTERVAL);
  }

  /**
   * Sync devices with server
   */
  private async syncDevices(): Promise<void> {
    try {
      await this.loadDevices();
    } catch (error) {
      console.error('Device sync failed:', error);
    }
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    qboxMqttService.disconnect();
    this.devices.clear();
    this.commandCallbacks.clear();
  }
}

export const qboxDeviceService = QBoxDeviceService.getInstance();