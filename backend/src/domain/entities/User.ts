export type UserRole = 'admin' | 'supervisor' | 'operator' | 'technician';

export interface IUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  refreshToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User implements IUser {
  constructor(
    public id: string,
    public email: string,
    public password: string,
    public firstName: string,
    public lastName: string,
    public role: UserRole,
    public isActive: boolean = true,
    public lastLogin?: Date,
    public refreshToken?: string | null,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  canAccessBuilding(buildingId: string): boolean {
    // Business logic for access control
    return this.isActive && ['admin', 'supervisor', 'operator'].includes(this.role);
  }

  canManageBuildings(): boolean {
    return this.isActive && ['admin', 'supervisor'].includes(this.role);
  }

  canManageUsers(): boolean {
    return this.isActive && this.role === 'admin';
  }
}