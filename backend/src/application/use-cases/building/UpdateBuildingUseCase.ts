import { IBuildingRepository } from '../../../domain/repositories/IBuildingRepository';
import { IEventRepository } from '../../../domain/repositories/IEventRepository';
import { Building } from '../../../domain/entities/Building';
import { Event } from '../../../domain/entities/Event';
import { v4 as uuidv4 } from 'uuid';

export interface UpdateBuildingUseCaseInput {
  id: string;
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  status?: 'prospect' | 'active' | 'inactive';
  totalUnits?: number;
  totalCameras?: number;
  notes?: string;
  userId: string;
}

export class UpdateBuildingUseCase {
  constructor(
    private buildingRepository: IBuildingRepository,
    private eventRepository: IEventRepository
  ) {}

  async execute(input: UpdateBuildingUseCaseInput): Promise<Building | null> {
    const existingBuilding = await this.buildingRepository.findById(input.id);
    
    if (!existingBuilding) {
      return null;
    }

    const previousStatus = existingBuilding.status;

    // Update building properties
    const updatedBuilding = new Building(
      existingBuilding.id,
      input.name ?? existingBuilding.name,
      input.address ?? existingBuilding.address,
      input.city ?? existingBuilding.city,
      input.country ?? existingBuilding.country,
      input.status ?? existingBuilding.status,
      input.totalUnits ?? existingBuilding.totalUnits,
      input.totalCameras ?? existingBuilding.totalCameras,
      input.postalCode ?? existingBuilding.postalCode,
      input.phone ?? existingBuilding.phone,
      input.email ?? existingBuilding.email,
      existingBuilding.lastAccessTime,
      existingBuilding.unresolvedEvents,
      existingBuilding.createdAt,
      new Date(),
      input.notes ?? existingBuilding.notes
    );

    const savedBuilding = await this.buildingRepository.update(input.id, updatedBuilding);

    // Create event if status changed
    if (input.status && previousStatus !== input.status) {
      const event = new Event(
        uuidv4(),
        savedBuilding.id,
        'system',
        `Building status changed from ${previousStatus} to ${input.status}`,
        'low',
        false,
        input.userId,
        { 
          action: 'status_change',
          previousStatus,
          newStatus: input.status
        }
      );

      await this.eventRepository.create(event);
    }

    return savedBuilding;
  }
}