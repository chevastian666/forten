import { IAccessRepository } from '../../../domain/repositories/IAccessRepository';
import { IEventRepository } from '../../../domain/repositories/IEventRepository';
import { Access, AccessType } from '../../../domain/entities/Access';
import { Event } from '../../../domain/entities/Event';
import { v4 as uuidv4 } from 'uuid';

export interface CreateAccessUseCaseInput {
  buildingId: string;
  name: string;
  phone?: string;
  type: AccessType;
  validUntil: Date;
  maxUses?: number;
  notes?: string;
  createdBy: string;
}

export class CreateAccessUseCase {
  constructor(
    private accessRepository: IAccessRepository,
    private eventRepository: IEventRepository
  ) {}

  async execute(input: CreateAccessUseCaseInput): Promise<Access> {
    // Generate unique PIN
    const pin = await this.accessRepository.generateUniquePin();

    // Create access entity
    const access = new Access(
      uuidv4(),
      input.buildingId,
      pin,
      input.name,
      input.type,
      new Date(),
      input.validUntil,
      input.maxUses || 1,
      0,
      true,
      input.phone,
      input.createdBy,
      input.notes
    );

    // Validate access dates
    if (!access.isValid()) {
      throw new Error('Invalid access dates');
    }

    // Save access
    const savedAccess = await this.accessRepository.create(access);

    // Create system event
    const event = new Event(
      uuidv4(),
      savedAccess.buildingId,
      'system',
      `Access PIN created for ${savedAccess.name}`,
      'low',
      false,
      input.createdBy,
      {
        action: 'access_created',
        accessId: savedAccess.id,
        type: savedAccess.type,
      }
    );

    await this.eventRepository.create(event);

    return savedAccess;
  }
}