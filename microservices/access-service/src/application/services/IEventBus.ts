export interface DomainEvent {
  type: string;
  aggregateId: string;
  data: any;
  metadata: {
    timestamp: Date;
    version: number;
    priority?: 'LOW' | 'NORMAL' | 'HIGH';
    correlationId?: string;
    causationId?: string;
  };
}

export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void;
  unsubscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void;
}