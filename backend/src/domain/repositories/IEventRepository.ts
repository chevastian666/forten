import { Event } from '../entities/Event';
import { PaginationOptions, PaginatedResult } from './IBuildingRepository';

export interface EventFilters {
  buildingId?: string;
  type?: string;
  severity?: string;
  resolved?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface EventStats {
  totalEvents: number;
  todayEvents: number;
  unresolvedEvents: number;
  eventsByType: Record<string, number>;
}

export interface IEventRepository {
  findById(id: string): Promise<Event | null>;
  findAll(
    filters?: EventFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Event>>;
  create(event: Event): Promise<Event>;
  update(id: string, event: Partial<Event>): Promise<Event | null>;
  resolve(id: string, userId: string): Promise<Event | null>;
  getStats(buildingId?: string): Promise<EventStats>;
  findUnresolved(buildingId?: string): Promise<Event[]>;
  findByBuilding(buildingId: string, limit?: number): Promise<Event[]>;
  findByBuildingId(buildingId: string, options?: { limit?: number }): Promise<Event[]>;
}