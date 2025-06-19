import { IAccessRepository, AccessFilters } from '../../../domain/repositories/IAccessRepository';
import { PaginationOptions } from '../../../domain/repositories/IBuildingRepository';
import { Access } from '../../../domain/entities/Access';

export interface GetAccessesUseCaseInput {
  filters?: AccessFilters;
  pagination?: PaginationOptions;
}

export interface GetAccessesUseCaseOutput {
  accesses: Access[];
  total: number;
  page: number;
  totalPages: number;
}

export class GetAccessesUseCase {
  constructor(private accessRepository: IAccessRepository) {}

  async execute(input: GetAccessesUseCaseInput): Promise<GetAccessesUseCaseOutput> {
    const { filters = {}, pagination = { page: 1, limit: 20 } } = input;

    const result = await this.accessRepository.findAll(filters, pagination);

    return {
      accesses: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  }
}