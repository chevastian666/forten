import { Entity } from '../base/Entity';
import { AccessResult, AccessMethod } from '../value-objects/AccessEnums';

export interface AccessLogProps {
  id?: string;
  accessId?: string;
  userId?: string;
  visitorId?: string;
  buildingId: string;
  doorId: string;
  accessMethod: AccessMethod;
  accessResult: AccessResult;
  timestamp: Date;
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

export class AccessLog extends Entity<AccessLogProps> {
  get accessId(): string | undefined {
    return this.props.accessId;
  }

  get userId(): string | undefined {
    return this.props.userId;
  }

  get visitorId(): string | undefined {
    return this.props.visitorId;
  }

  get buildingId(): string {
    return this.props.buildingId;
  }

  get doorId(): string {
    return this.props.doorId;
  }

  get accessMethod(): AccessMethod {
    return this.props.accessMethod;
  }

  get accessResult(): AccessResult {
    return this.props.accessResult;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get pin(): string | undefined {
    return this.props.pin;
  }

  get cardNumber(): string | undefined {
    return this.props.cardNumber;
  }

  get biometricData(): string | undefined {
    return this.props.biometricData;
  }

  get failureReason(): string | undefined {
    return this.props.failureReason;
  }

  get ipAddress(): string | undefined {
    return this.props.ipAddress;
  }

  get deviceInfo(): Record<string, any> | undefined {
    return this.props.deviceInfo;
  }

  get location(): { latitude: number; longitude: number } | undefined {
    return this.props.location;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  public static create(props: AccessLogProps): AccessLog {
    return new AccessLog({
      ...props,
      id: props.id,
      timestamp: props.timestamp || new Date()
    });
  }

  public static createSuccessLog(
    buildingId: string,
    doorId: string,
    accessMethod: AccessMethod,
    entityId: string,
    entityType: 'user' | 'visitor',
    additionalProps?: Partial<AccessLogProps>
  ): AccessLog {
    const props: AccessLogProps = {
      buildingId,
      doorId,
      accessMethod,
      accessResult: AccessResult.SUCCESS,
      timestamp: new Date(),
      ...(entityType === 'user' ? { userId: entityId } : { visitorId: entityId }),
      ...additionalProps
    };

    return AccessLog.create(props);
  }

  public static createFailureLog(
    buildingId: string,
    doorId: string,
    accessMethod: AccessMethod,
    failureReason: string,
    additionalProps?: Partial<AccessLogProps>
  ): AccessLog {
    const props: AccessLogProps = {
      buildingId,
      doorId,
      accessMethod,
      accessResult: AccessResult.DENIED,
      failureReason,
      timestamp: new Date(),
      ...additionalProps
    };

    return AccessLog.create(props);
  }

  public isSuccess(): boolean {
    return this.props.accessResult === AccessResult.SUCCESS;
  }

  public isDenied(): boolean {
    return this.props.accessResult === AccessResult.DENIED;
  }

  public isEmergency(): boolean {
    return this.props.accessResult === AccessResult.EMERGENCY;
  }

  public getEntityType(): 'user' | 'visitor' | 'unknown' {
    if (this.props.userId) return 'user';
    if (this.props.visitorId) return 'visitor';
    return 'unknown';
  }

  public getEntityId(): string | undefined {
    return this.props.userId || this.props.visitorId;
  }

  public addMetadata(key: string, value: any): void {
    if (!this.props.metadata) {
      this.props.metadata = {};
    }
    this.props.metadata[key] = value;
  }

  public toAuditFormat(): Record<string, any> {
    return {
      id: this.id,
      entityType: this.getEntityType(),
      entityId: this.getEntityId(),
      building: this.props.buildingId,
      door: this.props.doorId,
      method: this.props.accessMethod,
      result: this.props.accessResult,
      timestamp: this.props.timestamp.toISOString(),
      failureReason: this.props.failureReason,
      ipAddress: this.props.ipAddress,
      location: this.props.location,
      metadata: this.props.metadata
    };
  }
}