import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { Notification, NotificationChannel } from '../../domain/entities/Notification';
import { INotificationService, SendResult, DeliveryStatus } from '../../application/interfaces/INotificationService';
import { Logger } from '../../application/interfaces/ILogger';

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid';
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
  from: {
    email: string;
    name: string;
  };
  replyTo?: string;
  webhookUrl?: string;
}

export class EmailService implements INotificationService {
  private transporter?: nodemailer.Transporter;

  constructor(
    private config: EmailConfig,
    private logger: Logger
  ) {
    this.initialize();
  }

  private initialize(): void {
    if (this.config.provider === 'smtp' && this.config.smtp) {
      this.transporter = nodemailer.createTransport(this.config.smtp);
    } else if (this.config.provider === 'sendgrid' && this.config.sendgrid) {
      sgMail.setApiKey(this.config.sendgrid.apiKey);
    }
  }

  async send(notification: Notification): Promise<SendResult> {
    if (notification.channel !== NotificationChannel.EMAIL) {
      return {
        success: false,
        error: `Unsupported channel for email service: ${notification.channel}`
      };
    }

    try {
      if (this.config.provider === 'smtp') {
        return await this.sendSMTP(notification);
      } else if (this.config.provider === 'sendgrid') {
        return await this.sendSendGrid(notification);
      } else {
        throw new Error(`Unsupported email provider: ${this.config.provider}`);
      }
    } catch (error: any) {
      this.logger.error('Email send failed', { 
        error: error.message,
        notificationId: notification.id,
        provider: this.config.provider 
      });

      return {
        success: false,
        error: error.message,
        errorCode: error.code
      };
    }
  }

  private async sendSMTP(notification: Notification): Promise<SendResult> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: notification.senderAddress 
        ? `${notification.senderName || ''} <${notification.senderAddress}>`.trim()
        : `${this.config.from.name} <${this.config.from.email}>`,
      to: notification.recipientName 
        ? `${notification.recipientName} <${notification.recipientAddress}>` 
        : notification.recipientAddress,
      subject: notification.content.subject || 'Notification',
      text: notification.content.body,
      html: notification.content.htmlBody,
      replyTo: this.config.replyTo,
      headers: {
        'X-Notification-ID': notification.id,
        'X-Campaign-ID': notification.metadata.campaignId || '',
        'X-Template-ID': notification.metadata.templateId || ''
      }
    };

    // Add attachments if present
    if (notification.content.attachments && notification.content.attachments.length > 0) {
      mailOptions.attachments = notification.content.attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        path: att.path,
        contentType: att.contentType,
        encoding: att.encoding
      }));
    }

    const result = await this.transporter.sendMail(mailOptions);

    this.logger.info('Email sent via SMTP', {
      notificationId: notification.id,
      messageId: result.messageId,
      to: notification.recipientAddress
    });

    return {
      success: true,
      messageId: result.messageId,
      providerResponse: {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        response: result.response
      }
    };
  }

  private async sendSendGrid(notification: Notification): Promise<SendResult> {
    const msg: sgMail.MailDataRequired = {
      from: notification.senderAddress 
        ? { email: notification.senderAddress, name: notification.senderName }
        : this.config.from,
      to: {
        email: notification.recipientAddress,
        name: notification.recipientName
      },
      subject: notification.content.subject || 'Notification',
      text: notification.content.body,
      html: notification.content.htmlBody,
      replyTo: this.config.replyTo,
      customArgs: {
        notificationId: notification.id,
        campaignId: notification.metadata.campaignId || '',
        templateId: notification.metadata.templateId || ''
      },
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };

    // Add attachments if present
    if (notification.content.attachments && notification.content.attachments.length > 0) {
      msg.attachments = notification.content.attachments.map(att => ({
        filename: att.filename,
        content: att.content as string,
        type: att.contentType,
        disposition: 'attachment'
      }));
    }

    // Add webhook for tracking
    if (this.config.webhookUrl) {
      (msg as any).eventWebhook = {
        url: `${this.config.webhookUrl}/webhooks/sendgrid/events`,
        enabled: true
      };
    }

    const [response] = await sgMail.send(msg);

    this.logger.info('Email sent via SendGrid', {
      notificationId: notification.id,
      messageId: response.headers['x-message-id'],
      to: notification.recipientAddress
    });

    return {
      success: true,
      messageId: response.headers['x-message-id'],
      providerResponse: {
        statusCode: response.statusCode,
        headers: response.headers,
        body: response.body
      }
    };
  }

  async getStatus(messageId: string): Promise<DeliveryStatus | null> {
    // Email status tracking typically requires webhook integration
    // This method would query a status storage updated by webhooks
    this.logger.debug('Email status check requested', { messageId });
    return null;
  }

  async cancelScheduled(messageId: string): Promise<boolean> {
    // Most email providers don't support canceling scheduled emails
    return false;
  }

  // SendGrid webhook handler
  async handleSendGridWebhook(events: any[]): Promise<void> {
    for (const event of events) {
      const notificationId = event.notificationId;
      const eventType = event.event;

      this.logger.info('SendGrid webhook event received', {
        notificationId,
        event: eventType,
        messageId: event.sg_message_id
      });

      // Map SendGrid events to our status
      let status: DeliveryStatus['status'] | null = null;
      switch (eventType) {
        case 'delivered':
          status = 'delivered';
          break;
        case 'bounce':
        case 'dropped':
          status = 'bounced';
          break;
        case 'open':
          status = 'opened';
          break;
        case 'click':
          status = 'clicked';
          break;
      }

      // This would typically trigger an event or update the notification status
      // Implementation depends on your event system
    }
  }
}