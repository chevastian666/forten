import { NotificationChannel, NotificationPriority } from './Notification';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export enum CampaignType {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
  RECURRING = 'recurring',
  TRIGGERED = 'triggered'
}

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export interface CampaignSchedule {
  startDate: Date;
  endDate?: Date;
  timezone?: string;
  recurrence?: {
    frequency: RecurrenceFrequency;
    interval: number; // e.g., every 2 weeks
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
    time?: string; // HH:mm format
    count?: number; // Max number of occurrences
  };
  blackoutDates?: Date[]; // Dates to skip
}

export interface CampaignAudience {
  type: 'all' | 'segment' | 'list' | 'query';
  segmentId?: string;
  contactIds?: string[];
  query?: {
    filters: Array<{
      field: string;
      operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
      value: any;
    }>;
    logic?: 'and' | 'or';
  };
  excludeIds?: string[];
  estimatedSize?: number;
}

export interface CampaignContent {
  templateId: string;
  variables?: Record<string, any>;
  personalization?: {
    enabled: boolean;
    fallbackValues?: Record<string, any>;
  };
  abTest?: {
    enabled: boolean;
    variants: Array<{
      id: string;
      name: string;
      templateId: string;
      variables?: Record<string, any>;
      percentage: number; // 0-100
    }>;
  };
}

export interface CampaignSettings {
  priority: NotificationPriority;
  throttling?: {
    enabled: boolean;
    rateLimit: number; // Messages per interval
    interval: 'second' | 'minute' | 'hour';
  };
  retry?: {
    enabled: boolean;
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number; // in seconds
  };
  tracking?: {
    opens: boolean;
    clicks: boolean;
    conversions: boolean;
  };
  stopOnError?: boolean;
  respectQuietHours?: boolean;
  deduplication?: {
    enabled: boolean;
    window: number; // in hours
    key?: string; // Field to check for duplicates
  };
}

export interface CampaignMetrics {
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  unsubscribed: number;
  conversionCount?: number;
  conversionValue?: number;
  startedAt?: Date;
  completedAt?: Date;
  lastProcessedAt?: Date;
  avgDeliveryTime?: number; // in seconds
  cost?: number;
}

export interface CampaignMetadata {
  tags?: string[];
  category?: string;
  department?: string;
  costCenter?: string;
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
  externalId?: string;
  webhooks?: {
    onStart?: string;
    onComplete?: string;
    onError?: string;
  };
}

