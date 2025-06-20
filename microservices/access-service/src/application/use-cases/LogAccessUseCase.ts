import { IAccessLogRepository } from '../../domain/repositories/IAccessLogRepository';
import { IDoorRepository } from '../../domain/repositories/IDoorRepository';
import { AccessLog } from '../../domain/entities/AccessLog';
import { AccessMethod, AccessResult } from '../../domain/value-objects/AccessEnums';
import { IEventBus } from '../services/IEventBus';
import { ILogger } from '../services/ILogger';
import { IRealtimeService } from '../services/IRealtimeService';

export interface LogAccessInput {
  buildingId: string;
  doorId: string;
  accessMethod: AccessMethod;
  accessResult: AccessResult;
  userId?: string;
  visitorId?: string;
  accessId?: string;
  pin?: string;
  cardNumber?: string;
  biometricData?: string;
  failureReason?: string;
  ipAddress?: string;
  deviceInfo?: Record<string, any>;
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, any>;
}

export interface LogAccessOutput {
  logId: string;
  timestamp: Date;
}

export class LogAccessUseCase {
  constructor(
    private readonly accessLogRepository: IAccessLogRepository,
    private readonly doorRepository: IDoorRepository,
    private readonly realtimeService: IRealtimeService,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async execute(input: LogAccessInput): Promise<LogAccessOutput> {
    try {
      this.logger.info('Logging access attempt', {
        doorId: input.doorId,
        method: input.accessMethod,
        result: input.accessResult
      });

      // Create access log
      const accessLog = AccessLog.create({
        accessId: input.accessId,
        userId: input.userId,
        visitorId: input.visitorId,
        buildingId: input.buildingId,
        doorId: input.doorId,
        accessMethod: input.accessMethod,
        accessResult: input.accessResult,
        timestamp: new Date(),
        pin: input.pin,
        cardNumber: input.cardNumber,
        biometricData: input.biometricData,
        failureReason: input.failureReason,
        ipAddress: input.ipAddress,
        deviceInfo: input.deviceInfo,
        location: input.location,
        metadata: input.metadata
      });

      // Save to repository
      const savedLog = await this.accessLogRepository.create(accessLog);

      // Get door info for real-time update
      const door = await this.doorRepository.findById(input.doorId);
      const doorName = door?.name || 'Unknown Door';

      // Send real-time update
      await this.realtimeService.sendAccessLog({
        logId: savedLog.id,
        buildingId: input.buildingId,
        doorId: input.doorId,
        doorName,
        accessMethod: input.accessMethod,
        accessResult: input.accessResult,
        timestamp: savedLog.timestamp,
        entityType: savedLog.getEntityType(),
        entityId: savedLog.getEntityId()
      });

      // Publish event for analytics and alerts
      await this.eventBus.publish({
        type: 'ACCESS_LOG_CREATED',
        aggregateId: savedLog.id,
        data: {
          logId: savedLog.id,
          buildingId: input.buildingId,
          doorId: input.doorId,
          accessMethod: input.accessMethod,
          accessResult: input.accessResult,
          isSuccess: savedLog.isSuccess(),
          entityType: savedLog.getEntityType(),
          entityId: savedLog.getEntityId()
        },
        metadata: {
          timestamp: new Date(),
          version: 1
        }
      });

      // Check for security alerts
      await this.checkSecurityAlerts(savedLog);

      this.logger.info('Access logged successfully', { logId: savedLog.id });

      return {
        logId: savedLog.id,
        timestamp: savedLog.timestamp
      };
    } catch (error) {
      this.logger.error('Failed to log access', error as Error, input);
      throw error;
    }
  }

  private async checkSecurityAlerts(log: AccessLog): Promise<void> {
    // Check for multiple failed attempts
    if (log.isDenied()) {
      const recentFailures = await this.accessLogRepository.find({
        buildingId: log.buildingId,
        doorId: log.doorId,
        accessResult: AccessResult.DENIED,
        startDate: new Date(Date.now() - 5 * 60000), // Last 5 minutes
        endDate: new Date()
      });

      if (recentFailures.length >= 3) {
        await this.eventBus.publish({
          type: 'SECURITY_ALERT',
          aggregateId: log.id,
          data: {
            alertType: 'MULTIPLE_FAILED_ATTEMPTS',
            doorId: log.doorId,
            buildingId: log.buildingId,
            failureCount: recentFailures.length,
            timeWindow: '5_MINUTES'
          },
          metadata: {
            timestamp: new Date(),
            version: 1
          }
        });
      }
    }

    // Check for after-hours access
    const hour = new Date().getHours();
    if ((hour < 6 || hour > 22) && log.isSuccess()) {
      await this.eventBus.publish({
        type: 'SECURITY_ALERT',
        aggregateId: log.id,
        data: {
          alertType: 'AFTER_HOURS_ACCESS',
          doorId: log.doorId,
          buildingId: log.buildingId,
          entityType: log.getEntityType(),
          entityId: log.getEntityId(),
          hour
        },
        metadata: {
          timestamp: new Date(),
          version: 1
        }
      });
    }
  }
}