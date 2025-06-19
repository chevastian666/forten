import { Access } from '../../domain/entities/Access';
import { AccessDTO } from '../dtos/AccessDTO';

export class AccessMapper {
  static toDTO(access: Access): AccessDTO {
    return {
      id: access.id,
      buildingId: access.buildingId,
      pin: access.pin,
      name: access.name,
      phone: access.phone,
      type: access.type,
      validFrom: access.validFrom.toISOString(),
      validUntil: access.validUntil.toISOString(),
      maxUses: access.maxUses,
      currentUses: access.currentUses,
      isActive: access.isActive,
      createdBy: access.createdBy,
      notes: access.notes,
      createdAt: access.createdAt.toISOString(),
      updatedAt: access.updatedAt.toISOString(),
    };
  }

  static toDTOWithRelations(access: Access & { Building?: any }): AccessDTO {
    const dto = this.toDTO(access);
    
    if (access.Building) {
      dto.building = {
        id: access.Building.id,
        name: access.Building.name,
      };
    }
    
    return dto;
  }

  static toDomain(data: any): Access {
    return new Access(
      data.id,
      data.buildingId,
      data.pin,
      data.name,
      data.type,
      new Date(data.validFrom),
      new Date(data.validUntil),
      data.maxUses,
      data.currentUses,
      data.isActive,
      data.phone,
      data.createdBy,
      data.notes,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }
}