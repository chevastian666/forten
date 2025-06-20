import { v4 as uuidv4 } from 'uuid';
import { Role } from './Role';
import { Permission } from './Permission';

export interface UserProps {
  id?: string;
  email: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string | null;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  twoFactorSecret?: string | null;
  twoFactorEnabled: boolean;
  lastLoginAt?: Date | null;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  roles?: Role[];
}

export class User {
  private props: UserProps;

  constructor(props: UserProps) {
    this.props = {
      ...props,
      id: props.id || uuidv4(),
      isActive: props.isActive ?? true,
      isEmailVerified: props.isEmailVerified ?? false,
      twoFactorEnabled: props.twoFactorEnabled ?? false,
      failedLoginAttempts: props.failedLoginAttempts ?? 0,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get id(): string {
    return this.props.id!;
  }

  get email(): string {
    return this.props.email;
  }

  get username(): string {
    return this.props.username;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isEmailVerified(): boolean {
    return this.props.isEmailVerified;
  }

  get emailVerificationToken(): string | null | undefined {
    return this.props.emailVerificationToken;
  }

  get passwordResetToken(): string | null | undefined {
    return this.props.passwordResetToken;
  }

  get passwordResetExpires(): Date | null | undefined {
    return this.props.passwordResetExpires;
  }

  get twoFactorSecret(): string | null | undefined {
    return this.props.twoFactorSecret;
  }

  get twoFactorEnabled(): boolean {
    return this.props.twoFactorEnabled;
  }

  get lastLoginAt(): Date | null | undefined {
    return this.props.lastLoginAt;
  }

  get failedLoginAttempts(): number {
    return this.props.failedLoginAttempts;
  }

  get lockedUntil(): Date | null | undefined {
    return this.props.lockedUntil;
  }

  get createdAt(): Date {
    return this.props.createdAt!;
  }

  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  get roles(): Role[] {
    return this.props.roles || [];
  }

  // Business logic methods
  updatePassword(passwordHash: string): void {
    this.props.passwordHash = passwordHash;
    this.props.passwordResetToken = null;
    this.props.passwordResetExpires = null;
    this.updateTimestamp();
  }

  setPasswordResetToken(token: string, expiresIn: number = 3600000): void { // 1 hour default
    this.props.passwordResetToken = token;
    this.props.passwordResetExpires = new Date(Date.now() + expiresIn);
    this.updateTimestamp();
  }

  clearPasswordResetToken(): void {
    this.props.passwordResetToken = null;
    this.props.passwordResetExpires = null;
    this.updateTimestamp();
  }

  verifyEmail(): void {
    this.props.isEmailVerified = true;
    this.props.emailVerificationToken = null;
    this.updateTimestamp();
  }

  setEmailVerificationToken(token: string): void {
    this.props.emailVerificationToken = token;
    this.updateTimestamp();
  }

  enableTwoFactor(secret: string): void {
    this.props.twoFactorSecret = secret;
    this.props.twoFactorEnabled = true;
    this.updateTimestamp();
  }

  disableTwoFactor(): void {
    this.props.twoFactorSecret = null;
    this.props.twoFactorEnabled = false;
    this.updateTimestamp();
  }

  recordSuccessfulLogin(): void {
    this.props.lastLoginAt = new Date();
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;
    this.updateTimestamp();
  }

  recordFailedLogin(maxAttempts: number = 5, lockDuration: number = 1800000): void { // 30 min default
    this.props.failedLoginAttempts += 1;
    
    if (this.props.failedLoginAttempts >= maxAttempts) {
      this.props.lockedUntil = new Date(Date.now() + lockDuration);
    }
    
    this.updateTimestamp();
  }

  unlock(): void {
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;
    this.updateTimestamp();
  }

  isLocked(): boolean {
    if (!this.props.lockedUntil) return false;
    return this.props.lockedUntil > new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.updateTimestamp();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.updateTimestamp();
  }

  updateProfile(firstName: string, lastName: string): void {
    this.props.firstName = firstName;
    this.props.lastName = lastName;
    this.updateTimestamp();
  }

  setRoles(roles: Role[]): void {
    this.props.roles = roles;
    this.updateTimestamp();
  }

  hasRole(roleName: string): boolean {
    return this.roles.some(role => role.name === roleName);
  }

  hasPermission(permissionName: string): boolean {
    return this.roles.some(role => 
      role.permissions.some(permission => permission.name === permissionName)
    );
  }

  private updateTimestamp(): void {
    this.props.updatedAt = new Date();
  }

  toJSON(): UserProps {
    return { ...this.props };
  }
}