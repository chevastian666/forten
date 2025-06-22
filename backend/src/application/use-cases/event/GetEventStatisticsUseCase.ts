import { IEventRepository, EventStats } from '../../../domain/repositories/IEventRepository';

export interface GetEventStatisticsUseCaseInput {
  buildingId?: string;
}

export class GetEventStatisticsUseCase {
  constructor(private eventRepository: IEventRepository) {}

  async execute(input: GetEventStatisticsUseCaseInput): Promise<EventStats> {
    return await this.eventRepository.getStats(input.buildingId);
  }
}