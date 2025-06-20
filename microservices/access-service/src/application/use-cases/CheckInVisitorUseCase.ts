import { IVisitorRepository } from '../../domain/repositories/IVisitorRepository';
import { IAccessRepository } from '../../domain/repositories/IAccessRepository';
import { VisitorStatus } from '../../domain/value-objects/VisitorEnums';
import { IEventBus } from '../services/IEventBus';
import { ILogger } from '../services/ILogger';
import { INotificationService } from '../services/INotificationService';
import { IPhotoService } from '../services/IPhotoService';

export interface CheckInVisitorInput {
  visitorId?: string;
  email?: string;
  phone?: string;
  badgeNumber?: string;
  photoBase64?: string;
  agreementsAccepted?: {
    nda?: boolean;
    safetyBriefing?: boolean;
    dataPrivacy?: boolean;
    photoConsent?: boolean;
  };
  checkedInBy: string;
}

export interface CheckInVisitorOutput {
  success: boolean;
  visitorId: string;
  visitorName: string;
  badgeNumber: string;
  hostName: string;
  hostDepartment?: string;
  allowedAreas: string[];
  specialInstructions?: string;
  pin?: string;
  validUntil?: Date;
}

export class CheckInVisitorUseCase {
  constructor(
    private readonly visitorRepository: IVisitorRepository,
    private readonly accessRepository: IAccessRepository,
    private readonly notificationService: INotificationService,
    private readonly photoService: IPhotoService,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async execute(input: CheckInVisitorInput): Promise<CheckInVisitorOutput> {
    try {
      this.logger.info('Checking in visitor', input);

      // Find visitor
      let visitor;
      if (input.visitorId) {
        visitor = await this.visitorRepository.findById(input.visitorId);
      } else if (input.email) {
        const visitors = await this.visitorRepository.findByEmail(input.email);
        visitor = visitors.find(v => v.isExpected());
      } else if (input.phone) {
        const visitors = await this.visitorRepository.findByPhone(input.phone);
        visitor = visitors.find(v => v.isExpected());
      } else if (input.badgeNumber) {
        visitor = await this.visitorRepository.findByBadgeNumber(input.badgeNumber);
      }

      if (!visitor) {
        throw new Error('Visitor not found or not expected at this time');
      }

      // Check if already checked in
      if (visitor.status === VisitorStatus.CHECKED_IN) {
        throw new Error('Visitor is already checked in');
      }

      // Update agreements if provided
      if (input.agreementsAccepted) {
        Object.entries(input.agreementsAccepted).forEach(([key, value]) => {
          visitor!.acceptAgreement(key as any, value);
        });
      }

      // Check required agreements
      if (!visitor.hasAcceptedAllRequiredAgreements()) {
        throw new Error('All required agreements must be accepted');
      }

      // Process and save photo if provided
      if (input.photoBase64) {
        const photoUrl = await this.photoService.saveVisitorPhoto(
          visitor.id,
          input.photoBase64
        );
        visitor.updatePhoto(photoUrl);
      }

      // Generate badge number if not assigned
      let badgeNumber = visitor.badgeNumber;
      if (!badgeNumber) {
        badgeNumber = `V${Date.now().toString().slice(-6)}`;
      }

      // Check in the visitor
      visitor.checkIn(badgeNumber);
      await this.visitorRepository.update(visitor);

      // Get access information
      let pin: string | undefined;
      let validUntil: Date | undefined;
      
      if (visitor.temporaryAccessId) {
        const access = await this.accessRepository.findById(visitor.temporaryAccessId);
        if (access) {
          pin = access.pin?.getValue();
          validUntil = access.validUntil;
        }
      }

      // Send notifications
      await this.sendCheckInNotifications(visitor);

      // Publish event
      await this.eventBus.publish({
        type: 'VISITOR_CHECKED_IN',
        aggregateId: visitor.id,
        data: {
          visitorId: visitor.id,
          visitorName: visitor.fullName,
          hostUserId: visitor.hostUserId,
          buildingId: visitor.buildingId,
          badgeNumber,
          checkedInBy: input.checkedInBy,
          actualArrival: visitor.actualArrival
        },
        metadata: {
          timestamp: new Date(),
          version: 1
        }
      });

      this.logger.info('Visitor checked in successfully', { 
        visitorId: visitor.id,
        badgeNumber 
      });

      return {
        success: true,
        visitorId: visitor.id,
        visitorName: visitor.fullName,
        badgeNumber,
        hostName: visitor.hostName,
        hostDepartment: visitor.hostDepartment,
        allowedAreas: visitor.allowedAreas,
        specialInstructions: visitor.specialInstructions,
        pin,
        validUntil
      };
    } catch (error) {
      this.logger.error('Failed to check in visitor', error as Error, input);
      throw error;
    }
  }

  private async sendCheckInNotifications(visitor: any): Promise<void> {
    try {
      // Notify host
      await this.notificationService.sendEmail({
        to: visitor.hostUserId, // Would need to fetch host email
        subject: 'Your visitor has arrived',
        template: 'visitor-arrived',
        data: {
          visitorName: visitor.fullName,
          company: visitor.company,
          arrivalTime: visitor.actualArrival,
          badgeNumber: visitor.badgeNumber
        }
      });

      // Send SMS to host
      await this.notificationService.sendSMS({
        to: visitor.hostUserId, // Would need to fetch host phone
        message: `${visitor.fullName} from ${visitor.company || 'N/A'} has arrived at reception.`
      });

      // If visitor is late, send additional notification
      if (visitor.isLate()) {
        await this.eventBus.publish({
          type: 'VISITOR_LATE_ARRIVAL',
          aggregateId: visitor.id,
          data: {
            visitorId: visitor.id,
            visitorName: visitor.fullName,
            expectedArrival: visitor.expectedArrival,
            actualArrival: visitor.actualArrival,
            hostUserId: visitor.hostUserId
          },
          metadata: {
            timestamp: new Date(),
            version: 1
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to send check-in notifications', error as Error);
      // Don't throw - notifications are not critical
    }
  }
}