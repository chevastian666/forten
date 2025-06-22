// Event publisher for monitoring service

import {
  RabbitMQClient,
  EventBuilder,
  Logger,
  AccessEventType,
  CameraOfflineEvent,
  AlertTriggeredEvent,
  MotionDetectedEvent,
  PersonDetectedEvent,
} from '@forten/shared';

export class MonitoringEventPublisher {
  private rabbitmq: RabbitMQClient;
  private logger: Logger;
  private serviceName = 'monitoring-service';

  constructor(rabbitmq: RabbitMQClient, logger: Logger) {
    this.rabbitmq = rabbitmq;
    this.logger = logger;
  }

  // Publish camera offline event
  async publishCameraOffline(data: {
    cameraId: string;
    buildingId: string;
    lastSeen: Date;
    reason?: string;
  }): Promise<void> {
    const event = EventBuilder.create<CameraOfflineEvent>(
      AccessEventType.CAMERA_OFFLINE as any,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.warn('Camera offline event published', {
      eventId: event.id,
      cameraId: data.cameraId,
      buildingId: data.buildingId,
    });
  }

  // Publish alert triggered event
  async publishAlertTriggered(data: {
    alertId: string;
    type: 'security' | 'safety' | 'maintenance' | 'system';
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    buildingId?: string;
    doorId?: string;
    cameraId?: string;
    description: string;
    timestamp: Date;
  }): Promise<void> {
    const event = EventBuilder.create<AlertTriggeredEvent>(
      AccessEventType.ALERT_TRIGGERED as any,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.info('Alert triggered event published', {
      eventId: event.id,
      alertId: data.alertId,
      type: data.type,
      severity: data.severity,
    });
  }

  // Publish motion detected event
  async publishMotionDetected(data: {
    cameraId: string;
    buildingId: string;
    zone?: string;
    confidence: number;
    timestamp: Date;
    snapshot?: string;
  }): Promise<void> {
    const event = EventBuilder.create<MotionDetectedEvent>(
      AccessEventType.MOTION_DETECTED as any,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.info('Motion detected event published', {
      eventId: event.id,
      cameraId: data.cameraId,
      zone: data.zone,
      confidence: data.confidence,
    });
  }

  // Publish person detected event
  async publishPersonDetected(data: {
    cameraId: string;
    buildingId: string;
    zone?: string;
    confidence: number;
    count: number;
    timestamp: Date;
    snapshot?: string;
    recognizedUserId?: string;
  }): Promise<void> {
    const event = EventBuilder.create<PersonDetectedEvent>(
      AccessEventType.PERSON_DETECTED as any,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.info('Person detected event published', {
      eventId: event.id,
      cameraId: data.cameraId,
      count: data.count,
      recognizedUserId: data.recognizedUserId,
    });
  }
}