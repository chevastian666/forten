// Event definitions for RabbitMQ message passing between microservices

export enum EventType {
  // User events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ACTIVATED = 'user.activated',
  USER_DEACTIVATED = 'user.deactivated',
  USER_PASSWORD_CHANGED = 'user.password.changed',
  
  // Authentication events
  USER_LOGGED_IN = 'auth.user.logged_in',
  USER_LOGGED_OUT = 'auth.user.logged_out',
  TOKEN_REFRESHED = 'auth.token.refreshed',
  PASSWORD_RESET_REQUESTED = 'auth.password.reset_requested',
  PASSWORD_RESET_COMPLETED = 'auth.password.reset_completed',
  
  // Contact events
  CONTACT_CREATED = 'contact.created',
  CONTACT_UPDATED = 'contact.updated',
  CONTACT_DELETED = 'contact.deleted',
  CONTACT_ASSIGNED = 'contact.assigned',
  CONTACT_STATUS_CHANGED = 'contact.status.changed',
  
  // Deal events
  DEAL_CREATED = 'deal.created',
  DEAL_UPDATED = 'deal.updated',
  DEAL_DELETED = 'deal.deleted',
  DEAL_STAGE_CHANGED = 'deal.stage.changed',
  DEAL_ASSIGNED = 'deal.assigned',
  DEAL_WON = 'deal.won',
  DEAL_LOST = 'deal.lost',
  
  // Activity events
  ACTIVITY_CREATED = 'activity.created',
  ACTIVITY_UPDATED = 'activity.updated',
  ACTIVITY_COMPLETED = 'activity.completed',
  ACTIVITY_CANCELLED = 'activity.cancelled',
  ACTIVITY_DUE_SOON = 'activity.due_soon',
  ACTIVITY_OVERDUE = 'activity.overdue',
  
  // Communication events
  EMAIL_SENT = 'communication.email.sent',
  EMAIL_RECEIVED = 'communication.email.received',
  EMAIL_FAILED = 'communication.email.failed',
  EMAIL_BOUNCED = 'communication.email.bounced',
  SMS_SENT = 'communication.sms.sent',
  SMS_RECEIVED = 'communication.sms.received',
  
  // Analytics events
  METRIC_CALCULATED = 'analytics.metric.calculated',
  REPORT_GENERATED = 'analytics.report.generated',
  DASHBOARD_VIEWED = 'analytics.dashboard.viewed',
  
  // System events
  SERVICE_STARTED = 'system.service.started',
  SERVICE_STOPPED = 'system.service.stopped',
  SERVICE_HEALTH_CHECK = 'system.service.health_check',
  DATABASE_CONNECTION_LOST = 'system.database.connection_lost',
  DATABASE_CONNECTION_RESTORED = 'system.database.connection_restored',
}

// Base event interface
export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string; // Service that generated the event
  correlationId?: string;
  userId?: string; // User who triggered the event
  metadata?: Record<string, any>;
}

// User events
export interface UserCreatedEvent extends BaseEvent {
  type: EventType.USER_CREATED;
  data: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface UserUpdatedEvent extends BaseEvent {
  type: EventType.USER_UPDATED;
  data: {
    userId: string;
    changes: Record<string, any>;
  };
}

export interface UserDeletedEvent extends BaseEvent {
  type: EventType.USER_DELETED;
  data: {
    userId: string;
  };
}

// Authentication events
export interface UserLoggedInEvent extends BaseEvent {
  type: EventType.USER_LOGGED_IN;
  data: {
    userId: string;
    email: string;
    ipAddress: string;
    userAgent: string;
  };
}

export interface PasswordResetRequestedEvent extends BaseEvent {
  type: EventType.PASSWORD_RESET_REQUESTED;
  data: {
    email: string;
    resetToken: string;
    expiresAt: Date;
  };
}

// Contact events
export interface ContactCreatedEvent extends BaseEvent {
  type: EventType.CONTACT_CREATED;
  data: {
    contactId: string;
    email: string;
    firstName: string;
    lastName: string;
    assignedTo?: string;
  };
}

export interface ContactStatusChangedEvent extends BaseEvent {
  type: EventType.CONTACT_STATUS_CHANGED;
  data: {
    contactId: string;
    previousStatus: string;
    newStatus: string;
  };
}

// Deal events
export interface DealCreatedEvent extends BaseEvent {
  type: EventType.DEAL_CREATED;
  data: {
    dealId: string;
    title: string;
    value: number;
    contactId: string;
    assignedTo: string;
  };
}

export interface DealStageChangedEvent extends BaseEvent {
  type: EventType.DEAL_STAGE_CHANGED;
  data: {
    dealId: string;
    previousStage: string;
    newStage: string;
    probability: number;
  };
}

export interface DealWonEvent extends BaseEvent {
  type: EventType.DEAL_WON;
  data: {
    dealId: string;
    value: number;
    closedBy: string;
    closedAt: Date;
  };
}

// Activity events
export interface ActivityCreatedEvent extends BaseEvent {
  type: EventType.ACTIVITY_CREATED;
  data: {
    activityId: string;
    type: string;
    subject: string;
    contactId?: string;
    dealId?: string;
    assignedTo: string;
    dueDate?: Date;
  };
}

export interface ActivityCompletedEvent extends BaseEvent {
  type: EventType.ACTIVITY_COMPLETED;
  data: {
    activityId: string;
    completedBy: string;
    completedAt: Date;
  };
}

// Communication events
export interface EmailSentEvent extends BaseEvent {
  type: EventType.EMAIL_SENT;
  data: {
    emailId: string;
    from: string;
    to: string[];
    subject: string;
    contactId?: string;
    dealId?: string;
  };
}

// Type union for all events
export type DomainEvent = 
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | UserLoggedInEvent
  | PasswordResetRequestedEvent
  | ContactCreatedEvent
  | ContactStatusChangedEvent
  | DealCreatedEvent
  | DealStageChangedEvent
  | DealWonEvent
  | ActivityCreatedEvent
  | ActivityCompletedEvent
  | EmailSentEvent;

// Event handler type
export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void>;

// Event subscription configuration
export interface EventSubscription {
  eventType: EventType;
  handler: EventHandler;
  queue?: string;
  retries?: number;
  retryDelay?: number;
}

// Exchange and routing configuration
export const EXCHANGE_NAME = 'forten.events';
export const EXCHANGE_TYPE = 'topic';
export const DEAD_LETTER_EXCHANGE = 'forten.dlx';
export const DEAD_LETTER_QUEUE = 'forten.dlq';

// Routing key patterns
export const getRoutingKey = (eventType: EventType): string => {
  return eventType.replace(/\./g, '.');
};

// Queue naming convention
export const getQueueName = (service: string, eventType: EventType): string => {
  return `${service}.${eventType}`;
};