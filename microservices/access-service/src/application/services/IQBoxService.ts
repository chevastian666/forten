export interface QBoxDevice {
  id: string;
  name: string;
  type: 'DOOR_CONTROLLER' | 'READER' | 'SENSOR';
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  firmwareVersion: string;
  lastSeen: Date;
  configuration: Record<string, any>;
}

export interface QBoxAccessEvent {
  deviceId: string;
  eventType: 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'DOOR_FORCED' | 'DOOR_HELD_OPEN';
  timestamp: Date;
  cardNumber?: string;
  pin?: string;
  metadata?: Record<string, any>;
}

export interface IQBoxService {
  // Device management
  getDevice(deviceId: string): Promise<QBoxDevice>;
  getDevices(): Promise<QBoxDevice[]>;
  updateDeviceConfig(deviceId: string, config: Record<string, any>): Promise<void>;
  
  // Door control
  lockDoor(deviceId: string): Promise<boolean>;
  unlockDoor(deviceId: string, durationSeconds?: number): Promise<boolean>;
  emergencyUnlock(deviceId: string): Promise<boolean>;
  getDoorStatus(deviceId: string): Promise<'LOCKED' | 'UNLOCKED' | 'UNKNOWN'>;
  
  // Access control
  grantAccess(deviceId: string, credential: string, type: 'PIN' | 'CARD'): Promise<boolean>;
  revokeAccess(deviceId: string, credential: string, type: 'PIN' | 'CARD'): Promise<boolean>;
  syncAccessList(deviceId: string, accessList: Array<{credential: string, type: string}>): Promise<void>;
  
  // Events and monitoring
  subscribeToEvents(deviceId: string, callback: (event: QBoxAccessEvent) => void): void;
  unsubscribeFromEvents(deviceId: string): void;
  getRecentEvents(deviceId: string, limit?: number): Promise<QBoxAccessEvent[]>;
  
  // Diagnostics
  pingDevice(deviceId: string): Promise<boolean>;
  restartDevice(deviceId: string): Promise<void>;
  getDeviceLogs(deviceId: string, startDate: Date, endDate: Date): Promise<string[]>;
}