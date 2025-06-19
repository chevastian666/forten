import { Event, EventType, EventSeverity } from '../../domain/entities/Event';

export class EventMapper {
  static toDomain(raw: any): Event {
    return new Event(
      raw.id,
      raw.buildingId,
      raw.type as EventType,
      raw.description,
      raw.severity as EventSeverity,
      raw.resolved,
      raw.userId,
      raw.metadata,
      raw.resolvedAt ? new Date(raw.resolvedAt) : undefined,
      raw.resolvedBy,
      new Date(raw.createdAt),
      new Date(raw.updatedAt)
    );
  }

  static toPersistence(event: Event): any {
    return {
      id: event.id,
      buildingId: event.buildingId,
      userId: event.userId,
      type: event.type,
      description: event.description,
      metadata: event.metadata,
      severity: event.severity,
      resolved: event.resolved,
      resolvedAt: event.resolvedAt,
      resolvedBy: event.resolvedBy,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    };
  }
}