import { IAlertRepository } from '../../domain/repositories/IAlertRepository';
import { IEventRepository } from '../../domain/repositories/IEventRepository';
import { Alert, CreateAlertDto, AlertStatus, AlertMethod, AlertPriority } from '../../domain/entities/Alert';
import { Event, EventType, EventSeverity } from '../../domain/entities/Event';
import { NotificationService } from '../../infrastructure/services/NotificationService';
import { WebSocketService } from '../../infrastructure/websocket/WebSocketService';
import { Logger } from '../../utils/Logger';

export class AlertManagementUseCase {
  constructor(
    private alertRepository: IAlertRepository,
    private eventRepository: IEventRepository,
    private notificationService: NotificationService,
    private webSocketService: WebSocketService,
    private logger: Logger
  ) {}

  async createAlert(alertData: CreateAlertDto): Promise<Alert> {
    try {
      const alert = await this.alertRepository.create({
        ...alertData,
        scheduledAt: alertData.scheduledAt || new Date()
      });

      // Notify via WebSocket
      this.webSocketService.emit('alert:created', {
        buildingId: alert.buildingId,
        alert
      });

      this.logger.info(`Alert created: ${alert.id}`);
      return alert;
    } catch (error) {
      this.logger.error(`Failed to create alert: ${error.message}`);
      throw error;
    }
  }

