import { Entity } from '../base/Entity';
import { VisitorStatus, VisitorType } from '../value-objects/VisitorEnums';
import { ContactInfo } from '../value-objects/ContactInfo';

export interface VisitorProps {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  documentType?: string;
  documentNumber?: string;
  photo?: string;
  contactInfo: ContactInfo;
  visitorType: VisitorType;
  status: VisitorStatus;
  hostUserId: string;
  hostName: string;
  hostDepartment?: string;
  purpose: string;
  expectedArrival: Date;
  expectedDeparture: Date;
  actualArrival?: Date;
  actualDeparture?: Date;
  buildingId: string;
  allowedAreas: string[];
  temporaryAccessId?: string;
  badgeNumber?: string;
  vehicleInfo?: {
    licensePlate: string;
    make?: string;
    model?: string;
    color?: string;
  };
  emergencyContact?: ContactInfo;
  specialInstructions?: string;
  agreementsAccepted: {
    nda?: boolean;
    safetyBriefing?: boolean;
    dataPrivacy?: boolean;
    photoConsent?: boolean;
  };
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Visitor extends Entity<VisitorProps> {
  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  get email(): string {
    return this.props.email;
  }

  get phone(): string {
    return this.props.phone;
  }

  get company(): string | undefined {
    return this.props.company;
  }

  get documentType(): string | undefined {
    return this.props.documentType;
  }

  get documentNumber(): string | undefined {
    return this.props.documentNumber;
  }

  get photo(): string | undefined {
    return this.props.photo;
  }

  get contactInfo(): ContactInfo {
    return this.props.contactInfo;
  }

  get visitorType(): VisitorType {
    return this.props.visitorType;
  }

  get status(): VisitorStatus {
    return this.props.status;
  }

  get hostUserId(): string {
    return this.props.hostUserId;
  }

  get hostName(): string {
    return this.props.hostName;
  }

  get hostDepartment(): string | undefined {
    return this.props.hostDepartment;
  }

  get purpose(): string {
    return this.props.purpose;
  }

  get expectedArrival(): Date {
    return this.props.expectedArrival;
  }

  get expectedDeparture(): Date {
    return this.props.expectedDeparture;
  }

  get actualArrival(): Date | undefined {
    return this.props.actualArrival;
  }

  get actualDeparture(): Date | undefined {
    return this.props.actualDeparture;
  }

  get buildingId(): string {
    return this.props.buildingId;
  }

  get allowedAreas(): string[] {
    return this.props.allowedAreas;
  }

  get temporaryAccessId(): string | undefined {
    return this.props.temporaryAccessId;
  }

  get badgeNumber(): string | undefined {
    return this.props.badgeNumber;
  }

  get vehicleInfo(): VisitorProps['vehicleInfo'] {
    return this.props.vehicleInfo;
  }

  get emergencyContact(): ContactInfo | undefined {
    return this.props.emergencyContact;
  }

  get specialInstructions(): string | undefined {
    return this.props.specialInstructions;
  }

  get agreementsAccepted(): VisitorProps['agreementsAccepted'] {
    return this.props.agreementsAccepted;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  public static create(props: VisitorProps): Visitor {
    return new Visitor({
      ...props,
      id: props.id,
      status: props.status || VisitorStatus.SCHEDULED,
      agreementsAccepted: props.agreementsAccepted || {},
      allowedAreas: props.allowedAreas || [],
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    });
  }

  public preRegister(): void {
    if (this.props.status !== VisitorStatus.SCHEDULED) {
      throw new Error('Visitor must be in scheduled status to pre-register');
    }
    this.props.status = VisitorStatus.PRE_REGISTERED;
    this.props.updatedAt = new Date();
  }

  public checkIn(badgeNumber?: string): void {
    if (this.props.status === VisitorStatus.CHECKED_IN) {
      throw new Error('Visitor is already checked in');
    }
    if (this.props.status === VisitorStatus.CHECKED_OUT) {
      throw new Error('Visitor has already checked out');
    }

    this.props.status = VisitorStatus.CHECKED_IN;
    this.props.actualArrival = new Date();
    if (badgeNumber) {
      this.props.badgeNumber = badgeNumber;
    }
    this.props.updatedAt = new Date();
  }

  public checkOut(): void {
    if (this.props.status !== VisitorStatus.CHECKED_IN) {
      throw new Error('Visitor must be checked in to check out');
    }

    this.props.status = VisitorStatus.CHECKED_OUT;
    this.props.actualDeparture = new Date();
    this.props.updatedAt = new Date();
  }

  public cancel(reason?: string): void {
    if ([VisitorStatus.CHECKED_IN, VisitorStatus.CHECKED_OUT].includes(this.props.status)) {
      throw new Error('Cannot cancel visitor who has already arrived');
    }

    this.props.status = VisitorStatus.CANCELLED;
    if (reason) {
      this.addMetadata('cancellationReason', reason);
    }
    this.props.updatedAt = new Date();
  }

  public updatePhoto(photoUrl: string): void {
    this.props.photo = photoUrl;
    this.props.updatedAt = new Date();
  }

  public assignTemporaryAccess(accessId: string): void {
    this.props.temporaryAccessId = accessId;
    this.props.updatedAt = new Date();
  }

  public acceptAgreement(agreementType: keyof VisitorProps['agreementsAccepted'], accepted: boolean = true): void {
    this.props.agreementsAccepted[agreementType] = accepted;
    this.props.updatedAt = new Date();
  }

  public hasAcceptedAllRequiredAgreements(): boolean {
    const required = ['nda', 'safetyBriefing', 'dataPrivacy'];
    return required.every(agreement => 
      this.props.agreementsAccepted[agreement as keyof VisitorProps['agreementsAccepted']] === true
    );
  }

  public isExpected(): boolean {
    const now = new Date();
    const bufferMinutes = 30;
    const expectedStart = new Date(this.props.expectedArrival.getTime() - bufferMinutes * 60000);
    const expectedEnd = new Date(this.props.expectedDeparture.getTime() + bufferMinutes * 60000);
    
    return now >= expectedStart && now <= expectedEnd;
  }

  public isLate(): boolean {
    if (this.props.status !== VisitorStatus.SCHEDULED && this.props.status !== VisitorStatus.PRE_REGISTERED) {
      return false;
    }
    
    const now = new Date();
    const lateThreshold = 15; // minutes
    const lateTime = new Date(this.props.expectedArrival.getTime() + lateThreshold * 60000);
    
    return now > lateTime;
  }

  public getDuration(): number | null {
    if (!this.props.actualArrival || !this.props.actualDeparture) {
      return null;
    }
    
    return this.props.actualDeparture.getTime() - this.props.actualArrival.getTime();
  }

  public addAllowedArea(areaId: string): void {
    if (!this.props.allowedAreas.includes(areaId)) {
      this.props.allowedAreas.push(areaId);
      this.props.updatedAt = new Date();
    }
  }

  public removeAllowedArea(areaId: string): void {
    const index = this.props.allowedAreas.indexOf(areaId);
    if (index > -1) {
      this.props.allowedAreas.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  public updateVehicleInfo(vehicleInfo: VisitorProps['vehicleInfo']): void {
    this.props.vehicleInfo = vehicleInfo;
    this.props.updatedAt = new Date();
  }

  public addMetadata(key: string, value: any): void {
    if (!this.props.metadata) {
      this.props.metadata = {};
    }
    this.props.metadata[key] = value;
    this.props.updatedAt = new Date();
  }
}