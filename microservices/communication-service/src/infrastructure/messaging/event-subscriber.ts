// Event subscriber for communication service

import {
  RabbitMQClient,
  Logger,
  EventType,
  UserCreatedEvent,
  PasswordResetRequestedEvent,
  AccessEventType,
  AccessDeniedEvent,
  DoorForcedEvent,
  AlertTriggeredEvent,
  VisitorCheckedInEvent,
} from '@forten/shared';
import { SendNotificationUseCase } from '../../application/use-cases/SendNotificationUseCase';
import { ManageTemplateUseCase } from '../../application/use-cases/ManageTemplateUseCase';

export class CommunicationEventSubscriber {
  private rabbitmq: RabbitMQClient;
  private logger: Logger;
  private notificationUseCase: SendNotificationUseCase;
  private templateUseCase: ManageTemplateUseCase;

  constructor(
    rabbitmq: RabbitMQClient,
    logger: Logger,
    notificationUseCase: SendNotificationUseCase,
    templateUseCase: ManageTemplateUseCase
  ) {
    this.rabbitmq = rabbitmq;
    this.logger = logger;
    this.notificationUseCase = notificationUseCase;
    this.templateUseCase = templateUseCase;
  }

  // Subscribe to all relevant events
  async subscribeToEvents(): Promise<void> {
    // Auth events
    await this.rabbitmq.subscribe({
      eventType: EventType.USER_CREATED,
      handler: this.handleUserCreated.bind(this),
      queue: 'communication-service.user.created',
    });

    await this.rabbitmq.subscribe({
      eventType: EventType.PASSWORD_RESET_REQUESTED,
      handler: this.handlePasswordResetRequested.bind(this),
      queue: 'communication-service.password.reset_requested',
    });

    // Access events
    await this.rabbitmq.subscribe({
      eventType: AccessEventType.ACCESS_DENIED as any,
      handler: this.handleAccessDenied.bind(this),
      queue: 'communication-service.access.denied',
    });

    await this.rabbitmq.subscribe({
      eventType: AccessEventType.DOOR_FORCED as any,
      handler: this.handleDoorForced.bind(this),
      queue: 'communication-service.door.forced',
    });

    await this.rabbitmq.subscribe({
      eventType: AccessEventType.VISITOR_CHECKED_IN as any,
      handler: this.handleVisitorCheckedIn.bind(this),
      queue: 'communication-service.visitor.checked_in',
    });

    // Monitoring events
    await this.rabbitmq.subscribe({
      eventType: AccessEventType.ALERT_TRIGGERED as any,
      handler: this.handleAlertTriggered.bind(this),
      queue: 'communication-service.alert.triggered',
    });

    this.logger.info('Communication service subscribed to events');
  }

  // Handle user created event
  private async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    this.logger.info('Processing user created event', {
      eventId: event.id,
      userId: event.data.userId,
    });

