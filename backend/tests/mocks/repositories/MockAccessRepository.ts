import { 
  IAccessRepository,
  AccessFilters
} from '../../../src/domain/repositories/IAccessRepository';
import { PaginationOptions, PaginatedResult } from '../../../src/domain/repositories/IBuildingRepository';
import { Access } from '../../../src/domain/entities/Access';

export class MockAccessRepository implements IAccessRepository {
  private accesses: Access[] = [];
  private pinCounter: number = 1000;

  async findById(id: string): Promise<Access | null> {
    return this.accesses.find(access => access.id === id) || null;
  }

  async findByPin(pin: string): Promise<Access | null> {
    return this.accesses.find(access => access.pin === pin) || null;
  }

  async findAll(
    filters?: AccessFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Access>> {
    let filteredAccesses = [...this.accesses];

    // Apply filters
    if (filters) {
      if (filters.buildingId) {
        filteredAccesses = filteredAccesses.filter(a => a.buildingId === filters.buildingId);
      }
      if (filters.type) {
        filteredAccesses = filteredAccesses.filter(a => a.type === filters.type);
      }
      if (filters.isActive !== undefined) {
        filteredAccesses = filteredAccesses.filter(a => a.isActive === filters.isActive);
      }
      if (filters.validDate) {
        filteredAccesses = filteredAccesses.filter(a => 
          filters.validDate! >= a.validFrom && filters.validDate! <= a.validUntil
        );
      }
    }

    // Apply pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: filteredAccesses.slice(start, end),
      total: filteredAccesses.length,
      page,
      totalPages: Math.ceil(filteredAccesses.length / limit)
    };
  }

  async create(access: Access): Promise<Access> {
    this.accesses.push(access);
    return access;
  }

  async update(id: string, accessData: Partial<Access>): Promise<Access | null> {
    const index = this.accesses.findIndex(a => a.id === id);
    if (index < 0) return null;
    
    this.accesses[index] = { ...this.accesses[index], ...accessData } as Access;
    return this.accesses[index];
  }

  async delete(id: string): Promise<boolean> {
    const initialLength = this.accesses.length;
    this.accesses = this.accesses.filter(access => access.id !== id);
    return this.accesses.length < initialLength;
  }

  async deactivate(id: string): Promise<boolean> {
    const access = await this.findById(id);
    if (!access) return false;
    
    access.deactivate();
    return true;
  }

  async incrementUsage(id: string): Promise<boolean> {
    const access = await this.findById(id);
    if (!access) return false;
    
    return access.use();
  }

  async generateUniquePin(): Promise<string> {
    const pin = String(this.pinCounter++).padStart(6, '0');
    return pin;
  }

  async findActiveByBuilding(buildingId: string): Promise<Access[]> {
    const now = new Date();
    return this.accesses.filter(access => 
      access.buildingId === buildingId && 
      access.isActive &&
      now >= access.validFrom &&
      now <= access.validUntil
    );
  }

  // Helper method for tests
  addAccess(access: Access): void {
    this.accesses.push(access);
  }

  // Helper method for tests
  clear(): void {
    this.accesses = [];
  }
}