import { IBuildingRepository } from '../../../domain/repositories/IBuildingRepository';
import { IEventRepository } from '../../../domain/repositories/IEventRepository';
import { Building } from '../../../domain/entities/Building';
import { Event } from '../../../domain/entities/Event';
import { v4 as uuidv4 } from 'uuid';

export interface CreateBuildingUseCaseInput {
  name: string;
  address: string;
  city: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  totalUnits?: number;
  totalCameras?: number;
  notes?: string;
  userId: string;
}

export class CreateBuildingUseCase {
  constructor(
    private buildingRepository: IBuildingRepository,
    private eventRepository: IEventRepository
  ) {}

  async execute(input: CreateBuildingUseCaseInput): Promise<Building> {
    // Create building entity
    const building = new Building(
      uuidv4(),
      input.name,
      input.address,
      input.city,
      input.country || 'Uruguay',
      'prospect',
      input.totalUnits || 0,
      input.totalCameras || 0,
      input.postalCode,
      input.phone,
      input.email,
      undefined,
      undefined,
      undefined,
      undefined,
      input.notes
    );

    // Save building
    const savedBuilding = await this.buildingRepository.create(building);

    // Create system event
    try {
      const event = new Event(
        uuidv4(),
        savedBuilding.id,
        'system',
        `Building ${savedBuilding.name} created`,
        'low',
        false,
        input.userId,
        { action: 'building_created' }
      );

      await this.eventRepository.create(event);
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to create building creation event:', error);
    }

    return savedBuilding;
  }
}