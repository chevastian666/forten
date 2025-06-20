export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  familyId: string;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  parentId?: string; // ID del token anterior en la cadena
  childId?: string;  // ID del siguiente token en la cadena
  userAgent?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  expiresAt: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum RevokeReason {
  EXPIRED = 'expired',
  ROTATED = 'rotated',
  LOGOUT = 'logout',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  FAMILY_COMPROMISED = 'family_compromised',
  USER_REQUEST = 'user_request',
  ADMIN_ACTION = 'admin_action'
}

export class RefreshTokenEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly token: string,
    public readonly familyId: string,
    public readonly expiresAt: Date,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
    public isRevoked: boolean = false,
    public revokedAt?: Date,
    public revokedReason?: string,
    public parentId?: string,
    public childId?: string,
    public userAgent?: string,
    public ipAddress?: string,
    public deviceFingerprint?: string,
    public lastUsedAt?: Date
  ) {}

  revoke(reason: RevokeReason): void {
    this.isRevoked = true;
    this.revokedAt = new Date();
    this.revokedReason = reason;
  }

  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  isValid(): boolean {
    return !this.isRevoked && !this.isExpired();
  }

  wasRecentlyUsed(windowMinutes: number = 5): boolean {
    if (!this.lastUsedAt) return false;
    const window = windowMinutes * 60 * 1000;
    return (new Date().getTime() - this.lastUsedAt.getTime()) < window;
  }

  belongsToFamily(familyId: string): boolean {
    return this.familyId === familyId;
  }

  updateLastUsed(): void {
    this.lastUsedAt = new Date();
    this.updatedAt = new Date();
  }
}