export class Campaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  channel: NotificationChannel;
  status: CampaignStatus;
  audience: CampaignAudience;
  content: CampaignContent;
  schedule?: CampaignSchedule;
  settings: CampaignSettings;
  metrics: CampaignMetrics;
  metadata: CampaignMetadata;
  createdBy: string;
  updatedBy?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<Campaign>) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.description = data.description;
    this.type = data.type || CampaignType.IMMEDIATE;
    this.channel = data.channel || NotificationChannel.EMAIL;
    this.status = data.status || CampaignStatus.DRAFT;
    this.audience = data.audience || { type: 'all' };
    this.content = data.content || { templateId: '' };
    this.schedule = data.schedule;
    this.settings = data.settings || { priority: NotificationPriority.MEDIUM };
    this.metrics = data.metrics || {
      totalRecipients: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      failed: 0,
      unsubscribed: 0
    };
    this.metadata = data.metadata || {};
    this.createdBy = data.createdBy || '';
    this.updatedBy = data.updatedBy;
    this.organizationId = data.organizationId || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  canStart(): { allowed: boolean; reason?: string } {
    if (this.status !== CampaignStatus.DRAFT && this.status !== CampaignStatus.SCHEDULED) {
      return { allowed: false, reason: `Campaign is already ${this.status}` };
    }

    if (!this.content.templateId) {
      return { allowed: false, reason: 'No template selected' };
    }

    if (this.audience.type === 'list' && (!this.audience.contactIds || this.audience.contactIds.length === 0)) {
      return { allowed: false, reason: 'No recipients selected' };
    }

    if (this.type === CampaignType.SCHEDULED && !this.schedule?.startDate) {
      return { allowed: false, reason: 'Schedule not configured' };
    }

    return { allowed: true };
  }

  start(): void {
    if (this.canStart().allowed) {
      this.status = CampaignStatus.RUNNING;
      this.metrics.startedAt = new Date();
      this.updatedAt = new Date();
    }
  }

  pause(): void {
    if (this.status === CampaignStatus.RUNNING) {
      this.status = CampaignStatus.PAUSED;
      this.updatedAt = new Date();
    }
  }

  resume(): void {
    if (this.status === CampaignStatus.PAUSED) {
      this.status = CampaignStatus.RUNNING;
      this.updatedAt = new Date();
    }
  }

  complete(): void {
    if (this.status === CampaignStatus.RUNNING) {
      this.status = CampaignStatus.COMPLETED;
      this.metrics.completedAt = new Date();
      this.updatedAt = new Date();
    }
  }

  cancel(): void {
    if (this.status !== CampaignStatus.COMPLETED && this.status !== CampaignStatus.CANCELLED) {
      this.status = CampaignStatus.CANCELLED;
      this.updatedAt = new Date();
    }
  }

  markAsFailed(reason?: string): void {
    this.status = CampaignStatus.FAILED;
    if (reason) {
      this.metadata.notes = `${this.metadata.notes || ''}\nFailed: ${reason}`.trim();
    }
    this.updatedAt = new Date();
  }

  updateMetrics(updates: Partial<CampaignMetrics>): void {
    this.metrics = { ...this.metrics, ...updates };
    this.metrics.lastProcessedAt = new Date();
    this.updatedAt = new Date();
  }

  incrementMetric(metric: keyof CampaignMetrics, amount: number = 1): void {
    const current = this.metrics[metric];
    if (typeof current === 'number') {
      (this.metrics[metric] as number) = current + amount;
      this.metrics.lastProcessedAt = new Date();
      this.updatedAt = new Date();
    }
  }

  getProgress(): number {
    if (this.metrics.totalRecipients === 0) return 0;
    return (this.metrics.sent / this.metrics.totalRecipients) * 100;
  }

  getDeliveryRate(): number {
    if (this.metrics.sent === 0) return 0;
    return (this.metrics.delivered / this.metrics.sent) * 100;
  }

  getOpenRate(): number {
    if (this.metrics.delivered === 0) return 0;
    return (this.metrics.opened / this.metrics.delivered) * 100;
  }

  getClickRate(): number {
    if (this.metrics.delivered === 0) return 0;
    return (this.metrics.clicked / this.metrics.delivered) * 100;
  }

  getBounceRate(): number {
    if (this.metrics.sent === 0) return 0;
    return (this.metrics.bounced / this.metrics.sent) * 100;
  }

  getNextRunDate(): Date | null {
    if (this.type !== CampaignType.RECURRING || !this.schedule?.recurrence) {
      return null;
    }

    // TODO: Implement recurrence calculation logic
    // This would calculate the next run date based on the recurrence pattern
    return null;
  }

  shouldRunNow(): boolean {
    if (this.status !== CampaignStatus.SCHEDULED && this.status !== CampaignStatus.RUNNING) {
      return false;
    }

    if (this.type === CampaignType.IMMEDIATE) {
      return this.status === CampaignStatus.RUNNING;
    }

    if (this.type === CampaignType.SCHEDULED && this.schedule) {
      const now = new Date();
      return this.schedule.startDate <= now && 
             (!this.schedule.endDate || this.schedule.endDate >= now);
    }

    // TODO: Implement logic for recurring and triggered campaigns
    return false;
  }

  clone(): Campaign {
    return new Campaign({
      ...this,
      id: '', // New ID will be assigned
      name: `${this.name} (Copy)`,
      status: CampaignStatus.DRAFT,
      metrics: {
        totalRecipients: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
        unsubscribed: 0
      },
      metadata: {
        ...this.metadata,
        approvedBy: undefined,
        approvedAt: undefined
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}