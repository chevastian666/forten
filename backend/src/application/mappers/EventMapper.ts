import { Event } from '../../domain/entities/Event';
import { EventDTO } from '../dtos/EventDTO';

export class EventMapper {
  static toDTO(event: Event): EventDTO {
    return {
      id: event.id,
      buildingId: event.buildingId,
      userId: event.userId,
      type: event.type,
      description: event.description,
      metadata: event.metadata,
      severity: event.severity,
      resolved: event.resolved,
      resolvedAt: event.resolvedAt?.toISOString(),
      resolvedBy: event.resolvedBy,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  static toDTOWithRelations(event: Event & { Building?: any; User?: any }): EventDTO {
    const dto = this.toDTO(event);
    
    if (event.Building) {
      dto.building = {
        id: event.Building.id,
        name: event.Building.name,
      };
    }
    
    if (event.User) {
      dto.user = {
        id: event.User.id,
        firstName: event.User.firstName,
        lastName: event.User.lastName,
      };
    }
    
    return dto;
  }

  static toDomain(data: any): Event {
    return new Event(
      data.id,
      data.buildingId,
      data.type,
      data.description,
      data.severity,
      data.resolved,
      data.userId,
      data.metadata,
      data.resolvedAt ? new Date(data.resolvedAt) : undefined,
      data.resolvedBy,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }
}