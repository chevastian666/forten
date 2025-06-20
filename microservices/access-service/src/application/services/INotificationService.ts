export interface EmailNotification {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  template?: string;
  html?: string;
  text?: string;
  data?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SMSNotification {
  to: string;
  message: string;
  senderId?: string;
}

export interface PushNotification {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
}

export interface INotificationService {
  sendEmail(notification: EmailNotification): Promise<void>;
  sendSMS(notification: SMSNotification): Promise<void>;
  sendPush(notification: PushNotification): Promise<void>;
  
  // Bulk operations
  sendBulkEmail(notifications: EmailNotification[]): Promise<void>;
  sendBulkSMS(notifications: SMSNotification[]): Promise<void>;
  
  // Template management
  registerEmailTemplate(name: string, template: string): Promise<void>;
  updateEmailTemplate(name: string, template: string): Promise<void>;
}