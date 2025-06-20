import { Notification } from '../../domain/entities/Notification';

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  providerResponse?: any;
}

export interface DeliveryStatus {
  messageId: string;
  status: 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface INotificationService {
  send(notification: Notification): Promise<SendResult>;
  getStatus(messageId: string): Promise<DeliveryStatus | null>;
  cancelScheduled(messageId: string): Promise<boolean>;
}