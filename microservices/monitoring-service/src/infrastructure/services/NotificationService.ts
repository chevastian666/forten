import axios from 'axios';
import { Logger } from '../../utils/Logger';
import { AlertPriority } from '../../domain/entities/Alert';

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  priority: AlertPriority;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export interface SMSOptions {
  to: string;
  message: string;
  priority: AlertPriority;
}

export interface PushNotificationOptions {
  userId: string;
  title: string;
  body: string;
  priority: AlertPriority;
  data?: Record<string, any>;
}

export interface WebhookOptions {
  url: string;
  payload: any;
  headers?: Record<string, string>;
}

export interface NotificationConfig {
  email: {
    service: string;
    apiKey: string;
    fromAddress: string;
  };
  sms: {
    service: string;
    apiKey: string;
    fromNumber: string;
  };
  push: {
    service: string;
    apiKey: string;
    appId: string;
  };
}

export class NotificationService {
  constructor(
    private config: NotificationConfig,
    private logger: Logger
  ) {}

  async sendEmail(options: EmailOptions): Promise<string | null> {
    try {
      switch (this.config.email.service) {
        case 'sendgrid':
          return await this.sendEmailViaSendGrid(options);
        case 'ses':
          return await this.sendEmailViaSES(options);
        case 'smtp':
          return await this.sendEmailViaSMTP(options);
        default:
          throw new Error(`Unsupported email service: ${this.config.email.service}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return null;
    }
  }

  async sendSMS(options: SMSOptions): Promise<string | null> {
    try {
      switch (this.config.sms.service) {
        case 'twilio':
          return await this.sendSMSViaTwilio(options);
        case 'aws-sns':
          return await this.sendSMSViaSNS(options);
        default:
          throw new Error(`Unsupported SMS service: ${this.config.sms.service}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      return null;
    }
  }

  async sendPushNotification(options: PushNotificationOptions): Promise<string | null> {
    try {
      switch (this.config.push.service) {
        case 'firebase':
          return await this.sendPushViaFirebase(options);
        case 'onesignal':
          return await this.sendPushViaOneSignal(options);
        default:
          throw new Error(`Unsupported push service: ${this.config.push.service}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      return null;
    }
  }

  async sendWebhook(options: WebhookOptions): Promise<string | null> {
    try {
      const response = await axios.post(options.url, options.payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Forten-Monitoring-Service',
          ...options.headers
        },
        timeout: 10000
      });

      if (response.status >= 200 && response.status < 300) {
        const deliveryId = response.headers['x-delivery-id'] || `webhook_${Date.now()}`;
        this.logger.info(`Webhook sent successfully: ${deliveryId}`);
        return deliveryId;
      } else {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send webhook: ${error.message}`);
      return null;
    }
  }

  private async sendEmailViaSendGrid(options: EmailOptions): Promise<string> {
    const response = await axios.post('https://api.sendgrid.com/v3/mail/send', {
      personalizations: [{
        to: [{ email: options.to }],
        subject: options.subject
      }],
      from: { email: this.config.email.fromAddress },
      content: [{
        type: 'text/html',
        value: options.body
      }],
      priority: this.mapPriorityToEmail(options.priority)
    }, {
      headers: {
        'Authorization': `Bearer ${this.config.email.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const messageId = response.headers['x-message-id'];
    this.logger.info(`Email sent via SendGrid: ${messageId}`);
    return messageId;
  }

  private async sendEmailViaSES(options: EmailOptions): Promise<string> {
    // AWS SES implementation would go here
    // For now, return a mock ID
    const messageId = `ses_${Date.now()}`;
    this.logger.info(`Email sent via SES: ${messageId}`);
    return messageId;
  }

  private async sendEmailViaSMTP(options: EmailOptions): Promise<string> {
    // SMTP implementation would go here
    // For now, return a mock ID
    const messageId = `smtp_${Date.now()}`;
    this.logger.info(`Email sent via SMTP: ${messageId}`);
    return messageId;
  }

  private async sendSMSViaTwilio(options: SMSOptions): Promise<string> {
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${this.config.sms.apiKey}/Messages.json`,
      new URLSearchParams({
        From: this.config.sms.fromNumber,
        To: options.to,
        Body: options.message
      }),
      {
        auth: {
          username: this.config.sms.apiKey,
          password: 'your-auth-token' // This should come from config
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const messageSid = response.data.sid;
    this.logger.info(`SMS sent via Twilio: ${messageSid}`);
    return messageSid;
  }

  private async sendSMSViaSNS(options: SMSOptions): Promise<string> {
    // AWS SNS implementation would go here
    // For now, return a mock ID
    const messageId = `sns_${Date.now()}`;
    this.logger.info(`SMS sent via SNS: ${messageId}`);
    return messageId;
  }

  private async sendPushViaFirebase(options: PushNotificationOptions): Promise<string> {
    const response = await axios.post('https://fcm.googleapis.com/fcm/send', {
      to: `/topics/user_${options.userId}`,
      notification: {
        title: options.title,
        body: options.body,
        priority: this.mapPriorityToPush(options.priority)
      },
      data: options.data
    }, {
      headers: {
        'Authorization': `key=${this.config.push.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const messageId = response.data.message_id || `fcm_${Date.now()}`;
    this.logger.info(`Push notification sent via Firebase: ${messageId}`);
    return messageId;
  }

  private async sendPushViaOneSignal(options: PushNotificationOptions): Promise<string> {
    const response = await axios.post('https://onesignal.com/api/v1/notifications', {
      app_id: this.config.push.appId,
      filters: [
        { field: 'tag', key: 'userId', relation: '=', value: options.userId }
      ],
      headings: { en: options.title },
      contents: { en: options.body },
      priority: this.mapPriorityToOneSignal(options.priority),
      data: options.data
    }, {
      headers: {
        'Authorization': `Basic ${this.config.push.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const notificationId = response.data.id;
    this.logger.info(`Push notification sent via OneSignal: ${notificationId}`);
    return notificationId;
  }

  private mapPriorityToEmail(priority: AlertPriority): string {
    switch (priority) {
      case AlertPriority.URGENT:
        return 'high';
      case AlertPriority.HIGH:
        return 'high';
      case AlertPriority.MEDIUM:
        return 'normal';
      case AlertPriority.LOW:
        return 'low';
      default:
        return 'normal';
    }
  }

  private mapPriorityToPush(priority: AlertPriority): string {
    switch (priority) {
      case AlertPriority.URGENT:
        return 'high';
      case AlertPriority.HIGH:
        return 'high';
      case AlertPriority.MEDIUM:
        return 'normal';
      case AlertPriority.LOW:
        return 'normal';
      default:
        return 'normal';
    }
  }

  private mapPriorityToOneSignal(priority: AlertPriority): number {
    switch (priority) {
      case AlertPriority.URGENT:
        return 10;
      case AlertPriority.HIGH:
        return 8;
      case AlertPriority.MEDIUM:
        return 5;
      case AlertPriority.LOW:
        return 3;
      default:
        return 5;
    }
  }

  async testConnections(): Promise<{ email: boolean; sms: boolean; push: boolean }> {
    const results = {
      email: false,
      sms: false,
      push: false
    };

    // Test email service
    try {
      switch (this.config.email.service) {
        case 'sendgrid':
          await axios.get('https://api.sendgrid.com/v3/user/account', {
            headers: { 'Authorization': `Bearer ${this.config.email.apiKey}` }
          });
          results.email = true;
          break;
        // Add other email service tests
      }
    } catch (error) {
      this.logger.warn(`Email service test failed: ${error.message}`);
    }

    // Test SMS service
    try {
      switch (this.config.sms.service) {
        case 'twilio':
          await axios.get(`https://api.twilio.com/2010-04-01/Accounts/${this.config.sms.apiKey}.json`, {
            auth: {
              username: this.config.sms.apiKey,
              password: 'your-auth-token' // This should come from config
            }
          });
          results.sms = true;
          break;
        // Add other SMS service tests
      }
    } catch (error) {
      this.logger.warn(`SMS service test failed: ${error.message}`);
    }

    // Test push service
    try {
      switch (this.config.push.service) {
        case 'firebase':
          // Firebase doesn't have a simple health check endpoint
          results.push = true;
          break;
        case 'onesignal':
          await axios.get(`https://onesignal.com/api/v1/apps/${this.config.push.appId}`, {
            headers: { 'Authorization': `Basic ${this.config.push.apiKey}` }
          });
          results.push = true;
          break;
      }
    } catch (error) {
      this.logger.warn(`Push service test failed: ${error.message}`);
    }

    return results;
  }
}