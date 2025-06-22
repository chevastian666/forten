import { IBuildingRepository } from '../../../domain/repositories/IBuildingRepository';
import { IEventRepository } from '../../../domain/repositories/IEventRepository';
import { Event } from '../../../domain/entities/Event';
import { v4 as uuidv4 } from 'uuid';

export interface DeleteBuildingUseCaseInput {
  id: string;
  userId: string;
}

export class DeleteBuildingUseCase {
  constructor(
    private buildingRepository: IBuildingRepository,
    private eventRepository: IEventRepository
  ) {}

  async execute(input: DeleteBuildingUseCaseInput): Promise<boolean> {
    const building = await this.buildingRepository.findById(input.id);
    
    if (!building) {
      return false;
    }

    // Soft delete by setting status to inactive
    building.status = 'inactive';
    await this.buildingRepository.update(input.id, building);

    // Create deactivation event
    const event = new Event(
      uuidv4(),
      building.id,
      'system',
      'Building deactivated',
      'low',
      false,
      input.userId,
      { action: 'building_deactivated' }
    );

    await this.eventRepository.create(event);

    return true;
  }
}