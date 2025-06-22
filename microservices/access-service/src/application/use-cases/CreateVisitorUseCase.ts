import { IVisitorRepository } from '../../domain/repositories/IVisitorRepository';
import { IAccessRepository } from '../../domain/repositories/IAccessRepository';
import { Visitor } from '../../domain/entities/Visitor';
import { Access } from '../../domain/entities/Access';
import { ContactInfo } from '../../domain/value-objects/ContactInfo';
import { VisitorType, VisitorStatus } from '../../domain/value-objects/VisitorEnums';
import { AccessType, AccessStatus } from '../../domain/value-objects/AccessEnums';
import { AccessPermission } from '../../domain/value-objects/AccessPermission';
import { PIN } from '../../domain/value-objects/PIN';
import { IEventBus } from '../services/IEventBus';
import { ILogger } from '../services/ILogger';
import { INotificationService } from '../services/INotificationService';

export interface CreateVisitorInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  documentType?: string;
  documentNumber?: string;
  visitorType: VisitorType;
  hostUserId: string;
  hostName: string;
  hostDepartment?: string;
  purpose: string;
  expectedArrival: Date;
  expectedDeparture: Date;
  buildingId: string;
  allowedAreas: string[];
  doorIds: string[];
  vehicleInfo?: {
    licensePlate: string;
    make?: string;
    model?: string;
    color?: string;
  };
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  specialInstructions?: string;
  sendNotifications: boolean;
}

export interface CreateVisitorOutput {
  visitorId: string;
  accessId: string;
  pin: string;
  badgeNumber?: string;
  qrCode?: string;
}

