export interface Alert {
  id: string;
  buildingId: string;
  eventId: string;
  recipientId: string;
  type: AlertType;
  method: AlertMethod;
  title: string;
  message: string;
  priority: AlertPriority;
  status: AlertStatus;
  scheduledAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum AlertType {
  MOTION = 'motion',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
  SECURITY = 'security',
  SYSTEM = 'system',
  EMERGENCY = 'emergency'
}

export enum AlertMethod {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
  IN_APP = 'in_app'
}

export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum AlertStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface CreateAlertDto {
  buildingId: string;
  eventId: string;
  recipientId: string;
  type: AlertType;
  method: AlertMethod;
  title: string;
  message: string;
  priority: AlertPriority;
  scheduledAt?: Date;
  metadata?: Record<string, any>;
}

export interface UpdateAlertDto {
  status?: AlertStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount?: number;
  metadata?: Record<string, any>;
}

export interface AlertFilter {
  buildingId?: string;
  eventId?: string;
  recipientId?: string;
  type?: AlertType[];
  method?: AlertMethod[];
  priority?: AlertPriority[];
  status?: AlertStatus[];
  dateFrom?: Date;
  dateTo?: Date;
}