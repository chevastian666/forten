import { Building } from '../entities/Building';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface BuildingFilters {
  status?: string;
  search?: string;
  city?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IBuildingRepository {
  findById(id: string): Promise<Building | null>;
  findAll(
    filters?: BuildingFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Building>>;
  create(building: Building): Promise<Building>;
  update(id: string, building: Partial<Building>): Promise<Building | null>;
  delete(id: string): Promise<boolean>;
  findByStatus(status: string): Promise<Building[]>;
  countByStatus(status: string): Promise<number>;
}