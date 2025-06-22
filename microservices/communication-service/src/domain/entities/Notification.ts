export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  PUSH = 'push'
}

export enum NotificationStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  OPENED = 'opened',
  CLICKED = 'clicked'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface NotificationMetadata {
  templateId?: string;
  campaignId?: string;
  retryCount?: number;
  maxRetries?: number;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  errorCode?: string;
  messageId?: string;
  providerResponse?: any;
  trackingId?: string;
  openedAt?: Date;
  clickedAt?: Date;
  clickedLinks?: string[];
}

export interface NotificationContent {
  subject?: string;
  body: string;
  htmlBody?: string;
  attachments?: NotificationAttachment[];
  variables?: Record<string, any>;
  locale?: string;
}

export interface NotificationAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  encoding?: string;
}

export class Notification {
  id: string;
  channel: NotificationChannel;
  recipientId: string;
  recipientAddress: string;
  recipientName?: string;
  senderId?: string;
  senderName?: string;
  senderAddress?: string;
  content: NotificationContent;
  status: NotificationStatus;
  priority: NotificationPriority;
  metadata: NotificationMetadata;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<Notification>) {
    this.id = data.id || '';
    this.channel = data.channel || NotificationChannel.EMAIL;
    this.recipientId = data.recipientId || '';
    this.recipientAddress = data.recipientAddress || '';
    this.recipientName = data.recipientName;
    this.senderId = data.senderId;
    this.senderName = data.senderName;
    this.senderAddress = data.senderAddress;
    this.content = data.content || { body: '' };
    this.status = data.status || NotificationStatus.PENDING;
    this.priority = data.priority || NotificationPriority.MEDIUM;
    this.metadata = data.metadata || {};
    this.tags = data.tags;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  markAsSent(messageId: string, providerResponse?: any): void {
    this.status = NotificationStatus.SENT;
    this.metadata.sentAt = new Date();
    this.metadata.messageId = messageId;
    this.metadata.providerResponse = providerResponse;
    this.updatedAt = new Date();
  }

  markAsDelivered(): void {
    this.status = NotificationStatus.DELIVERED;
    this.metadata.deliveredAt = new Date();
    this.updatedAt = new Date();
  }

  markAsFailed(error: string, errorCode?: string): void {
    this.status = NotificationStatus.FAILED;
    this.metadata.failedAt = new Date();
    this.metadata.errorMessage = error;
    this.metadata.errorCode = errorCode;
    this.updatedAt = new Date();
  }

  markAsOpened(): void {
    this.status = NotificationStatus.OPENED;
    this.metadata.openedAt = new Date();
    this.updatedAt = new Date();
  }

  markAsClicked(link?: string): void {
    this.status = NotificationStatus.CLICKED;
    this.metadata.clickedAt = new Date();
    if (link) {
      this.metadata.clickedLinks = this.metadata.clickedLinks || [];
      this.metadata.clickedLinks.push(link);
    }
    this.updatedAt = new Date();
  }

  incrementRetryCount(): void {
    this.metadata.retryCount = (this.metadata.retryCount || 0) + 1;
    this.updatedAt = new Date();
  }

  canRetry(): boolean {
    const retryCount = this.metadata.retryCount || 0;
    const maxRetries = this.metadata.maxRetries || 3;
    return retryCount < maxRetries && this.status === NotificationStatus.FAILED;
  }

  isScheduled(): boolean {
    return !!this.metadata.scheduledAt && this.metadata.scheduledAt > new Date();
  }

  shouldSendNow(): boolean {
    if (!this.metadata.scheduledAt) return true;
    return this.metadata.scheduledAt <= new Date();
  }
}