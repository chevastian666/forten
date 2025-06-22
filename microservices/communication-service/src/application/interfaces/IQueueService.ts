import { Notification } from '../../domain/entities/Notification';
import { Campaign } from '../../domain/entities/Campaign';

export interface QueueOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

export interface IQueueService {
  // Notification queue operations
  queueNotification(notification: Notification, options?: QueueOptions): Promise<void>;
  queueNotificationBatch(notifications: Notification[], options?: QueueOptions): Promise<void>;
  scheduleNotification(notification: Notification, scheduledAt: Date): Promise<void>;
  removeNotification(notificationId: string): Promise<boolean>;
  
  // Campaign queue operations
  queueCampaign(campaign: Campaign): Promise<void>;
  scheduleCampaign(campaign: Campaign, scheduledAt: Date): Promise<void>;
  removeCampaign(campaignId: string): Promise<boolean>;
  
  // Queue management
  getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>;
  pauseQueue(): Promise<void>;
  resumeQueue(): Promise<void>;
  clearQueue(): Promise<void>;
}