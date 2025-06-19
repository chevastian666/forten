import { Access, AccessType } from '../../domain/entities/Access';

export class AccessMapper {
  static toDomain(raw: any): Access {
    return new Access(
      raw.id,
      raw.buildingId,
      raw.pin,
      raw.name,
      raw.type as AccessType,
      new Date(raw.validFrom),
      new Date(raw.validUntil),
      raw.maxUses,
      raw.currentUses,
      raw.isActive,
      raw.phone,
      raw.createdBy,
      raw.notes,
      new Date(raw.createdAt),
      new Date(raw.updatedAt)
    );
  }

  static toPersistence(access: Access): any {
    return {
      id: access.id,
      buildingId: access.buildingId,
      pin: access.pin,
      name: access.name,
      phone: access.phone,
      type: access.type,
      validFrom: access.validFrom,
      validUntil: access.validUntil,
      maxUses: access.maxUses,
      currentUses: access.currentUses,
      isActive: access.isActive,
      createdBy: access.createdBy,
      notes: access.notes,
      createdAt: access.createdAt,
      updatedAt: access.updatedAt
    };
  }
}