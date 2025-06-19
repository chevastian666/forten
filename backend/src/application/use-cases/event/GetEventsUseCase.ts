import { IEventRepository, EventFilters } from '../../../domain/repositories/IEventRepository';
import { PaginationOptions, PaginatedResult } from '../../../domain/repositories/IBuildingRepository';
import { Event } from '../../../domain/entities/Event';

export interface GetEventsUseCaseInput {
  filters?: EventFilters;
  pagination?: PaginationOptions;
}

export class GetEventsUseCase {
  constructor(private eventRepository: IEventRepository) {}

  async execute(input: GetEventsUseCaseInput): Promise<PaginatedResult<Event>> {
    const { filters = {}, pagination = { page: 1, limit: 20 } } = input;
    
    return await this.eventRepository.findAll(filters, pagination);
  }
}