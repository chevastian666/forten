import { Building } from '../../domain/entities/Building';
import { BuildingDTO } from '../dtos/BuildingDTO';

export class BuildingMapper {
  static toDTO(building: Building): BuildingDTO {
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
      contractDate: building.contractDate?.toISOString(),
      installationDate: building.installationDate?.toISOString(),
      totalUnits: building.totalUnits,
      totalCameras: building.totalCameras,
      qboxSerial: building.qboxSerial,
      hikCentralId: building.hikCentralId,
      notes: building.notes,
      createdAt: building.createdAt.toISOString(),
      updatedAt: building.updatedAt.toISOString(),
    };
  }

  static toDomain(data: any): Building {
    return new Building(
      data.id,
      data.name,
      data.address,
      data.city,
      data.country,
      data.status,
      data.totalUnits,
      data.totalCameras,
      data.postalCode,
      data.phone,
      data.email,
      data.contractDate ? new Date(data.contractDate) : undefined,
      data.installationDate ? new Date(data.installationDate) : undefined,
      data.qboxSerial,
      data.hikCentralId,
      data.notes,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }
}