    try {
      // Send welcome email
      await this.notificationUseCase.send({
        channel: 'email',
        recipient: event.data.email,
        templateName: 'user_welcome',
        data: {
          firstName: event.data.firstName,
          lastName: event.data.lastName,
          email: event.data.email,
        },
        metadata: {
          userId: event.data.userId,
          eventId: event.id,
        },
      });

      this.logger.info('Welcome email sent', {
        eventId: event.id,
        userId: event.data.userId,
      });
    } catch (error) {
      this.logger.error('Failed to send welcome email', error as Error, {
        eventId: event.id,
        userId: event.data.userId,
      });
      throw error;
    }
  }

  // Handle password reset requested event
  private async handlePasswordResetRequested(event: PasswordResetRequestedEvent): Promise<void> {
    this.logger.info('Processing password reset requested event', {
      eventId: event.id,
      email: event.data.email,
    });

    try {
      // Send password reset email
      await this.notificationUseCase.send({
        channel: 'email',
        recipient: event.data.email,
        templateName: 'password_reset',
        data: {
          email: event.data.email,
          resetLink: `https://app.forten.com/reset-password?token=${event.data.resetToken}`,
          expiresAt: event.data.expiresAt,
        },
        metadata: {
          eventId: event.id,
        },
      });

      this.logger.info('Password reset email sent', {
        eventId: event.id,
        email: event.data.email,
      });
    } catch (error) {
      this.logger.error('Failed to send password reset email', error as Error, {
        eventId: event.id,
        email: event.data.email,
      });
      throw error;
    }
  }

  // Handle access denied event
  private async handleAccessDenied(event: AccessDeniedEvent): Promise<void> {
    this.logger.info('Processing access denied event', {
      eventId: event.id,
      doorId: event.data.doorId,
    });

    try {
      // Send notification to security team
      const securityContacts = await this.getSecurityContacts(event.data.buildingId);
      
      for (const contact of securityContacts) {
        await this.notificationUseCase.send({
          channel: 'sms',
          recipient: contact.phone,
          templateName: 'access_denied_alert',
          data: {
            doorId: event.data.doorId,
            buildingId: event.data.buildingId,
            reason: event.data.reason,
            timestamp: event.data.timestamp,
          },
          metadata: {
            eventId: event.id,
            priority: 'high',
          },
        });
      }

      this.logger.info('Access denied notifications sent', {
        eventId: event.id,
        recipientCount: securityContacts.length,
      });
    } catch (error) {
      this.logger.error('Failed to send access denied notifications', error as Error, {
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
      // Send immediate alert to all security personnel
      const securityContacts = await this.getSecurityContacts(event.data.buildingId);
      const adminContacts = await this.getAdminContacts();
      
      const allContacts = [...securityContacts, ...adminContacts];
      
      for (const contact of allContacts) {
        // Send SMS for critical alerts
        await this.notificationUseCase.send({
          channel: 'sms',
          recipient: contact.phone,
          templateName: 'door_forced_critical',
          data: {
            doorId: event.data.doorId,
            buildingId: event.data.buildingId,
            severity: event.data.severity,
            timestamp: event.data.timestamp,
          },
          metadata: {
            eventId: event.id,
            priority: 'critical',
          },
        });

        // Also send email
        await this.notificationUseCase.send({
          channel: 'email',
          recipient: contact.email,
          templateName: 'door_forced_critical',
          data: {
            doorId: event.data.doorId,
            buildingId: event.data.buildingId,
            severity: event.data.severity,
            timestamp: event.data.timestamp,
          },
          metadata: {
            eventId: event.id,
            priority: 'critical',
          },
        });
      }

      this.logger.info('Door forced notifications sent', {
        eventId: event.id,
        recipientCount: allContacts.length,
      });
    } catch (error) {
      this.logger.error('Failed to send door forced notifications', error as Error, {
        eventId: event.id,
      });
      throw error;
    }
  }

  // Handle visitor checked in event
  private async handleVisitorCheckedIn(event: VisitorCheckedInEvent): Promise<void> {
    this.logger.info('Processing visitor checked in event', {
      eventId: event.id,
      visitorId: event.data.visitorId,
      hostId: event.data.hostId,
    });

    try {
      // Get host contact information
      const host = await this.getHostContact(event.data.hostId);
      
      if (host) {
        // Send notification to host
        await this.notificationUseCase.send({
          channel: 'email',
          recipient: host.email,
          templateName: 'visitor_arrived',
          data: {
            visitorId: event.data.visitorId,
            checkInTime: event.data.checkInTime,
            purpose: event.data.purpose,
            accessAreas: event.data.accessAreas,
          },
          metadata: {
            eventId: event.id,
            visitorId: event.data.visitorId,
            hostId: event.data.hostId,
          },
        });

        // Send SMS if configured
        if (host.phone && host.preferences?.smsNotifications) {
          await this.notificationUseCase.send({
            channel: 'sms',
            recipient: host.phone,
            templateName: 'visitor_arrived_sms',
            data: {
              visitorId: event.data.visitorId,
              checkInTime: event.data.checkInTime,
            },
            metadata: {
              eventId: event.id,
              visitorId: event.data.visitorId,
              hostId: event.data.hostId,
            },
          });
        }
      }

      this.logger.info('Visitor arrival notifications sent', {
        eventId: event.id,
        hostId: event.data.hostId,
      });
    } catch (error) {
      this.logger.error('Failed to send visitor arrival notifications', error as Error, {
        eventId: event.id,
      });
      throw error;
    }
  }

  // Handle alert triggered event
  private async handleAlertTriggered(event: AlertTriggeredEvent): Promise<void> {
    this.logger.info('Processing alert triggered event', {
      eventId: event.id,
      alertId: event.data.alertId,
      severity: event.data.severity,
    });

    try {
      // Determine recipients based on alert type and severity
      const recipients = await this.getAlertRecipients(
        event.data.type,
        event.data.severity,
        event.data.buildingId
      );

      for (const recipient of recipients) {
        const channel = event.data.severity === 'critical' ? 'sms' : 'email';
        
        await this.notificationUseCase.send({
          channel,
          recipient: channel === 'sms' ? recipient.phone : recipient.email,
          templateName: `alert_${event.data.type}_${event.data.severity}`,
          data: {
            alertId: event.data.alertId,
            type: event.data.type,
            severity: event.data.severity,
            source: event.data.source,
            description: event.data.description,
            timestamp: event.data.timestamp,
          },
          metadata: {
            eventId: event.id,
            alertId: event.data.alertId,
            priority: event.data.severity,
          },
        });
      }

      this.logger.info('Alert notifications sent', {
        eventId: event.id,
        alertId: event.data.alertId,
        recipientCount: recipients.length,
      });
    } catch (error) {
      this.logger.error('Failed to send alert notifications', error as Error, {
        eventId: event.id,
        alertId: event.data.alertId,
      });
      throw error;
    }
  }

  // Helper methods to get contacts (these would typically query a database)
  private async getSecurityContacts(buildingId: string): Promise<any[]> {
    // Implementation to fetch security team contacts for a building
    return [];
  }

  private async getAdminContacts(): Promise<any[]> {
    // Implementation to fetch admin contacts
    return [];
  }

  private async getHostContact(hostId: string): Promise<any> {
    // Implementation to fetch host contact information
    return null;
  }

  private async getAlertRecipients(
    type: string,
    severity: string,
    buildingId?: string
  ): Promise<any[]> {
    // Implementation to determine alert recipients based on rules
    return [];
  }
}