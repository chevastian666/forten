import { IAccessRepository } from '../../../domain/repositories/IAccessRepository';
import { IEventRepository } from '../../../domain/repositories/IEventRepository';
import { Event } from '../../../domain/entities/Event';
import { v4 as uuidv4 } from 'uuid';

export interface DeleteAccessUseCaseInput {
  id: string;
  userId: string;
}

export class DeleteAccessUseCase {
  constructor(
    private accessRepository: IAccessRepository,
    private eventRepository: IEventRepository
  ) {}

  async execute(input: DeleteAccessUseCaseInput): Promise<boolean> {
    const { id, userId } = input;

    // Find existing access
    const access = await this.accessRepository.findById(id);
    if (!access) {
      return false;
    }

    // Deactivate access (soft delete)
    const success = await this.accessRepository.deactivate(id);
    if (!success) {
      return false;
    }

    // Create system event
    const event = new Event(
      uuidv4(),
      access.buildingId,
      'system',
      `Access deactivated for ${access.name}`,
      'low',
      false,
      userId,
      { accessId: access.id }
    );

    await this.eventRepository.create(event);

    return true;
  }
}