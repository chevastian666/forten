import { IAccessRepository } from '../../domain/repositories/IAccessRepository';
import { IAccessLogRepository } from '../../domain/repositories/IAccessLogRepository';
import { IDoorRepository } from '../../domain/repositories/IDoorRepository';
import { AccessLog } from '../../domain/entities/AccessLog';
import { AccessMethod, AccessResult } from '../../domain/value-objects/AccessEnums';
import { DoorStatus } from '../../domain/value-objects/DoorEnums';
import { IEventBus } from '../services/IEventBus';
import { ILogger } from '../services/ILogger';

export interface ValidateAccessInput {
  buildingId: string;
  doorId: string;
  accessMethod: AccessMethod;
  credential: string; // PIN, card number, etc.
  userId?: string;
  visitorId?: string;
  ipAddress?: string;
  deviceInfo?: Record<string, any>;
}

export interface ValidateAccessOutput {
  allowed: boolean;
  result: AccessResult;
  accessId?: string;
  message?: string;
}

export class ValidateAccessUseCase {
  constructor(
    private readonly accessRepository: IAccessRepository,
    private readonly accessLogRepository: IAccessLogRepository,
    private readonly doorRepository: IDoorRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async execute(input: ValidateAccessInput): Promise<ValidateAccessOutput> {
    try {
      this.logger.info('Validating access attempt', { 
        doorId: input.doorId, 
        method: input.accessMethod 
      });

      // Check door status
      const door = await this.doorRepository.findById(input.doorId);
      if (!door) {
        await this.logFailure(input, AccessResult.DOOR_OFFLINE, 'Door not found');
        return {
          allowed: false,
          result: AccessResult.DOOR_OFFLINE,
          message: 'Door not found'
        };
      }

      if (!door.isAccessible()) {
        await this.logFailure(input, AccessResult.DOOR_OFFLINE, `Door is ${door.status}`);
        return {
          allowed: false,
          result: AccessResult.DOOR_OFFLINE,
          message: `Door is ${door.status}`
        };
      }

      // Check if door supports the access method
      if (!door.supportsAccessMethod(input.accessMethod)) {
        await this.logFailure(input, AccessResult.DENIED, 'Access method not supported');
        return {
          allowed: false,
          result: AccessResult.DENIED,
          message: 'Access method not supported by this door'
        };
      }

      // Check emergency access
      if (input.accessMethod === AccessMethod.EMERGENCY && door.isEmergencyAccessCode(input.credential)) {
        await this.logSuccess(input, AccessResult.EMERGENCY);
        return {
          allowed: true,
          result: AccessResult.EMERGENCY,
          message: 'Emergency access granted'
        };
      }

      // Validate based on access method
      let validationResult: ValidateAccessOutput;
      
      switch (input.accessMethod) {
        case AccessMethod.PIN:
          validationResult = await this.validatePINAccess(input, door);
          break;
        case AccessMethod.CARD:
          validationResult = await this.validateCardAccess(input, door);
          break;
        // Add other access methods as needed
        default:
          validationResult = {
            allowed: false,
            result: AccessResult.DENIED,
            message: 'Access method not implemented'
          };
      }

      // Log the access attempt
      if (validationResult.allowed) {
        await this.logSuccess(input, validationResult.result, validationResult.accessId);
      } else {
        await this.logFailure(input, validationResult.result, validationResult.message);
      }

      return validationResult;
    } catch (error) {
      this.logger.error('Failed to validate access', error as Error, input);
      await this.logFailure(input, AccessResult.UNKNOWN_ERROR, 'System error');
      throw error;
    }
  }

  private async validatePINAccess(
    input: ValidateAccessInput, 
    door: any
  ): Promise<ValidateAccessOutput> {
    // Find access by PIN
    const access = await this.accessRepository.findByPIN(input.credential, input.buildingId);
    
    if (!access) {
      return {
        allowed: false,
        result: AccessResult.INVALID_PIN,
        message: 'Invalid PIN'
      };
    }

    // Check if access is valid
    if (!access.isValid()) {
      let result = AccessResult.DENIED;
      let message = 'Access denied';

      if (access.status === 'EXPIRED' || (access.validUntil && new Date() > access.validUntil)) {
        result = AccessResult.EXPIRED;
        message = 'Access expired';
      } else if (access.maxUsageCount && access.currentUsageCount >= access.maxUsageCount) {
        result = AccessResult.MAX_USAGE_REACHED;
        message = 'Maximum usage count reached';
      }

      return { allowed: false, result, message };
    }

    // Check if access allows this door
    if (!access.canAccessDoor(input.doorId)) {
      return {
        allowed: false,
        result: AccessResult.DENIED,
        message: 'Access not allowed for this door'
      };
    }

    // Check door schedule
    if (!door.shouldBeUnlocked()) {
      // Check if user has override permission
      if (!access.hasPermission('OVERRIDE_SCHEDULE' as any)) {
        return {
          allowed: false,
          result: AccessResult.OUTSIDE_SCHEDULE,
          message: 'Outside allowed hours'
        };
      }
    }

    // Update usage count
    access.incrementUsageCount();
    await this.accessRepository.update(access);

    return {
      allowed: true,
      result: AccessResult.SUCCESS,
      accessId: access.id,
      message: 'Access granted'
    };
  }

  private async validateCardAccess(
    input: ValidateAccessInput,
    door: any
  ): Promise<ValidateAccessOutput> {
    // Card validation logic would go here
    // This is a placeholder implementation
    return {
      allowed: false,
      result: AccessResult.INVALID_CARD,
      message: 'Card validation not implemented'
    };
  }

  private async logSuccess(
    input: ValidateAccessInput,
    result: AccessResult,
    accessId?: string
  ): Promise<void> {
    const log = AccessLog.createSuccessLog(
      input.buildingId,
      input.doorId,
      input.accessMethod,
      input.userId || input.visitorId || 'unknown',
      input.userId ? 'user' : 'visitor',
      {
        accessId,
        pin: input.accessMethod === AccessMethod.PIN ? input.credential : undefined,
        cardNumber: input.accessMethod === AccessMethod.CARD ? input.credential : undefined,
        ipAddress: input.ipAddress,
        deviceInfo: input.deviceInfo
      }
    );

    await this.accessLogRepository.create(log);

    await this.eventBus.publish({
      type: 'ACCESS_GRANTED',
      aggregateId: log.id,
      data: {
        logId: log.id,
        doorId: input.doorId,
        method: input.accessMethod,
        entityId: input.userId || input.visitorId,
        entityType: input.userId ? 'user' : 'visitor'
      },
      metadata: {
        timestamp: new Date(),
        version: 1
      }
    });
  }

  private async logFailure(
    input: ValidateAccessInput,
    result: AccessResult,
    reason?: string
  ): Promise<void> {
    const log = AccessLog.createFailureLog(
      input.buildingId,
      input.doorId,
      input.accessMethod,
      reason || result,
      {
        userId: input.userId,
        visitorId: input.visitorId,
        pin: input.accessMethod === AccessMethod.PIN ? input.credential : undefined,
        cardNumber: input.accessMethod === AccessMethod.CARD ? input.credential : undefined,
        ipAddress: input.ipAddress,
        deviceInfo: input.deviceInfo
      }
    );

    await this.accessLogRepository.create(log);

    await this.eventBus.publish({
      type: 'ACCESS_DENIED',
      aggregateId: log.id,
      data: {
        logId: log.id,
        doorId: input.doorId,
        method: input.accessMethod,
        reason: reason || result,
        entityId: input.userId || input.visitorId,
        entityType: input.userId ? 'user' : 'visitor'
      },
      metadata: {
        timestamp: new Date(),
        version: 1
      }
    });
  }
}