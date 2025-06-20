// Event subscriber for monitoring service

import {
  RabbitMQClient,
  Logger,
  AccessEventType,
  AccessGrantedEvent,
  AccessDeniedEvent,
  DoorForcedEvent,
  DoorHeldOpenEvent,
} from '@forten/shared';
import { AlertManagementUseCase } from '../../application/use-cases/AlertManagementUseCase';
import { IEventRepository } from '../../domain/repositories/IEventRepository';
import { ICameraRepository } from '../../domain/repositories/ICameraRepository';

export class MonitoringEventSubscriber {
  private rabbitmq: RabbitMQClient;
  private logger: Logger;
  private alertUseCase: AlertManagementUseCase;
  private eventRepository: IEventRepository;
  private cameraRepository: ICameraRepository;

  constructor(
    rabbitmq: RabbitMQClient,
    logger: Logger,
    alertUseCase: AlertManagementUseCase,
    eventRepository: IEventRepository,
    cameraRepository: ICameraRepository
  ) {
    this.rabbitmq = rabbitmq;
    this.logger = logger;
    this.alertUseCase = alertUseCase;
    this.eventRepository = eventRepository;
    this.cameraRepository = cameraRepository;
  }

  // Subscribe to all relevant events
  async subscribeToEvents(): Promise<void> {
    // Subscribe to access granted events
    await this.rabbitmq.subscribe({
      eventType: AccessEventType.ACCESS_GRANTED as any,
      handler: this.handleAccessGranted.bind(this),
      queue: 'monitoring-service.access.granted',
      retries: 3,
      retryDelay: 1000,
    });

    // Subscribe to access denied events
    await this.rabbitmq.subscribe({
      eventType: AccessEventType.ACCESS_DENIED as any,
      handler: this.handleAccessDenied.bind(this),
      queue: 'monitoring-service.access.denied',
      retries: 3,
      retryDelay: 1000,
    });

    // Subscribe to door forced events
    await this.rabbitmq.subscribe({
      eventType: AccessEventType.DOOR_FORCED as any,
      handler: this.handleDoorForced.bind(this),
      queue: 'monitoring-service.door.forced',
      retries: 3,
      retryDelay: 1000,
    });

    // Subscribe to door held open events
    await this.rabbitmq.subscribe({
      eventType: AccessEventType.DOOR_HELD_OPEN as any,
      handler: this.handleDoorHeldOpen.bind(this),
      queue: 'monitoring-service.door.held_open',
      retries: 3,
      retryDelay: 1000,
    });

    this.logger.info('Monitoring service subscribed to access events');
  }

  // Handle access granted event
  private async handleAccessGranted(event: AccessGrantedEvent): Promise<void> {
    this.logger.info('Processing access granted event', {
      eventId: event.id,
      userId: event.data.userId,
      doorId: event.data.doorId,
    });

    try {
      // Log the event
      await this.eventRepository.create({
        id: event.id,
        type: 'access_granted',
        source: 'access-service',
        data: event.data,
        timestamp: event.timestamp,
        buildingId: event.data.buildingId,
      });

      // Trigger camera recording if configured
      await this.triggerCameraRecording(event.data.doorId, event.data.buildingId);

      this.logger.info('Access granted event processed successfully', {
        eventId: event.id,
      });
    } catch (error) {
      this.logger.error('Failed to process access granted event', error as Error, {
        eventId: event.id,
      });
      throw error;
    }
  }

  // Handle access denied event
  private async handleAccessDenied(event: AccessDeniedEvent): Promise<void> {
    this.logger.warn('Processing access denied event', {
      eventId: event.id,
      doorId: event.data.doorId,
      reason: event.data.reason,
    });

    try {
      // Log the event
      await this.eventRepository.create({
        id: event.id,
        type: 'access_denied',
        source: 'access-service',
        data: event.data,
        timestamp: event.timestamp,
        buildingId: event.data.buildingId,
      });

      // Create alert for suspicious activity
      if (await this.isSuspiciousActivity(event.data.doorId, event.data.reason)) {
        await this.alertUseCase.createAlert({
          type: 'security',
          severity: 'medium',
          source: `door-${event.data.doorId}`,
          buildingId: event.data.buildingId,
          description: `Multiple access denied attempts at door ${event.data.doorId}`,
          metadata: {
            reason: event.data.reason,
            attemptedMethod: event.data.attemptedMethod,
            userId: event.data.userId,
          },
        });
      }

      // Trigger camera recording
      await this.triggerCameraRecording(event.data.doorId, event.data.buildingId);

      this.logger.info('Access denied event processed successfully', {
        eventId: event.id,
      });
    } catch (error) {
      this.logger.error('Failed to process access denied event', error as Error, {
        eventId: event.id,
      });
      throw error;
    }
  }

