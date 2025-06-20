import { Twilio } from 'twilio';
import { Notification, NotificationChannel } from '../../domain/entities/Notification';
import { INotificationService, SendResult, DeliveryStatus } from '../../application/interfaces/INotificationService';
import { Logger } from '../../application/interfaces/ILogger';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  messagingServiceSid?: string;
  whatsappFrom?: string;
  smsFrom?: string;
  webhookUrl?: string;
}

export class TwilioService implements INotificationService {
  private client: Twilio;

  constructor(
    private config: TwilioConfig,
    private logger: Logger
  ) {
    this.client = new Twilio(config.accountSid, config.authToken);
  }

  async send(notification: Notification): Promise<SendResult> {
    try {
      switch (notification.channel) {
        case NotificationChannel.SMS:
          return await this.sendSMS(notification);
        case NotificationChannel.WHATSAPP:
          return await this.sendWhatsApp(notification);
        default:
          throw new Error(`Unsupported channel for Twilio: ${notification.channel}`);
      }
    } catch (error: any) {
      this.logger.error('Twilio send failed', { 
        error: error.message,
        notificationId: notification.id,
        channel: notification.channel 
      });

      return {
        success: false,
        error: error.message,
        errorCode: error.code
      };
    }
  }

  private async sendSMS(notification: Notification): Promise<SendResult> {
    const message = await this.client.messages.create({
      body: notification.content.body,
      to: notification.recipientAddress,
      from: notification.senderAddress || this.config.smsFrom,
      messagingServiceSid: this.config.messagingServiceSid,
      statusCallback: this.config.webhookUrl ? 
        `${this.config.webhookUrl}/webhooks/twilio/status?notificationId=${notification.id}` : 
        undefined
    });

    this.logger.info('SMS sent via Twilio', {
      notificationId: notification.id,
      messageId: message.sid,
      to: notification.recipientAddress
    });

    return {
      success: true,
      messageId: message.sid,
      providerResponse: {
        sid: message.sid,
        status: message.status,
        dateCreated: message.dateCreated,
        price: message.price,
        priceUnit: message.priceUnit
      }
    };
  }

  private async sendWhatsApp(notification: Notification): Promise<SendResult> {
    const to = notification.recipientAddress.startsWith('whatsapp:') 
      ? notification.recipientAddress 
      : `whatsapp:${notification.recipientAddress}`;

    const from = this.config.whatsappFrom?.startsWith('whatsapp:')
      ? this.config.whatsappFrom
      : `whatsapp:${this.config.whatsappFrom}`;

    const messageData: any = {
      body: notification.content.body,
      to,
      from,
      statusCallback: this.config.webhookUrl ? 
        `${this.config.webhookUrl}/webhooks/twilio/status?notificationId=${notification.id}` : 
        undefined
    };

    // Add media if present in content
    if (notification.content.attachments && notification.content.attachments.length > 0) {
      messageData.mediaUrl = notification.content.attachments
        .filter(a => a.path)
        .map(a => a.path);
    }

    const message = await this.client.messages.create(messageData);

    this.logger.info('WhatsApp message sent via Twilio', {
      notificationId: notification.id,
      messageId: message.sid,
      to: notification.recipientAddress
    });

    return {
      success: true,
      messageId: message.sid,
      providerResponse: {
        sid: message.sid,
        status: message.status,
        dateCreated: message.dateCreated
      }
    };
  }

  async getStatus(messageId: string): Promise<DeliveryStatus | null> {
    try {
      const message = await this.client.messages(messageId).fetch();

      let status: DeliveryStatus['status'];
      switch (message.status) {
        case 'delivered':
          status = 'delivered';
          break;
        case 'failed':
        case 'undelivered':
          status = 'failed';
          break;
        default:
          return null; // Still in progress
      }

      return {
        messageId,
        status,
        timestamp: message.dateUpdated || message.dateCreated,
        metadata: {
          twilioStatus: message.status,
          errorCode: message.errorCode,
          errorMessage: message.errorMessage
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to get Twilio message status', { 
        error: error.message,
        messageId 
      });
      return null;
    }
  }

  async cancelScheduled(messageId: string): Promise<boolean> {
    try {
      // Twilio doesn't support canceling scheduled messages
      // Messages are sent immediately
      return false;
    } catch (error: any) {
      this.logger.error('Failed to cancel Twilio message', { 
        error: error.message,
        messageId 
      });
      return false;
    }
  }

  // Webhook handler for status updates
  async handleStatusWebhook(data: any): Promise<void> {
    const messageId = data.MessageSid || data.SmsSid;
    const status = data.MessageStatus || data.SmsStatus;

    this.logger.info('Twilio status webhook received', {
      messageId,
      status,
      errorCode: data.ErrorCode
    });

    // This would typically trigger an event or update the notification status
    // Implementation depends on your event system
  }
}