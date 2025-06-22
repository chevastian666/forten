import { IAccessRepository } from '../../../domain/repositories/IAccessRepository';
import { IEventRepository } from '../../../domain/repositories/IEventRepository';
import { Event } from '../../../domain/entities/Event';
import { v4 as uuidv4 } from 'uuid';

export interface ValidateAccessUseCaseInput {
  pin: string;
  buildingId?: string;
}

export interface ValidateAccessUseCaseOutput {
  valid: boolean;
  access?: {
    name: string;
    type: string;
    remainingUses: number;
  };
  error?: string;
}

export class ValidateAccessUseCase {
  constructor(
    private accessRepository: IAccessRepository,
    private eventRepository: IEventRepository
  ) {}

  async execute(input: ValidateAccessUseCaseInput): Promise<ValidateAccessUseCaseOutput> {
    const { pin, buildingId } = input;

    // Find access by PIN
    const access = await this.accessRepository.findByPin(pin);

    if (!access) {
      // Log failed attempt
      if (buildingId) {
        const event = new Event(
          uuidv4(),
          buildingId,
          'access_denied',
          'Invalid PIN attempted',
          'medium',
          false,
          undefined,
          { pin }
        );
        await this.eventRepository.create(event);
      }

      return {
        valid: false,
        error: 'Invalid PIN',
      };
    }

    // Validate building if provided
    if (buildingId && access.buildingId !== buildingId) {
      return {
        valid: false,
        error: 'PIN not valid for this building',
      };
    }

    // Check if access can be used
    if (!access.canUse()) {
      // Log denied access
      const event = new Event(
        uuidv4(),
        access.buildingId,
        'access_denied',
        `Expired or inactive PIN used by ${access.name}`,
        'low',
        false,
        undefined,
        {
          accessId: access.id,
          reason: !access.isActive ? 'inactive' : access.hasRemainingUses() ? 'expired' : 'no_remaining_uses',
        }
      );
      await this.eventRepository.create(event);

      return {
        valid: false,
        error: 'PIN expired or inactive',
      };
    }

    // Use access
    access.use();
    await this.accessRepository.update(access.id, {
      currentUses: access.currentUses,
      updatedAt: access.updatedAt,
    });

    // Log successful access
    const event = new Event(
      uuidv4(),
      access.buildingId,
      'access_granted',
      `Access granted to ${access.name}`,
      'low',
      false,
      undefined,
      {
        accessId: access.id,
        currentUses: access.currentUses,
        maxUses: access.maxUses,
      }
    );
    await this.eventRepository.create(event);

    return {
      valid: true,
      access: {
        name: access.name,
        type: access.type,
        remainingUses: access.getRemainingUses(),
      },
    };
  }
}