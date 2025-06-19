import { IBuildingRepository } from '../../../domain/repositories/IBuildingRepository';
import { IEventRepository } from '../../../domain/repositories/IEventRepository';
import { Building } from '../../../domain/entities/Building';
import { Event } from '../../../domain/entities/Event';

export interface GetBuildingByIdUseCaseInput {
  id: string;
  includeEvents?: boolean;
}

export interface GetBuildingByIdUseCaseOutput {
  building: Building;
  events?: Event[];
}

export class GetBuildingByIdUseCase {
  constructor(
    private buildingRepository: IBuildingRepository,
    private eventRepository: IEventRepository
  ) {}

  async execute(input: GetBuildingByIdUseCaseInput): Promise<GetBuildingByIdUseCaseOutput | null> {
    const building = await this.buildingRepository.findById(input.id);
    
    if (!building) {
      return null;
    }

    const result: GetBuildingByIdUseCaseOutput = { building };

    if (input.includeEvents) {
      // Get recent events for the building
      const events = await this.eventRepository.findByBuildingId(input.id, { limit: 10 });
      result.events = events;
    }

    return result;
  }
}