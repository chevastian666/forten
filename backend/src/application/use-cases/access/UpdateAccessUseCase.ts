import { IAccessRepository } from '../../../domain/repositories/IAccessRepository';
import { IEventRepository } from '../../../domain/repositories/IEventRepository';
import { Access } from '../../../domain/entities/Access';
import { Event } from '../../../domain/entities/Event';
import { v4 as uuidv4 } from 'uuid';

export interface UpdateAccessUseCaseInput {
  id: string;
  name?: string;
  phone?: string;
  validUntil?: Date;
  maxUses?: number;
  isActive?: boolean;
  notes?: string;
  userId: string;
}

export class UpdateAccessUseCase {
  constructor(
    private accessRepository: IAccessRepository,
    private eventRepository: IEventRepository
  ) {}

  async execute(input: UpdateAccessUseCaseInput): Promise<Access | null> {
    const { id, userId, ...updateData } = input;

    // Find existing access
    const existingAccess = await this.accessRepository.findById(id);
    if (!existingAccess) {
      return null;
    }

    // Update access
    const updatedAccess = await this.accessRepository.update(id, updateData);
    if (!updatedAccess) {
      return null;
    }

    // Create system event
    const event = new Event(
      uuidv4(),
      updatedAccess.buildingId,
      'system',
      `Access updated for ${updatedAccess.name}`,
      'low',
      false,
      userId,
      {
        accessId: updatedAccess.id,
        updates: Object.keys(updateData),
      }
    );

    await this.eventRepository.create(event);

    return updatedAccess;
  }
}