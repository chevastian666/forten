// Common types and interfaces for Forten CRM microservices

// User related types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES_REP = 'sales_rep',
  CUSTOMER_SERVICE = 'customer_service',
  VIEWER = 'viewer'
}

// Authentication types
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Contact/Customer types
export interface Contact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  position?: string;
  source?: string;
  status: ContactStatus;
  tags: string[];
  customFields?: Record<string, any>;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ContactStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}

// Deal/Opportunity types
export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expectedCloseDate: Date;
  contactId: string;
  assignedTo: string;
  description?: string;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum DealStage {
  PROSPECTING = 'prospecting',
  QUALIFICATION = 'qualification',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}

// Activity types
export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description?: string;
  contactId?: string;
  dealId?: string;
  userId: string;
  dueDate?: Date;
  completedAt?: Date;
  status: ActivityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  TASK = 'task',
  NOTE = 'note'
}

export enum ActivityStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Communication types
export interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: Attachment[];
  contactId?: string;
  dealId?: string;
  userId: string;
  status: EmailStatus;
  sentAt?: Date;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
}

export enum EmailStatus {
  DRAFT = 'draft',
  QUEUED = 'queued',
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced'
}

// Analytics types
export interface Metric {
  id: string;
  name: string;
  value: number;
  type: MetricType;
  period: MetricPeriod;
  userId?: string;
  teamId?: string;
  createdAt: Date;
}

export enum MetricType {
  DEALS_CREATED = 'deals_created',
  DEALS_CLOSED = 'deals_closed',
  REVENUE = 'revenue',
  ACTIVITIES_COMPLETED = 'activities_completed',
  EMAILS_SENT = 'emails_sent',
  CALLS_MADE = 'calls_made',
  MEETINGS_HELD = 'meetings_held',
  CONVERSION_RATE = 'conversion_rate'
}

export enum MetricPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

// Pagination and filtering
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterParams {
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  assignedTo?: string;
  tags?: string[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Audit and tracking
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

export enum NotificationType {
  DEAL_ASSIGNED = 'deal_assigned',
  DEAL_STAGE_CHANGED = 'deal_stage_changed',
  TASK_DUE = 'task_due',
  MENTION = 'mention',
  SYSTEM = 'system'
}

// Service health check
export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy';
  version: string;
  uptime: number;
  checks: {
    database?: boolean;
    messageQueue?: boolean;
    cache?: boolean;
    externalServices?: Record<string, boolean>;
  };
}