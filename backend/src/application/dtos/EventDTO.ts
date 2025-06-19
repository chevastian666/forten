export interface EventDTO {
  id: string;
  buildingId: string;
  userId?: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  severity: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
  building?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateEventDTO {
  buildingId: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  severity?: string;
}

export interface EventListDTO {
  events: EventDTO[];
  total: number;
  page: number;
  totalPages: number;
}

export interface EventStatsDTO {
  totalEvents: number;
  todayEvents: number;
  unresolvedEvents: number;
  eventsByType: Record<string, number>;
}