export class CreateVisitorUseCase {
  constructor(
    private readonly visitorRepository: IVisitorRepository,
    private readonly accessRepository: IAccessRepository,
    private readonly notificationService: INotificationService,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async execute(input: CreateVisitorInput): Promise<CreateVisitorOutput> {
    try {
      this.logger.info('Creating visitor', { email: input.email, host: input.hostUserId });

      // Check for existing visitor
      const existingVisitors = await this.visitorRepository.findByEmail(input.email);
      const scheduledVisitor = existingVisitors.find(v => 
        v.status === VisitorStatus.SCHEDULED && 
        v.expectedArrival.toDateString() === input.expectedArrival.toDateString()
      );

      if (scheduledVisitor) {
        throw new Error('Visitor already scheduled for this date');
      }

      // Create contact info
      const contactInfo = new ContactInfo(
        `${input.firstName} ${input.lastName}`,
        input.phone,
        input.email
      );

      let emergencyContact: ContactInfo | undefined;
      if (input.emergencyContactName && input.emergencyContactPhone) {
        emergencyContact = new ContactInfo(
          input.emergencyContactName,
          input.emergencyContactPhone
        );
      }

      // Create visitor entity
      const visitor = Visitor.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        company: input.company,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        contactInfo,
        visitorType: input.visitorType,
        status: VisitorStatus.SCHEDULED,
        hostUserId: input.hostUserId,
        hostName: input.hostName,
        hostDepartment: input.hostDepartment,
        purpose: input.purpose,
        expectedArrival: input.expectedArrival,
        expectedDeparture: input.expectedDeparture,
        buildingId: input.buildingId,
        allowedAreas: input.allowedAreas,
        vehicleInfo: input.vehicleInfo,
        emergencyContact,
        specialInstructions: input.specialInstructions,
        agreementsAccepted: {}
      });

      // Save visitor
      const savedVisitor = await this.visitorRepository.create(visitor);

      // Generate temporary access
      const validityHours = Math.ceil(
        (input.expectedDeparture.getTime() - input.expectedArrival.getTime()) / (1000 * 60 * 60)
      );
      
      const pin = PIN.generateTemporary(6, validityHours + 2); // Add 2 hours buffer

      const access = Access.create({
        userId: savedVisitor.id,
        buildingId: input.buildingId,
        doorIds: input.doorIds,
        pin,
        accessType: AccessType.VISITOR,
        status: AccessStatus.ACTIVE,
        permissions: [AccessPermission.ENTER, AccessPermission.EXIT],
        validFrom: new Date(input.expectedArrival.getTime() - 30 * 60000), // 30 min before
        validUntil: new Date(input.expectedDeparture.getTime() + 60 * 60000), // 1 hour after
        isTemporary: true,
        currentUsageCount: 0,
        createdBy: input.hostUserId,
        metadata: {
          visitorId: savedVisitor.id,
          hostUserId: input.hostUserId
        }
      });

      const savedAccess = await this.accessRepository.create(access);

      // Update visitor with access ID
      savedVisitor.assignTemporaryAccess(savedAccess.id);
      await this.visitorRepository.update(savedVisitor);

      // Generate badge number (could be more sophisticated)
      const badgeNumber = `V${Date.now().toString().slice(-6)}`;

      // Publish event
      await this.eventBus.publish({
        type: 'VISITOR_CREATED',
        aggregateId: savedVisitor.id,
        data: {
          visitorId: savedVisitor.id,
          accessId: savedAccess.id,
          hostUserId: input.hostUserId,
          expectedArrival: input.expectedArrival,
          buildingId: input.buildingId
        },
        metadata: {
          timestamp: new Date(),
          version: 1
        }
      });

      // Send notifications if requested
      if (input.sendNotifications) {
        await this.sendVisitorNotifications(savedVisitor, pin.getValue(), badgeNumber);
        await this.sendHostNotification(savedVisitor);
      }

      this.logger.info('Visitor created successfully', { 
        visitorId: savedVisitor.id, 
        accessId: savedAccess.id 
      });

      return {
        visitorId: savedVisitor.id,
        accessId: savedAccess.id,
        pin: pin.getValue(),
        badgeNumber,
        qrCode: await this.generateQRCode(savedVisitor.id, savedAccess.id)
      };
    } catch (error) {
      this.logger.error('Failed to create visitor', error as Error, input);
      throw error;
    }
  }

  private async sendVisitorNotifications(
    visitor: Visitor,
    pin: string,
    badgeNumber: string
  ): Promise<void> {
    try {
      await this.notificationService.sendEmail({
        to: visitor.email,
        subject: 'Your Visit Confirmation',
        template: 'visitor-confirmation',
        data: {
          visitorName: visitor.fullName,
          hostName: visitor.hostName,
          expectedArrival: visitor.expectedArrival,
          expectedDeparture: visitor.expectedDeparture,
          buildingAddress: 'Building address here', // Would fetch from building repository
          pin,
          badgeNumber,
          specialInstructions: visitor.specialInstructions
        }
      });

      await this.notificationService.sendSMS({
        to: visitor.phone,
        message: `Your access PIN for your visit on ${visitor.expectedArrival.toLocaleDateString()} is: ${pin}. Badge: ${badgeNumber}`
      });
    } catch (error) {
      this.logger.error('Failed to send visitor notifications', error as Error);
      // Don't throw - notifications are not critical
    }
  }

  private async sendHostNotification(visitor: Visitor): Promise<void> {
    try {
      await this.notificationService.sendEmail({
        to: visitor.hostUserId, // Would need to fetch host email
        subject: 'Visitor Scheduled',
        template: 'host-visitor-scheduled',
        data: {
          visitorName: visitor.fullName,
          company: visitor.company,
          expectedArrival: visitor.expectedArrival,
          purpose: visitor.purpose
        }
      });
    } catch (error) {
      this.logger.error('Failed to send host notification', error as Error);
      // Don't throw - notifications are not critical
    }
  }

  private async generateQRCode(visitorId: string, accessId: string): Promise<string> {
    // QR code generation logic would go here
    // For now, return a placeholder
    return `qr:${visitorId}:${accessId}`;
  }
}