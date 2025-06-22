export interface Device {
  id: string;
  buildingId: string;
  name: string;
  type: DeviceType;
  model: string;
  serialNumber: string;
  ipAddress?: string;
  port?: number;
  location: string;
  floor: number;
  status: DeviceStatus;
  health: DeviceHealth;
  configuration: Record<string, any>;
  capabilities: string[];
  qBoxId?: string;
  hikCentralId?: string;
  lastHeartbeat: Date;
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum DeviceType {
  DOOR_CONTROLLER = 'door_controller',
  ACCESS_READER = 'access_reader',
  ALARM_PANEL = 'alarm_panel',
  MOTION_SENSOR = 'motion_sensor',
  SMOKE_DETECTOR = 'smoke_detector',
  TEMPERATURE_SENSOR = 'temperature_sensor',
  ELEVATOR_CONTROLLER = 'elevator_controller',
  LIGHTING_CONTROLLER = 'lighting_controller',
  HVAC_CONTROLLER = 'hvac_controller',
  INTERCOM = 'intercom',
  BARRIER_GATE = 'barrier_gate'
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
  ERROR = 'error',
  DISABLED = 'disabled'
}

export interface DeviceHealth {
  score: number; // 0-100
  uptime: number; // percentage
  responseTime: number; // milliseconds
  errorRate: number; // percentage
  batteryLevel?: number; // percentage
  signalStrength?: number; // percentage
  temperature?: number; // celsius
  lastCheck: Date;
  issues: string[];
}

export interface CreateDeviceDto {
  buildingId: string;
  name: string;
  type: DeviceType;
  model: string;
  serialNumber: string;
  ipAddress?: string;
  port?: number;
  location: string;
  floor: number;
  configuration?: Record<string, any>;
  capabilities?: string[];
  qBoxId?: string;
  hikCentralId?: string;
}

export interface UpdateDeviceDto {
  name?: string;
  model?: string;
  ipAddress?: string;
  port?: number;
  location?: string;
  floor?: number;
  status?: DeviceStatus;
  configuration?: Record<string, any>;
  capabilities?: string[];
  lastMaintenance?: Date;
  nextMaintenance?: Date;
}

export interface DeviceFilter {
  buildingId?: string;
  type?: DeviceType[];
  status?: DeviceStatus[];
  floor?: number;
  location?: string;
  healthScoreMin?: number;
  healthScoreMax?: number;
}