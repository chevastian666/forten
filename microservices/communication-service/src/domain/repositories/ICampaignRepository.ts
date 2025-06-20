import { Campaign, CampaignStatus, CampaignType } from '../entities/Campaign';
import { NotificationChannel } from '../entities/Notification';
import { PaginatedResult, PaginationOptions } from './INotificationRepository';

export interface CampaignFilter {
  ids?: string[];
  organizationId?: string;
  name?: string;
  type?: CampaignType | CampaignType[];
  channel?: NotificationChannel;
  status?: CampaignStatus | CampaignStatus[];
  category?: string;
  tags?: string[];
  createdBy?: string;
  scheduledAfter?: Date;
  scheduledBefore?: Date;
  searchTerm?: string;
}

export interface CampaignMetricsUpdate {
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  bounced?: number;
  failed?: number;
  unsubscribed?: number;
}

export interface ICampaignRepository {
  create(campaign: Campaign): Promise<Campaign>;
  findById(id: string): Promise<Campaign | null>;
  findByIds(ids: string[]): Promise<Campaign[]>;
  find(filter: CampaignFilter, options?: PaginationOptions): Promise<PaginatedResult<Campaign>>;
  update(id: string, campaign: Partial<Campaign>): Promise<Campaign | null>;
  delete(id: string): Promise<boolean>;
  
  // Status management
  updateStatus(id: string, status: CampaignStatus): Promise<Campaign | null>;
  bulkUpdateStatus(ids: string[], status: CampaignStatus): Promise<number>;
  
  // Metrics
  updateMetrics(id: string, metrics: CampaignMetricsUpdate): Promise<Campaign | null>;
  incrementMetric(id: string, metric: keyof CampaignMetricsUpdate, amount?: number): Promise<void>;
  
  // Scheduling
  findScheduledCampaigns(before: Date): Promise<Campaign[]>;
  findRecurringCampaigns(): Promise<Campaign[]>;
  
  // Analytics
  getCampaignPerformance(id: string): Promise<{
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    conversionRate?: number;
  }>;
  getOrganizationStats(organizationId: string, startDate: Date, endDate: Date): Promise<{
    totalCampaigns: number;
    byStatus: Record<CampaignStatus, number>;
    byChannel: Record<NotificationChannel, number>;
    totalSent: number;
    totalDelivered: number;
    avgOpenRate: number;
    avgClickRate: number;
  }>;
}