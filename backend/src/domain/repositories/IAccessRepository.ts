import { Access } from '../entities/Access';
import { PaginationOptions, PaginatedResult } from './IBuildingRepository';

export interface AccessFilters {
  buildingId?: string;
  type?: string;
  isActive?: boolean;
  validDate?: Date;
}

export interface IAccessRepository {
  findById(id: string): Promise<Access | null>;
  findByPin(pin: string): Promise<Access | null>;
  findAll(
    filters?: AccessFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Access>>;
  create(access: Access): Promise<Access>;
  update(id: string, access: Partial<Access>): Promise<Access | null>;
  delete(id: string): Promise<boolean>;
  deactivate(id: string): Promise<boolean>;
  incrementUsage(id: string): Promise<boolean>;
  generateUniquePin(): Promise<string>;
  findActiveByBuilding(buildingId: string): Promise<Access[]>;
}