  async processEventForAlerts(event: Event): Promise<void> {
    try {
      // Determine alert priority based on event severity
      const alertPriority = this.mapEventSeverityToAlertPriority(event.severity);
      
      // Get recipients based on event type and building
      const recipients = await this.getRecipientsForEvent(event);

      // Create alerts for each recipient
      for (const recipient of recipients) {
        const alertMethods = this.getAlertMethodsForPriority(alertPriority, recipient.preferences);

        for (const method of alertMethods) {
          await this.createAlert({
            buildingId: event.buildingId,
            eventId: event.id,
            recipientId: recipient.id,
            type: this.mapEventTypeToAlertType(event.type),
            method,
            title: event.title,
            message: this.generateAlertMessage(event),
            priority: alertPriority,
            metadata: {
              eventType: event.type,
              eventSeverity: event.severity,
              location: event.location,
              timestamp: event.createdAt
            }
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process event for alerts: ${error.message}`);
    }
  }

  async sendPendingAlerts(): Promise<void> {
    try {
      const pendingAlerts = await this.alertRepository.findPending();
      
      for (const alert of pendingAlerts) {
        try {
          await this.sendAlert(alert);
        } catch (error) {
          this.logger.error(`Failed to send alert ${alert.id}: ${error.message}`);
          await this.alertRepository.markAsFailed(alert.id, error.message);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send pending alerts: ${error.message}`);
    }
  }

  async retryFailedAlerts(): Promise<void> {
    try {
      const alertsForRetry = await this.alertRepository.findForRetry();
      
      for (const alert of alertsForRetry) {
        try {
          await this.sendAlert(alert);
        } catch (error) {
          this.logger.error(`Failed to retry alert ${alert.id}: ${error.message}`);
          await this.alertRepository.incrementRetryCount(alert.id);
          
          if (alert.retryCount >= alert.maxRetries) {
            await this.alertRepository.markAsFailed(alert.id, `Max retries exceeded: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to retry failed alerts: ${error.message}`);
    }
  }

  private async sendAlert(alert: Alert): Promise<void> {
    // Update status to sending
    await this.alertRepository.update(alert.id, { status: AlertStatus.SENDING });

    let success = false;
    let deliveryId: string | undefined;

    switch (alert.method) {
      case AlertMethod.EMAIL:
        deliveryId = await this.notificationService.sendEmail({
          to: await this.getRecipientEmail(alert.recipientId),
          subject: alert.title,
          body: alert.message,
          priority: alert.priority
        });
        success = !!deliveryId;
        break;

      case AlertMethod.SMS:
        deliveryId = await this.notificationService.sendSMS({
          to: await this.getRecipientPhone(alert.recipientId),
          message: `${alert.title}: ${alert.message}`,
          priority: alert.priority
        });
        success = !!deliveryId;
        break;

      case AlertMethod.PUSH:
        deliveryId = await this.notificationService.sendPushNotification({
          userId: alert.recipientId,
          title: alert.title,
          body: alert.message,
          priority: alert.priority,
          data: alert.metadata
        });
        success = !!deliveryId;
        break;

      case AlertMethod.WEBHOOK:
        deliveryId = await this.notificationService.sendWebhook({
          url: await this.getRecipientWebhook(alert.recipientId),
          payload: {
            alert,
            event: await this.eventRepository.findById(alert.eventId)
          }
        });
        success = !!deliveryId;
        break;

      case AlertMethod.IN_APP:
        // Handle in-app notifications via WebSocket
        this.webSocketService.emitToUser(alert.recipientId, 'notification', {
          id: alert.id,
          title: alert.title,
          message: alert.message,
          priority: alert.priority,
          timestamp: new Date(),
          metadata: alert.metadata
        });
        success = true;
        break;
    }

    if (success) {
      await this.alertRepository.markAsSent(alert.id);
      this.logger.info(`Alert sent successfully: ${alert.id}`);
    } else {
      throw new Error('Failed to send alert');
    }
  }

  async markAlertAsRead(alertId: string): Promise<void> {
    try {
      await this.alertRepository.markAsRead(alertId);
      
      const alert = await this.alertRepository.findById(alertId);
      if (alert) {
        this.webSocketService.emit('alert:read', {
          buildingId: alert.buildingId,
          alertId
        });
      }
    } catch (error) {
      this.logger.error(`Failed to mark alert as read: ${error.message}`);
      throw error;
    }
  }

  async getAlertsByRecipient(recipientId: string, page = 1, limit = 20): Promise<{ alerts: Alert[]; total: number }> {
    return this.alertRepository.findByRecipientId(recipientId, page, limit);
  }

  async getAlertsByBuilding(buildingId: string, page = 1, limit = 20): Promise<{ alerts: Alert[]; total: number }> {
    return this.alertRepository.findByBuildingId(buildingId, page, limit);
  }

  private mapEventSeverityToAlertPriority(severity: EventSeverity): AlertPriority {
    switch (severity) {
      case EventSeverity.CRITICAL:
        return AlertPriority.URGENT;
      case EventSeverity.HIGH:
        return AlertPriority.HIGH;
      case EventSeverity.MEDIUM:
        return AlertPriority.MEDIUM;
      case EventSeverity.LOW:
        return AlertPriority.LOW;
      default:
        return AlertPriority.LOW;
    }
  }

  private mapEventTypeToAlertType(eventType: EventType): string {
    switch (eventType) {
      case EventType.MOTION_DETECTED:
        return 'motion';
      case EventType.CAMERA_OFFLINE:
      case EventType.DEVICE_OFFLINE:
        return 'offline';
      case EventType.MAINTENANCE_REQUIRED:
        return 'maintenance';
      case EventType.ALARM_TRIGGERED:
      case EventType.ACCESS_DENIED:
        return 'security';
      case EventType.SYSTEM_ERROR:
        return 'system';
      default:
        return 'general';
    }
  }

  private generateAlertMessage(event: Event): string {
    return `${event.description} at ${event.location} on ${event.createdAt.toLocaleString()}`;
  }

  private getAlertMethodsForPriority(priority: AlertPriority, preferences: any): AlertMethod[] {
    // This would typically be based on user preferences
    switch (priority) {
      case AlertPriority.URGENT:
        return [AlertMethod.SMS, AlertMethod.PUSH, AlertMethod.EMAIL];
      case AlertPriority.HIGH:
        return [AlertMethod.PUSH, AlertMethod.EMAIL];
      case AlertPriority.MEDIUM:
        return [AlertMethod.PUSH];
      case AlertPriority.LOW:
        return [AlertMethod.IN_APP];
      default:
        return [AlertMethod.IN_APP];
    }
  }

  private async getRecipientsForEvent(event: Event): Promise<Array<{ id: string; preferences: any }>> {
    // This would typically query a user service or database
    // For now, return mock data
    return [
      { id: 'building-manager-1', preferences: {} },
      { id: 'security-team-1', preferences: {} }
    ];
  }

  private async getRecipientEmail(recipientId: string): Promise<string> {
    // This would typically query a user service
    return `${recipientId}@example.com`;
  }

  private async getRecipientPhone(recipientId: string): Promise<string> {
    // This would typically query a user service
    return '+1234567890';
  }

  private async getRecipientWebhook(recipientId: string): Promise<string> {
    // This would typically query a user service
    return `https://api.example.com/webhooks/${recipientId}`;
  }
}