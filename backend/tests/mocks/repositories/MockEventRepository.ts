import { 
  IEventRepository,
  EventFilters,
  EventStats 
} from '../../../src/domain/repositories/IEventRepository';
import { PaginationOptions, PaginatedResult } from '../../../src/domain/repositories/IBuildingRepository';
import { Event } from '../../../src/domain/entities/Event';

export class MockEventRepository implements IEventRepository {
  private events: Event[] = [];

  async findById(id: string): Promise<Event | null> {
    return this.events.find(event => event.id === id) || null;
  }

  async findAll(
    filters?: EventFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Event>> {
    let filteredEvents = [...this.events];

    // Apply filters
    if (filters) {
      if (filters.buildingId) {
        filteredEvents = filteredEvents.filter(e => e.buildingId === filters.buildingId);
      }
      if (filters.type) {
        filteredEvents = filteredEvents.filter(e => e.type === filters.type);
      }
      if (filters.severity) {
        filteredEvents = filteredEvents.filter(e => e.severity === filters.severity);
      }
      if (filters.resolved !== undefined) {
        filteredEvents = filteredEvents.filter(e => e.resolved === filters.resolved);
      }
      if (filters.startDate) {
        filteredEvents = filteredEvents.filter(e => new Date(e.createdAt) >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredEvents = filteredEvents.filter(e => new Date(e.createdAt) <= filters.endDate!);
      }
    }

    // Apply pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: filteredEvents.slice(start, end),
      total: filteredEvents.length,
      page,
      totalPages: Math.ceil(filteredEvents.length / limit)
    };
  }

  async create(event: Event): Promise<Event> {
    this.events.push(event);
    return event;
  }

  async update(id: string, eventData: Partial<Event>): Promise<Event | null> {
    const index = this.events.findIndex(e => e.id === id);
    if (index < 0) return null;
    
    this.events[index] = { ...this.events[index], ...eventData } as Event;
    return this.events[index];
  }

  async resolve(id: string, userId: string): Promise<Event | null> {
    const event = await this.findById(id);
    if (!event) return null;
    
    event.resolve(userId);
    return event;
  }

  async getStats(buildingId?: string): Promise<EventStats> {
    let relevantEvents = buildingId 
      ? this.events.filter(e => e.buildingId === buildingId)
      : this.events;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEvents = relevantEvents.filter(e => 
      new Date(e.createdAt) >= today
    );

    const unresolvedEvents = relevantEvents.filter(e => !e.resolved);

    const eventsByType = relevantEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: relevantEvents.length,
      todayEvents: todayEvents.length,
      unresolvedEvents: unresolvedEvents.length,
      eventsByType
    };
  }

  async findUnresolved(buildingId?: string): Promise<Event[]> {
    return this.events.filter(e => 
      !e.resolved && (!buildingId || e.buildingId === buildingId)
    );
  }

  async findByBuilding(buildingId: string, limit?: number): Promise<Event[]> {
    const events = this.events.filter(e => e.buildingId === buildingId);
    return limit ? events.slice(0, limit) : events;
  }

  async findByBuildingId(buildingId: string, options?: { limit?: number }): Promise<Event[]> {
    return this.findByBuilding(buildingId, options?.limit);
  }

  // Helper method for tests
  addEvent(event: Event): void {
    this.events.push(event);
  }

  // Helper method for tests
  clear(): void {
    this.events = [];
  }
}