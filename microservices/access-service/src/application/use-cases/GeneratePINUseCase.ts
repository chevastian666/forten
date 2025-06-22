import { IAccessRepository } from '../../domain/repositories/IAccessRepository';
import { Access } from '../../domain/entities/Access';
import { PIN } from '../../domain/value-objects/PIN';
import { AccessType, AccessStatus } from '../../domain/value-objects/AccessEnums';
import { AccessPermission } from '../../domain/value-objects/AccessPermission';
import { IEventBus } from '../services/IEventBus';
import { ILogger } from '../services/ILogger';

export interface GeneratePINInput {
  userId: string;
  buildingId: string;
  doorIds: string[];
  accessType: AccessType;
  validFrom: Date;
  validUntil?: Date;
  isTemporary: boolean;
  maxUsageCount?: number;
  permissions: AccessPermission[];
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface GeneratePINOutput {
  accessId: string;
  pin: string;
  validFrom: Date;
  validUntil?: Date;
  maxUsageCount?: number;
}

export class GeneratePINUseCase {
  constructor(
    private readonly accessRepository: IAccessRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async execute(input: GeneratePINInput): Promise<GeneratePINOutput> {
    try {
      this.logger.info('Generating PIN for user', { userId: input.userId, buildingId: input.buildingId });

      // Generate unique PIN
      let pin: PIN;
      let pinExists = true;
      let attempts = 0;
      const maxAttempts = 10;

      while (pinExists && attempts < maxAttempts) {
        if (input.isTemporary && input.validUntil) {
          const validityHours = Math.ceil((input.validUntil.getTime() - Date.now()) / (1000 * 60 * 60));
          pin = PIN.generateTemporary(6, validityHours);
        } else {
          pin = PIN.generate(6);
        }

        const existingAccess = await this.accessRepository.findByPIN(pin.getValue(), input.buildingId);
        pinExists = existingAccess !== null;
        attempts++;
      }

      if (pinExists) {
        throw new Error('Failed to generate unique PIN after multiple attempts');
      }

      // Create access entity
      const access = Access.create({
        userId: input.userId,
        buildingId: input.buildingId,
        doorIds: input.doorIds,
        pin: pin!,
        accessType: input.accessType,
        status: AccessStatus.ACTIVE,
        permissions: input.permissions,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        isTemporary: input.isTemporary,
        maxUsageCount: input.maxUsageCount,
        currentUsageCount: 0,
        metadata: input.metadata,
        createdBy: input.createdBy
      });

      // Save to repository
      const savedAccess = await this.accessRepository.create(access);

      // Publish event
      await this.eventBus.publish({
        type: 'ACCESS_CREATED',
        aggregateId: savedAccess.id,
        data: {
          accessId: savedAccess.id,
          userId: input.userId,
          buildingId: input.buildingId,
          accessType: input.accessType,
          isTemporary: input.isTemporary,
          createdBy: input.createdBy
        },
        metadata: {
          timestamp: new Date(),
          version: 1
        }
      });

      this.logger.info('PIN generated successfully', { 
        accessId: savedAccess.id, 
        userId: input.userId,
        isTemporary: input.isTemporary 
      });

      return {
        accessId: savedAccess.id,
        pin: pin!.getValue(),
        validFrom: savedAccess.validFrom,
        validUntil: savedAccess.validUntil,
        maxUsageCount: savedAccess.maxUsageCount
      };
    } catch (error) {
      this.logger.error('Failed to generate PIN', error as Error, { userId: input.userId });
      throw error;
    }
  }
}