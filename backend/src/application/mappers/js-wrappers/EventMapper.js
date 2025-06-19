// JavaScript wrapper for EventMapper

class EventMapper {
  static toDTO(event) {
    return {
      id: event.id,
      buildingId: event.buildingId,
      userId: event.userId,
      type: event.type,
      description: event.description,
      metadata: event.metadata,
      severity: event.severity,
      resolved: event.resolved,
      resolvedAt: event.resolvedAt ? new Date(event.resolvedAt).toISOString() : undefined,
      resolvedBy: event.resolvedBy,
      createdAt: new Date(event.createdAt).toISOString(),
      updatedAt: new Date(event.updatedAt).toISOString(),
    };
  }

  static toDTOWithRelations(event) {
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

  static toDomain(data) {
    return {
      id: data.id,
      buildingId: data.buildingId,
      type: data.type,
      description: data.description,
      severity: data.severity,
      resolved: data.resolved,
      userId: data.userId,
      metadata: data.metadata,
      resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
      resolvedBy: data.resolvedBy,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      // Include relations if present
      Building: data.Building,
      User: data.User
    };
  }
}

module.exports = { EventMapper };