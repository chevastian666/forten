export type EventType = 
  | 'door_open' 
  | 'door_close' 
  | 'visitor_call' 
  | 'resident_call' 
  | 'access_granted' 
  | 'access_denied' 
  | 'camera_view' 
  | 'alarm' 
  | 'maintenance' 
  | 'system';

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IEvent {
  id: string;
  buildingId: string;
  userId?: string;
  type: EventType;
  description: string;
  metadata?: Record<string, any>;
  severity: EventSeverity;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Event implements IEvent {
  constructor(
    public id: string,
    public buildingId: string,
    public type: EventType,
    public description: string,
    public severity: EventSeverity = 'low',
    public resolved: boolean = false,
    public userId?: string,
    public metadata?: Record<string, any>,
    public resolvedAt?: Date,
    public resolvedBy?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  requiresImmediateAttention(): boolean {
    return !this.resolved && (this.severity === 'high' || this.severity === 'critical');
  }

  canBeResolvedBy(userId: string): boolean {
    return !this.resolved && userId !== undefined;
  }

  resolve(userId: string): void {
    if (this.canBeResolvedBy(userId)) {
      this.resolved = true;
      this.resolvedAt = new Date();
      this.resolvedBy = userId;
      this.updatedAt = new Date();
    }
  }
}