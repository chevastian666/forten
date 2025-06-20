import { Building, CreateBuildingDto, UpdateBuildingDto, BuildingStatus } from '../entities/Building';

export interface IBuildingRepository {
  create(building: CreateBuildingDto): Promise<Building>;
  findById(id: string): Promise<Building | null>;
  findByManagerId(managerId: string): Promise<Building[]>;
  findAll(page?: number, limit?: number): Promise<{ buildings: Building[]; total: number }>;
  update(id: string, updates: UpdateBuildingDto): Promise<Building | null>;
  delete(id: string): Promise<boolean>;
  updateStatus(id: string, status: BuildingStatus): Promise<boolean>;
  updateCameraCount(id: string, count: number): Promise<boolean>;
  updateDeviceCount(id: string, count: number): Promise<boolean>;
  findByLocation(latitude: number, longitude: number, radius: number): Promise<Building[]>;
}