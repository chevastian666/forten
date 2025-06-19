import { IBuildingRepository, BuildingFilters, PaginationOptions } from '../../../domain/repositories/IBuildingRepository';
import { Building } from '../../../domain/entities/Building';

export interface GetBuildingsUseCaseInput {
  filters?: BuildingFilters;
  pagination?: PaginationOptions;
}

export interface GetBuildingsUseCaseOutput {
  buildings: Building[];
  total: number;
  page: number;
  totalPages: number;
}

export class GetBuildingsUseCase {
  constructor(private buildingRepository: IBuildingRepository) {}

  async execute(input: GetBuildingsUseCaseInput): Promise<GetBuildingsUseCaseOutput> {
    const { filters, pagination } = input;
    
    const result = await this.buildingRepository.findAll(filters, pagination);
    
    return {
      buildings: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  }
}