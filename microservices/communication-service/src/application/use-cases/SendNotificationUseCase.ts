import { Notification, NotificationChannel, NotificationPriority, NotificationStatus } from '../../domain/entities/Notification';
import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { ITemplateRepository } from '../../domain/repositories/ITemplateRepository';
import { IContactRepository } from '../../domain/repositories/IContactRepository';
import { INotificationService } from '../interfaces/INotificationService';
import { IQueueService } from '../interfaces/IQueueService';
import { ITemplateEngine } from '../interfaces/ITemplateEngine';
import { Logger } from '../interfaces/ILogger';
import { v4 as uuidv4 } from 'uuid';

export interface SendNotificationInput {
  channel: NotificationChannel;
  recipientId?: string;
  recipientAddress?: string;
  recipientName?: string;
  templateId?: string;
  content?: {
    subject?: string;
    body: string;
    htmlBody?: string;
  };
  variables?: Record<string, any>;
  priority?: NotificationPriority;
  scheduledAt?: Date;
  campaignId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SendNotificationOutput {
  notificationId: string;
  status: NotificationStatus;
  message?: string;
}

export class SendNotificationUseCase {
  constructor(
    private notificationRepository: INotificationRepository,
    private templateRepository: ITemplateRepository,
    private contactRepository: IContactRepository,
    private notificationService: INotificationService,
    private queueService: IQueueService,
    private templateEngine: ITemplateEngine,
    private logger: Logger
  ) {}

  async execute(input: SendNotificationInput): Promise<SendNotificationOutput> {
    try {
      // Validate input
      this.validateInput(input);

      // Get recipient details
      const recipient = await this.getRecipient(input);
      if (!recipient) {
        throw new Error('Recipient not found or invalid');
      }

      // Check if recipient can receive notifications
      const canReceive = recipient.canReceiveNotification(input.channel);
      if (!canReceive.allowed) {
        throw new Error(`Cannot send notification: ${canReceive.reason}`);
      }

      // Prepare content
      const content = await this.prepareContent(input, recipient.preferences.language);

      // Create notification entity
      const notification = new Notification({
        id: uuidv4(),
        channel: input.channel,
        recipientId: recipient.id,
        recipientAddress: recipient.getChannel(input.channel)?.address || input.recipientAddress!,
        recipientName: recipient.getFullName() || input.recipientName,
        content,
        priority: input.priority || NotificationPriority.MEDIUM,
        status: NotificationStatus.PENDING,
        metadata: {
          templateId: input.templateId,
          campaignId: input.campaignId,
          scheduledAt: input.scheduledAt,
          maxRetries: this.getMaxRetries(input.priority),
          ...input.metadata
        },
        tags: input.tags
      });

      // Save notification
      const savedNotification = await this.notificationRepository.create(notification);

      // Queue or send immediately
      if (notification.isScheduled()) {
        // Schedule for later
        await this.queueService.scheduleNotification(savedNotification, notification.metadata.scheduledAt!);
        this.logger.info('Notification scheduled', { 
          notificationId: savedNotification.id,
          scheduledAt: notification.metadata.scheduledAt 
        });
      } else if (this.shouldSendImmediately(input.priority)) {
        // Send immediately for urgent notifications
        await this.sendNotification(savedNotification);
      } else {
        // Queue for processing
        await this.queueService.queueNotification(savedNotification);
        savedNotification.status = NotificationStatus.QUEUED;
        await this.notificationRepository.update(savedNotification.id, { 
          status: NotificationStatus.QUEUED 
        });
      }

      // Update contact activity
      await this.contactRepository.update(recipient.id, {
        metadata: {
          ...recipient.metadata,
          lastActivityAt: new Date()
        }
      });

      return {
        notificationId: savedNotification.id,
        status: savedNotification.status,
        message: notification.isScheduled() 
          ? `Notification scheduled for ${notification.metadata.scheduledAt}`
          : 'Notification queued for delivery'
      };

    } catch (error) {
      this.logger.error('Failed to send notification', { error, input });
      throw error;
    }
  }

  private validateInput(input: SendNotificationInput): void {
    if (!input.channel) {
      throw new Error('Channel is required');
    }

    if (!input.recipientId && !input.recipientAddress) {
      throw new Error('Either recipientId or recipientAddress is required');
    }

    if (!input.templateId && !input.content) {
      throw new Error('Either templateId or content is required');
    }

    if (input.content && !input.content.body) {
      throw new Error('Content body is required');
    }
  }

  private async getRecipient(input: SendNotificationInput) {
    if (input.recipientId) {
      return await this.contactRepository.findById(input.recipientId);
    }

    if (input.recipientAddress) {
      const contact = await this.contactRepository.findByChannelAddress(
        input.channel,
        input.recipientAddress
      );

      if (contact) return contact;

      // Create a temporary contact for one-off notifications
      return {
        id: uuidv4(),
        channels: [{
          channel: input.channel,
          address: input.recipientAddress,
          verified: true,
          status: 'active' as const,
          preferences: { enabled: true }
        }],
        preferences: {},
        status: 'active' as const,
        metadata: {},
        getFullName: () => input.recipientName || '',
        getChannel: (channel: NotificationChannel) => 
          channel === input.channel ? {
            channel: input.channel,
            address: input.recipientAddress!,
            verified: true,
            status: 'active' as const
          } : undefined,
        canReceiveNotification: () => ({ allowed: true })
      };
    }

    return null;
  }

  private async prepareContent(
    input: SendNotificationInput,
    locale?: string
  ): Promise<Notification['content']> {
    if (input.content) {
      return {
        ...input.content,
        variables: input.variables,
        locale: locale || 'en'
      };
    }

    if (input.templateId) {
      const template = await this.templateRepository.findById(input.templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      if (template.channel !== input.channel) {
        throw new Error('Template channel does not match notification channel');
      }

      const templateContent = template.getContent(locale);
      if (!templateContent) {
        throw new Error('Template content not found for locale');
      }

      // Validate variables
      const validation = template.validateVariables(input.variables || {});
      if (!validation.valid) {
        throw new Error(`Template variable validation failed: ${validation.errors.join(', ')}`);
      }

      // Render template
      const rendered = await this.templateEngine.render(templateContent, input.variables || {});

      // Update template usage
      await this.templateRepository.incrementUsage(template.id);

      return {
        subject: rendered.subject,
        body: rendered.body,
        htmlBody: rendered.htmlBody,
        variables: input.variables,
        locale: templateContent.locale
      };
    }

    throw new Error('No content or template provided');
  }

  private async sendNotification(notification: Notification): Promise<void> {
    try {
      notification.status = NotificationStatus.SENDING;
      await this.notificationRepository.update(notification.id, { 
        status: NotificationStatus.SENDING 
      });

      const result = await this.notificationService.send(notification);

      if (result.success) {
        notification.markAsSent(result.messageId!, result.providerResponse);
      } else {
        notification.markAsFailed(result.error || 'Unknown error', result.errorCode);
      }

      await this.notificationRepository.update(notification.id, notification);

    } catch (error: any) {
      notification.markAsFailed(error.message || 'Send failed');
      await this.notificationRepository.update(notification.id, notification);
      throw error;
    }
  }

  private shouldSendImmediately(priority?: NotificationPriority): boolean {
    return priority === NotificationPriority.URGENT;
  }

  private getMaxRetries(priority?: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 5;
      case NotificationPriority.HIGH:
        return 3;
      case NotificationPriority.MEDIUM:
        return 2;
      default:
        return 1;
    }
  }
}