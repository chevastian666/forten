// Event publisher for access service

import {
  RabbitMQClient,
  EventBuilder,
  Logger,
  AccessEventType,
  AccessGrantedEvent,
  AccessDeniedEvent,
  DoorOpenedEvent,
  DoorForcedEvent,
  DoorHeldOpenEvent,
  VisitorCheckedInEvent,
} from '@forten/shared';

export class AccessEventPublisher {
  private rabbitmq: RabbitMQClient;
  private logger: Logger;
  private serviceName = 'access-service';

  constructor(rabbitmq: RabbitMQClient, logger: Logger) {
    this.rabbitmq = rabbitmq;
    this.logger = logger;
  }

  // Publish access granted event
  async publishAccessGranted(data: {
    userId: string;
    doorId: string;
    buildingId: string;
    accessMethod: 'card' | 'pin' | 'biometric' | 'mobile' | 'remote';
    timestamp: Date;
    location?: {
      latitude: number;
      longitude: number;
    };
  }): Promise<void> {
    const event = EventBuilder.create<AccessGrantedEvent>(
      AccessEventType.ACCESS_GRANTED as any,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.info('Access granted event published', {
      eventId: event.id,
      userId: data.userId,
      doorId: data.doorId,
    });
  }

  // Publish access denied event
  async publishAccessDenied(data: {
    userId?: string;
    doorId: string;
    buildingId: string;
    reason: 'invalid_credentials' | 'no_permission' | 'expired' | 'blocked' | 'time_restriction';
    attemptedMethod: 'card' | 'pin' | 'biometric' | 'mobile' | 'remote';
    timestamp: Date;
  }): Promise<void> {
    const event = EventBuilder.create<AccessDeniedEvent>(
      AccessEventType.ACCESS_DENIED as any,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.warn('Access denied event published', {
      eventId: event.id,
      userId: data.userId,
      doorId: data.doorId,
      reason: data.reason,
    });
  }

  // Publish door opened event
  async publishDoorOpened(data: {
    doorId: string;
    buildingId: string;
    openedBy?: string;
    method: 'access_granted' | 'manual' | 'emergency' | 'scheduled';
    timestamp: Date;
  }): Promise<void> {
    const event = EventBuilder.create<DoorOpenedEvent>(
      AccessEventType.DOOR_OPENED as any,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.info('Door opened event published', {
      eventId: event.id,
      doorId: data.doorId,
      method: data.method,
    });
  }

  // Publish door forced event
  async publishDoorForced(data: {
    doorId: string;
    buildingId: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    const event = EventBuilder.create<DoorForcedEvent>(
      AccessEventType.DOOR_FORCED as any,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.error('Door forced event published', {
      eventId: event.id,
      doorId: data.doorId,
      severity: data.severity,
    });
  }

  // Publish door held open event
  async publishDoorHeldOpen(data: {
    doorId: string;
    buildingId: string;
    duration: number;
    threshold: number;
    timestamp: Date;
  }): Promise<void> {
    const event = EventBuilder.create<DoorHeldOpenEvent>(
      AccessEventType.DOOR_HELD_OPEN as any,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.warn('Door held open event published', {
      eventId: event.id,
      doorId: data.doorId,
      duration: data.duration,
    });
  }

  // Publish visitor checked in event
  async publishVisitorCheckedIn(data: {
    visitorId: string;
    buildingId: string;
    hostId: string;
    checkInTime: Date;
    expectedDuration?: number;
    purpose?: string;
    accessAreas?: string[];
  }): Promise<void> {
    const event = EventBuilder.create<VisitorCheckedInEvent>(
      AccessEventType.VISITOR_CHECKED_IN as any,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.info('Visitor checked in event published', {
      eventId: event.id,
      visitorId: data.visitorId,
      hostId: data.hostId,
    });
  }
}