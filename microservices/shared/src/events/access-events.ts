// Access control system specific events

import { BaseEvent, EventType } from './index';

// Extend EventType enum with access control events
export enum AccessEventType {
  // Access events
  ACCESS_GRANTED = 'access.granted',
  ACCESS_DENIED = 'access.denied',
  ACCESS_REVOKED = 'access.revoked',
  
  // Door events
  DOOR_OPENED = 'door.opened',
  DOOR_CLOSED = 'door.closed',
  DOOR_LOCKED = 'door.locked',
  DOOR_UNLOCKED = 'door.unlocked',
  DOOR_FORCED = 'door.forced',
  DOOR_HELD_OPEN = 'door.held_open',
  DOOR_OFFLINE = 'door.offline',
  DOOR_ONLINE = 'door.online',
  
  // Visitor events
  VISITOR_CHECKED_IN = 'visitor.checked_in',
  VISITOR_CHECKED_OUT = 'visitor.checked_out',
  VISITOR_ACCESS_GRANTED = 'visitor.access_granted',
  VISITOR_ACCESS_DENIED = 'visitor.access_denied',
  
  // Camera events
  CAMERA_OFFLINE = 'camera.offline',
  CAMERA_ONLINE = 'camera.online',
  CAMERA_RECORDING_STARTED = 'camera.recording_started',
  CAMERA_RECORDING_STOPPED = 'camera.recording_stopped',
  
  // Alert events
  ALERT_TRIGGERED = 'alert.triggered',
  ALERT_ACKNOWLEDGED = 'alert.acknowledged',
  ALERT_RESOLVED = 'alert.resolved',
  
  // Motion events
  MOTION_DETECTED = 'motion.detected',
  PERSON_DETECTED = 'person.detected',
  VEHICLE_DETECTED = 'vehicle.detected',
  
  // Notification events
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_FAILED = 'notification.failed',
  NOTIFICATION_DELIVERED = 'notification.delivered',
  NOTIFICATION_READ = 'notification.read',
}

// Access granted event
export interface AccessGrantedEvent extends BaseEvent {
  type: AccessEventType.ACCESS_GRANTED;
  data: {
    userId: string;
    doorId: string;
    buildingId: string;
    accessMethod: 'card' | 'pin' | 'biometric' | 'mobile' | 'remote';
    timestamp: Date;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

// Access denied event
export interface AccessDeniedEvent extends BaseEvent {
  type: AccessEventType.ACCESS_DENIED;
  data: {
    userId?: string;
    doorId: string;
    buildingId: string;
    reason: 'invalid_credentials' | 'no_permission' | 'expired' | 'blocked' | 'time_restriction';
    attemptedMethod: 'card' | 'pin' | 'biometric' | 'mobile' | 'remote';
    timestamp: Date;
  };
}

// Door opened event
export interface DoorOpenedEvent extends BaseEvent {
  type: AccessEventType.DOOR_OPENED;
  data: {
    doorId: string;
    buildingId: string;
    openedBy?: string;
    method: 'access_granted' | 'manual' | 'emergency' | 'scheduled';
    timestamp: Date;
  };
}

// Door forced event
export interface DoorForcedEvent extends BaseEvent {
  type: AccessEventType.DOOR_FORCED;
  data: {
    doorId: string;
    buildingId: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

// Door held open event
export interface DoorHeldOpenEvent extends BaseEvent {
  type: AccessEventType.DOOR_HELD_OPEN;
  data: {
    doorId: string;
    buildingId: string;
    duration: number; // seconds
    threshold: number; // configured threshold in seconds
    timestamp: Date;
  };
}

// Camera offline event
export interface CameraOfflineEvent extends BaseEvent {
  type: AccessEventType.CAMERA_OFFLINE;
  data: {
    cameraId: string;
    buildingId: string;
    lastSeen: Date;
    reason?: string;
  };
}

// Alert triggered event
export interface AlertTriggeredEvent extends BaseEvent {
  type: AccessEventType.ALERT_TRIGGERED;
  data: {
    alertId: string;
    type: 'security' | 'safety' | 'maintenance' | 'system';
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    buildingId?: string;
    doorId?: string;
    cameraId?: string;
    description: string;
    timestamp: Date;
  };
}

// Motion detected event
export interface MotionDetectedEvent extends BaseEvent {
  type: AccessEventType.MOTION_DETECTED;
  data: {
    cameraId: string;
    buildingId: string;
    zone?: string;
    confidence: number;
    timestamp: Date;
    snapshot?: string; // Base64 encoded image
  };
}

// Person detected event
export interface PersonDetectedEvent extends BaseEvent {
  type: AccessEventType.PERSON_DETECTED;
  data: {
    cameraId: string;
    buildingId: string;
    zone?: string;
    confidence: number;
    count: number;
    timestamp: Date;
    snapshot?: string;
    recognizedUserId?: string;
  };
}

// Notification sent event
export interface NotificationSentEvent extends BaseEvent {
  type: AccessEventType.NOTIFICATION_SENT;
  data: {
    notificationId: string;
    channel: 'email' | 'sms' | 'push' | 'in_app';
    recipient: string;
    subject?: string;
    message: string;
    relatedEventId?: string;
    timestamp: Date;
  };
}

// Notification failed event
export interface NotificationFailedEvent extends BaseEvent {
  type: AccessEventType.NOTIFICATION_FAILED;
  data: {
    notificationId: string;
    channel: 'email' | 'sms' | 'push' | 'in_app';
    recipient: string;
    reason: string;
    errorCode?: string;
    relatedEventId?: string;
    timestamp: Date;
  };
}

// Visitor checked in event
export interface VisitorCheckedInEvent extends BaseEvent {
  type: AccessEventType.VISITOR_CHECKED_IN;
  data: {
    visitorId: string;
    buildingId: string;
    hostId: string;
    checkInTime: Date;
    expectedDuration?: number; // minutes
    purpose?: string;
    accessAreas?: string[];
  };
}

// Type union for all access events
export type AccessControlEvent = 
  | AccessGrantedEvent
  | AccessDeniedEvent
  | DoorOpenedEvent
  | DoorForcedEvent
  | DoorHeldOpenEvent
  | CameraOfflineEvent
  | AlertTriggeredEvent
  | MotionDetectedEvent
  | PersonDetectedEvent
  | NotificationSentEvent
  | NotificationFailedEvent
  | VisitorCheckedInEvent;