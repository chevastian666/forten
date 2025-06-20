import { Door } from '../entities/Door';
import { DoorStatus, DoorType } from '../value-objects/DoorEnums';

export interface DoorFilter {
  buildingId?: string;
  floor?: number;
  area?: string;
  type?: DoorType;
  status?: DoorStatus;
  securityLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  search?: string; // Search by name or code
}

export interface IDoorRepository {
  create(door: Door): Promise<Door>;
  update(door: Door): Promise<Door>;
  findById(id: string): Promise<Door | null>;
  findByCode(code: string, buildingId: string): Promise<Door | null>;
  find(filter: DoorFilter): Promise<Door[]>;
  findByBuilding(buildingId: string): Promise<Door[]>;
  findByFloor(buildingId: string, floor: number): Promise<Door[]>;
  findOffline(): Promise<Door[]>;
  findRequiringMaintenance(): Promise<Door[]>;
  
  // Bulk operations
  bulkUpdateStatus(ids: string[], status: DoorStatus): Promise<void>;
  
  // Q-Box integration
  findByQBoxDeviceId(deviceId: string): Promise<Door | null>;
  findWithQBoxIntegration(): Promise<Door[]>;
  
  // Statistics
  countByStatus(buildingId?: string): Promise<Record<DoorStatus, number>>;
  countByType(buildingId?: string): Promise<Record<DoorType, number>>;
  getUsageStatistics(doorId: string, days: number): Promise<{
    totalAccess: number;
    uniqueUsers: number;
    peakHours: Array<{hour: number, count: number}>;
    averageDaily: number;
  }>;
  
  delete(id: string): Promise<void>;
}