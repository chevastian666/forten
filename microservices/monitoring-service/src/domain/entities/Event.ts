export interface Event {
  id: string;
  buildingId: string;
  cameraId?: string;
  deviceId?: string;
  type: EventType;
  severity: EventSeverity;
  title: string;
  description: string;
  metadata: Record<string, any>;
  imageUrl?: string;
  videoUrl?: string;
  location: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum EventType {
  MOTION_DETECTED = 'motion_detected',
  CAMERA_OFFLINE = 'camera_offline',
  CAMERA_ONLINE = 'camera_online',
  RECORDING_FAILED = 'recording_failed',
  DEVICE_OFFLINE = 'device_offline',
  DEVICE_ONLINE = 'device_online',
  DOOR_OPENED = 'door_opened',
  DOOR_CLOSED = 'door_closed',
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  ALARM_TRIGGERED = 'alarm_triggered',
  SYSTEM_ERROR = 'system_error',
  MAINTENANCE_REQUIRED = 'maintenance_required',
  FACE_RECOGNIZED = 'face_recognized',
  LICENSE_PLATE_READ = 'license_plate_read'
}

export enum EventSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface CreateEventDto {
  buildingId: string;
  cameraId?: string;
  deviceId?: string;
  type: EventType;
  severity: EventSeverity;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  imageUrl?: string;
  videoUrl?: string;
  location: string;
}

export interface UpdateEventDto {
  acknowledged?: boolean;
  acknowledgedBy?: string;
  resolved?: boolean;
  resolvedBy?: string;
  metadata?: Record<string, any>;
}

export interface EventFilter {
  buildingId?: string;
  cameraId?: string;
  deviceId?: string;
  type?: EventType[];
  severity?: EventSeverity[];
  acknowledged?: boolean;
  resolved?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  location?: string;
}