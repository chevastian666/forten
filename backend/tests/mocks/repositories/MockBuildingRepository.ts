import { 
  IBuildingRepository, 
  PaginationOptions, 
  BuildingFilters, 
  PaginatedResult 
} from '../../../src/domain/repositories/IBuildingRepository';
import { Building } from '../../../src/domain/entities/Building';

export class MockBuildingRepository implements IBuildingRepository {
  private buildings: Building[] = [];

  async findById(id: string): Promise<Building | null> {
    return this.buildings.find(building => building.id === id) || null;
  }

  async findAll(
    filters?: BuildingFilters, 
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Building>> {
    let filteredBuildings = [...this.buildings];

    // Apply filters
    if (filters) {
      if (filters.status) {
        filteredBuildings = filteredBuildings.filter(b => b.status === filters.status);
      }
      if (filters.city) {
        filteredBuildings = filteredBuildings.filter(b => b.city === filters.city);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filteredBuildings = filteredBuildings.filter(b => 
          b.name.toLowerCase().includes(search) ||
          b.address.toLowerCase().includes(search)
        );
      }
    }

    // Apply pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: filteredBuildings.slice(start, end),
      total: filteredBuildings.length,
      page,
      totalPages: Math.ceil(filteredBuildings.length / limit)
    };
  }

  async create(building: Building): Promise<Building> {
    this.buildings.push(building);
    return building;
  }

  async update(id: string, buildingData: Partial<Building>): Promise<Building | null> {
    const index = this.buildings.findIndex(b => b.id === id);
    if (index < 0) return null;
    
    this.buildings[index] = { ...this.buildings[index], ...buildingData } as Building;
    return this.buildings[index];
  }

  async delete(id: string): Promise<boolean> {
    const initialLength = this.buildings.length;
    this.buildings = this.buildings.filter(building => building.id !== id);
    return this.buildings.length < initialLength;
  }

  async findByStatus(status: string): Promise<Building[]> {
    return this.buildings.filter(building => building.status === status);
  }

  async countByStatus(status: string): Promise<number> {
    return this.buildings.filter(building => building.status === status).length;
  }

  // Helper method for tests
  addBuilding(building: Building): void {
    this.buildings.push(building);
  }

  // Helper method for tests
  clear(): void {
    this.buildings = [];
  }
}