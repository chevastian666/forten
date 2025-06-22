import { Building } from '../entities/Building';
import { BuildingStatus } from '../value-objects/BuildingEnums';

export interface IBuildingRepository {
  create(building: Building): Promise<Building>;
  update(building: Building): Promise<Building>;
  findById(id: string): Promise<Building | null>;
  findByCode(code: string): Promise<Building | null>;
  findAll(): Promise<Building[]>;
  findByStatus(status: BuildingStatus): Promise<Building[]>;
  findBySecurityLevel(level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): Promise<Building[]>;
  
  // Location-based queries
  findNearby(latitude: number, longitude: number, radiusKm: number): Promise<Building[]>;
  
  // Statistics
  getOccupancyStats(): Promise<Array<{
    buildingId: string;
    currentOccupancy: number;
    maxOccupancy: number;
    occupancyRate: number;
  }>>;
  
  delete(id: string): Promise<void>;
}