import { Access } from '../entities/Access';
import { AccessType, AccessStatus } from '../value-objects/AccessEnums';

export interface IAccessRepository {
  create(access: Access): Promise<Access>;
  update(access: Access): Promise<Access>;
  findById(id: string): Promise<Access | null>;
  findByUserId(userId: string): Promise<Access[]>;
  findByBuildingId(buildingId: string): Promise<Access[]>;
  findByPIN(pin: string, buildingId: string): Promise<Access | null>;
  findActive(userId: string, buildingId: string): Promise<Access[]>;
  findExpired(): Promise<Access[]>;
  findByStatus(status: AccessStatus): Promise<Access[]>;
  findByType(type: AccessType): Promise<Access[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Access[]>;
  delete(id: string): Promise<void>;
  
  // Bulk operations
  bulkUpdateStatus(ids: string[], status: AccessStatus): Promise<void>;
  bulkDelete(ids: string[]): Promise<void>;
  
  // Statistics
  countByStatus(buildingId?: string): Promise<Record<AccessStatus, number>>;
  countByType(buildingId?: string): Promise<Record<AccessType, number>>;
}