import { Alert, CreateAlertDto, UpdateAlertDto, AlertFilter, AlertStatus, AlertPriority } from '../entities/Alert';

export interface IAlertRepository {
  create(alert: CreateAlertDto): Promise<Alert>;
  findById(id: string): Promise<Alert | null>;
  findByEventId(eventId: string): Promise<Alert[]>;
  findByRecipientId(recipientId: string, page?: number, limit?: number): Promise<{ alerts: Alert[]; total: number }>;
  findByBuildingId(buildingId: string, page?: number, limit?: number): Promise<{ alerts: Alert[]; total: number }>;
  findByFilter(filter: AlertFilter, page?: number, limit?: number): Promise<{ alerts: Alert[]; total: number }>;
  findPending(): Promise<Alert[]>;
  findFailed(): Promise<Alert[]>;
  findForRetry(): Promise<Alert[]>;
  update(id: string, updates: UpdateAlertDto): Promise<Alert | null>;
  markAsSent(id: string): Promise<boolean>;
  markAsDelivered(id: string): Promise<boolean>;
  markAsRead(id: string): Promise<boolean>;
  markAsFailed(id: string, reason: string): Promise<boolean>;
  incrementRetryCount(id: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  getAlertStats(buildingId: string, days: number): Promise<{
    total: number;
    byStatus: Record<AlertStatus, number>;
    byPriority: Record<AlertPriority, number>;
    deliveryRate: number;
    averageDeliveryTime: number;
  }>;
  cleanup(olderThanDays: number): Promise<number>; // Returns number of deleted alerts
}