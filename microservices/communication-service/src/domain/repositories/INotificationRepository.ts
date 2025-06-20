import { Notification, NotificationChannel, NotificationStatus } from '../entities/Notification';

export interface NotificationFilter {
  ids?: string[];
  recipientId?: string;
  recipientAddress?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus | NotificationStatus[];
  campaignId?: string;
  templateId?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  scheduledAfter?: Date;
  scheduledBefore?: Date;
}

export interface NotificationSort {
  field: 'createdAt' | 'updatedAt' | 'scheduledAt' | 'priority' | 'status';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: NotificationSort;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface INotificationRepository {
  create(notification: Notification): Promise<Notification>;
  createBatch(notifications: Notification[]): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  findByIds(ids: string[]): Promise<Notification[]>;
  findByMessageId(messageId: string): Promise<Notification | null>;
  find(filter: NotificationFilter, options?: PaginationOptions): Promise<PaginatedResult<Notification>>;
  update(id: string, notification: Partial<Notification>): Promise<Notification | null>;
  updateBatch(updates: { id: string; data: Partial<Notification> }[]): Promise<void>;
  delete(id: string): Promise<boolean>;
  deleteBatch(ids: string[]): Promise<number>;
  
  // Queue-specific methods
  findPendingNotifications(limit: number): Promise<Notification[]>;
  findScheduledNotifications(before: Date, limit: number): Promise<Notification[]>;
  findFailedForRetry(limit: number): Promise<Notification[]>;
  
  // Analytics methods
  countByStatus(filter: NotificationFilter): Promise<Record<NotificationStatus, number>>;
  getDeliveryStats(startDate: Date, endDate: Date, channel?: NotificationChannel): Promise<{
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
    avgDeliveryTime: number;
  }>;
}