  // Handle door forced event
  private async handleDoorForced(event: DoorForcedEvent): Promise<void> {
    this.logger.error('Processing door forced event', {
      eventId: event.id,
      doorId: event.data.doorId,
      severity: event.data.severity,
    });

    try {
      // Log the event
      await this.eventRepository.create({
        id: event.id,
        type: 'door_forced',
        source: 'access-service',
        data: event.data,
        timestamp: event.timestamp,
        buildingId: event.data.buildingId,
      });

      // Create high priority alert
      await this.alertUseCase.createAlert({
        type: 'security',
        severity: event.data.severity,
        source: `door-${event.data.doorId}`,
        buildingId: event.data.buildingId,
        description: `Door forced open at ${event.data.doorId}`,
        metadata: {
          doorId: event.data.doorId,
          timestamp: event.data.timestamp,
        },
      });

      // Trigger all cameras in the area
      await this.triggerAreaCameras(event.data.doorId, event.data.buildingId);

      this.logger.info('Door forced event processed successfully', {
        eventId: event.id,
      });
    } catch (error) {
      this.logger.error('Failed to process door forced event', error as Error, {
        eventId: event.id,
      });
      throw error;
    }
  }

  // Handle door held open event
  private async handleDoorHeldOpen(event: DoorHeldOpenEvent): Promise<void> {
    this.logger.warn('Processing door held open event', {
      eventId: event.id,
      doorId: event.data.doorId,
      duration: event.data.duration,
    });

    try {
      // Log the event
      await this.eventRepository.create({
        id: event.id,
        type: 'door_held_open',
        source: 'access-service',
        data: event.data,
        timestamp: event.timestamp,
        buildingId: event.data.buildingId,
      });

      // Create alert if duration exceeds threshold significantly
      if (event.data.duration > event.data.threshold * 2) {
        await this.alertUseCase.createAlert({
          type: 'security',
          severity: 'low',
          source: `door-${event.data.doorId}`,
          buildingId: event.data.buildingId,
          description: `Door held open for ${event.data.duration} seconds (threshold: ${event.data.threshold}s)`,
          metadata: {
            doorId: event.data.doorId,
            duration: event.data.duration,
            threshold: event.data.threshold,
          },
        });
      }

      this.logger.info('Door held open event processed successfully', {
        eventId: event.id,
      });
    } catch (error) {
      this.logger.error('Failed to process door held open event', error as Error, {
        eventId: event.id,
      });
      throw error;
    }
  }

  // Check if activity is suspicious
  private async isSuspiciousActivity(doorId: string, reason: string): Promise<boolean> {
    // Check recent failed attempts
    const recentEvents = await this.eventRepository.findByDoorId(doorId, {
      type: 'access_denied',
      since: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
    });

    return recentEvents.length >= 3;
  }

  // Trigger camera recording
  private async triggerCameraRecording(doorId: string, buildingId: string): Promise<void> {
    try {
      const cameras = await this.cameraRepository.findByDoorId(doorId);
      
      for (const camera of cameras) {
        if (camera.status === 'online') {
          // Trigger recording through camera service
          this.logger.debug('Triggering camera recording', {
            cameraId: camera.id,
            doorId,
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to trigger camera recording', error as Error);
    }
  }

  // Trigger all cameras in an area
  private async triggerAreaCameras(doorId: string, buildingId: string): Promise<void> {
    try {
      const cameras = await this.cameraRepository.findByBuildingId(buildingId);
      
      for (const camera of cameras) {
        if (camera.status === 'online') {
          // Trigger recording through camera service
          this.logger.debug('Triggering area camera recording', {
            cameraId: camera.id,
            buildingId,
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to trigger area cameras', error as Error);
    }
  }
}