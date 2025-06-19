import { Building, BuildingStatus } from '../../domain/entities/Building';

export class BuildingMapper {
  static toDomain(raw: any): Building {
    return new Building(
      raw.id,
      raw.name,
      raw.address,
      raw.city,
      raw.country,
      raw.status as BuildingStatus,
      raw.totalUnits,
      raw.totalCameras,
      raw.postalCode,
      raw.phone,
      raw.email,
      raw.contractDate ? new Date(raw.contractDate) : undefined,
      raw.installationDate ? new Date(raw.installationDate) : undefined,
      raw.qboxSerial,
      raw.hikCentralId,
      raw.notes,
      new Date(raw.createdAt),
      new Date(raw.updatedAt)
    );
  }

  static toPersistence(building: Building): any {
    return {
      id: building.id,
      name: building.name,
      address: building.address,
      city: building.city,
      country: building.country,
      postalCode: building.postalCode,
      phone: building.phone,
      email: building.email,
      status: building.status,
      contractDate: building.contractDate,
      installationDate: building.installationDate,
      totalUnits: building.totalUnits,
      totalCameras: building.totalCameras,
      qboxSerial: building.qboxSerial,
      hikCentralId: building.hikCentralId,
      notes: building.notes,
      createdAt: building.createdAt,
      updatedAt: building.updatedAt
    };
  }
}