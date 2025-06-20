import { Event, CreateEventDto, UpdateEventDto, EventFilter, EventType, EventSeverity } from '../entities/Event';

export interface IEventRepository {
  create(event: CreateEventDto): Promise<Event>;
  findById(id: string): Promise<Event | null>;
  findByBuildingId(buildingId: string, page?: number, limit?: number): Promise<{ events: Event[]; total: number }>;
  findByCameraId(cameraId: string, page?: number, limit?: number): Promise<{ events: Event[]; total: number }>;
  findByDeviceId(deviceId: string, page?: number, limit?: number): Promise<{ events: Event[]; total: number }>;
  findByFilter(filter: EventFilter, page?: number, limit?: number): Promise<{ events: Event[]; total: number }>;
  findUnacknowledged(buildingId?: string): Promise<Event[]>;
  findUnresolved(buildingId?: string): Promise<Event[]>;
  findRecent(buildingId: string, hours: number): Promise<Event[]>;
  update(id: string, updates: UpdateEventDto): Promise<Event | null>;
  acknowledge(id: string, userId: string): Promise<boolean>;
  resolve(id: string, userId: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  getEventStats(buildingId: string, days: number): Promise<{
    total: number;
    byType: Record<EventType, number>;
    bySeverity: Record<EventSeverity, number>;
    acknowledged: number;
    resolved: number;
  }>;
  cleanup(olderThanDays: number): Promise<number>; // Returns number of deleted events
}