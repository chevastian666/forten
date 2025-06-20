import { Entity } from '../base/Entity';
import { AccessType, AccessStatus } from '../value-objects/AccessEnums';
import { PIN } from '../value-objects/PIN';
import { AccessPermission } from '../value-objects/AccessPermission';

export interface AccessProps {
  id?: string;
  userId: string;
  buildingId: string;
  doorIds: string[];
  pin?: PIN;
  accessType: AccessType;
  status: AccessStatus;
  permissions: AccessPermission[];
  validFrom: Date;
  validUntil?: Date;
  isTemporary: boolean;
  maxUsageCount?: number;
  currentUsageCount: number;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Access extends Entity<AccessProps> {
  get userId(): string {
    return this.props.userId;
  }

  get buildingId(): string {
    return this.props.buildingId;
  }

  get doorIds(): string[] {
    return this.props.doorIds;
  }

  get pin(): PIN | undefined {
    return this.props.pin;
  }

  get accessType(): AccessType {
    return this.props.accessType;
  }

  get status(): AccessStatus {
    return this.props.status;
  }

  get permissions(): AccessPermission[] {
    return this.props.permissions;
  }

  get validFrom(): Date {
    return this.props.validFrom;
  }

  get validUntil(): Date | undefined {
    return this.props.validUntil;
  }

  get isTemporary(): boolean {
    return this.props.isTemporary;
  }

  get maxUsageCount(): number | undefined {
    return this.props.maxUsageCount;
  }

  get currentUsageCount(): number {
    return this.props.currentUsageCount;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  public static create(props: AccessProps): Access {
    const access = new Access({
      ...props,
      id: props.id,
      currentUsageCount: props.currentUsageCount || 0,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    });

    return access;
  }

  public activate(): void {
    if (this.props.status === AccessStatus.ACTIVE) {
      throw new Error('Access is already active');
    }
    this.props.status = AccessStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  public suspend(): void {
    if (this.props.status === AccessStatus.SUSPENDED) {
      throw new Error('Access is already suspended');
    }
    this.props.status = AccessStatus.SUSPENDED;
    this.props.updatedAt = new Date();
  }

  public revoke(): void {
    if (this.props.status === AccessStatus.REVOKED) {
      throw new Error('Access is already revoked');
    }
    this.props.status = AccessStatus.REVOKED;
    this.props.updatedAt = new Date();
  }

  public expire(): void {
    this.props.status = AccessStatus.EXPIRED;
    this.props.updatedAt = new Date();
  }

  public isValid(): boolean {
    const now = new Date();
    
    // Check status
    if (this.props.status !== AccessStatus.ACTIVE) {
      return false;
    }

    // Check validity period
    if (now < this.props.validFrom) {
      return false;
    }

    if (this.props.validUntil && now > this.props.validUntil) {
      return false;
    }

    // Check usage count
    if (this.props.maxUsageCount && this.props.currentUsageCount >= this.props.maxUsageCount) {
      return false;
    }

    return true;
  }

  public canAccessDoor(doorId: string): boolean {
    return this.isValid() && this.props.doorIds.includes(doorId);
  }

  public hasPermission(permission: AccessPermission): boolean {
    return this.props.permissions.includes(permission);
  }

  public incrementUsageCount(): void {
    this.props.currentUsageCount++;
    this.props.updatedAt = new Date();

    // Auto-expire if max usage reached
    if (this.props.maxUsageCount && this.props.currentUsageCount >= this.props.maxUsageCount) {
      this.expire();
    }
  }

  public updatePIN(pin: PIN): void {
    this.props.pin = pin;
    this.props.updatedAt = new Date();
  }

  public addDoor(doorId: string): void {
    if (!this.props.doorIds.includes(doorId)) {
      this.props.doorIds.push(doorId);
      this.props.updatedAt = new Date();
    }
  }

  public removeDoor(doorId: string): void {
    const index = this.props.doorIds.indexOf(doorId);
    if (index > -1) {
      this.props.doorIds.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  public updateValidityPeriod(validFrom: Date, validUntil?: Date): void {
    this.props.validFrom = validFrom;
    this.props.validUntil = validUntil;
    this.props.updatedAt = new Date();
  }

  public addPermission(permission: AccessPermission): void {
    if (!this.props.permissions.includes(permission)) {
      this.props.permissions.push(permission);
      this.props.updatedAt = new Date();
    }
  }

  public removePermission(permission: AccessPermission): void {
    const index = this.props.permissions.indexOf(permission);
    if (index > -1) {
      this.props.permissions.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }
}