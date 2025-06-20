import { IDoorRepository } from '../../domain/repositories/IDoorRepository';
import { IAccessLogRepository } from '../../domain/repositories/IAccessLogRepository';
import { Door } from '../../domain/entities/Door';
import { AccessLog } from '../../domain/entities/AccessLog';
import { DoorStatus } from '../../domain/value-objects/DoorEnums';
import { AccessMethod, AccessResult } from '../../domain/value-objects/AccessEnums';
import { IQBoxService } from '../services/IQBoxService';
import { IEventBus } from '../services/IEventBus';
import { ILogger } from '../services/ILogger';
import { IRealtimeService } from '../services/IRealtimeService';

export interface ControlDoorInput {
  doorId: string;
  action: 'LOCK' | 'UNLOCK' | 'TOGGLE' | 'EMERGENCY_UNLOCK';
  userId: string;
  reason?: string;
  duration?: number; // Duration in seconds for temporary unlock
}

export interface ControlDoorOutput {
  success: boolean;
  currentStatus: DoorStatus;
  message?: string;
}

export class ControlDoorUseCase {
  constructor(
    private readonly doorRepository: IDoorRepository,
    private readonly accessLogRepository: IAccessLogRepository,
    private readonly qboxService: IQBoxService,
    private readonly realtimeService: IRealtimeService,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async execute(input: ControlDoorInput): Promise<ControlDoorOutput> {
    try {
      this.logger.info('Controlling door', { 
        doorId: input.doorId, 
        action: input.action,
        userId: input.userId 
      });

      // Get door
      const door = await this.doorRepository.findById(input.doorId);
      if (!door) {
        throw new Error('Door not found');
      }

      // Check if door is accessible
      if (!door.isAccessible() && input.action !== 'EMERGENCY_UNLOCK') {
        return {
          success: false,
          currentStatus: door.status,
          message: `Door is ${door.status} and cannot be controlled`
        };
      }

      // Execute action
      let newStatus: DoorStatus;
      let qboxSuccess = true;

      switch (input.action) {
        case 'LOCK':
          newStatus = DoorStatus.LOCKED;
          if (door.connectionInfo.qboxIntegration) {
            qboxSuccess = await this.qboxService.lockDoor(
              door.connectionInfo.qboxIntegration.deviceId
            );
          }
          door.lock();
          break;

        case 'UNLOCK':
          newStatus = DoorStatus.UNLOCKED;
          if (door.connectionInfo.qboxIntegration) {
            qboxSuccess = await this.qboxService.unlockDoor(
              door.connectionInfo.qboxIntegration.deviceId,
              input.duration
            );
          }
          door.unlock();
          break;

        case 'TOGGLE':
          if (door.status === DoorStatus.LOCKED) {
            newStatus = DoorStatus.UNLOCKED;
            if (door.connectionInfo.qboxIntegration) {
              qboxSuccess = await this.qboxService.unlockDoor(
                door.connectionInfo.qboxIntegration.deviceId,
                input.duration
              );
            }
            door.unlock();
          } else {
            newStatus = DoorStatus.LOCKED;
            if (door.connectionInfo.qboxIntegration) {
              qboxSuccess = await this.qboxService.lockDoor(
                door.connectionInfo.qboxIntegration.deviceId
              );
            }
            door.lock();
          }
          break;

        case 'EMERGENCY_UNLOCK':
          newStatus = DoorStatus.EMERGENCY;
          if (door.connectionInfo.qboxIntegration) {
            qboxSuccess = await this.qboxService.emergencyUnlock(
              door.connectionInfo.qboxIntegration.deviceId
            );
          }
          door.setEmergency();
          break;

        default:
          throw new Error(`Invalid action: ${input.action}`);
      }

      // Update door status in database
      await this.doorRepository.update(door);

      // Log the manual control action
      const accessLog = AccessLog.create({
        userId: input.userId,
        buildingId: door.buildingId,
        doorId: door.id,
        accessMethod: AccessMethod.MANUAL,
        accessResult: qboxSuccess ? AccessResult.SUCCESS : AccessResult.DENIED,
        timestamp: new Date(),
        metadata: {
          action: input.action,
          reason: input.reason,
          duration: input.duration,
          previousStatus: door.status,
          newStatus
        }
      });

      await this.accessLogRepository.create(accessLog);

      // Send real-time update
      await this.realtimeService.sendDoorStatusUpdate({
        doorId: door.id,
        doorName: door.name,
        buildingId: door.buildingId,
        status: newStatus,
        controlledBy: input.userId,
        timestamp: new Date()
      });

      // Publish event
      await this.eventBus.publish({
        type: 'DOOR_CONTROLLED',
        aggregateId: door.id,
        data: {
          doorId: door.id,
          buildingId: door.buildingId,
          action: input.action,
          previousStatus: door.status,
          newStatus,
          userId: input.userId,
          reason: input.reason,
          qboxSuccess
        },
        metadata: {
          timestamp: new Date(),
          version: 1
        }
      });

      // Handle emergency actions
      if (input.action === 'EMERGENCY_UNLOCK') {
        await this.handleEmergencyUnlock(door, input.userId, input.reason);
      }

      this.logger.info('Door controlled successfully', { 
        doorId: door.id, 
        newStatus,
        qboxSuccess 
      });

      return {
        success: qboxSuccess,
        currentStatus: newStatus,
        message: qboxSuccess ? 'Door controlled successfully' : 'Q-Box integration failed'
      };
    } catch (error) {
      this.logger.error('Failed to control door', error as Error, input);
      throw error;
    }
  }

  private async handleEmergencyUnlock(
    door: Door,
    userId: string,
    reason?: string
  ): Promise<void> {
    // Notify security
    await this.eventBus.publish({
      type: 'EMERGENCY_ACCESS',
      aggregateId: door.id,
      data: {
        doorId: door.id,
        buildingId: door.buildingId,
        userId,
        reason,
        timestamp: new Date()
      },
      metadata: {
        timestamp: new Date(),
        version: 1,
        priority: 'HIGH'
      }
    });

    // Unlock all emergency exits in the building
    const emergencyDoors = await this.doorRepository.find({
      buildingId: door.buildingId,
      type: 'EMERGENCY_EXIT' as any
    });

    for (const emergencyDoor of emergencyDoors) {
      if (emergencyDoor.id !== door.id) {
        try {
          if (emergencyDoor.connectionInfo.qboxIntegration) {
            await this.qboxService.emergencyUnlock(
              emergencyDoor.connectionInfo.qboxIntegration.deviceId
            );
          }
          emergencyDoor.setEmergency();
          await this.doorRepository.update(emergencyDoor);
        } catch (error) {
          this.logger.error('Failed to unlock emergency door', error as Error, {
            doorId: emergencyDoor.id
          });
        }
      }
    }
  }
}