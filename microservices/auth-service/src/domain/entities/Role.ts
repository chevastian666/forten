import { v4 as uuidv4 } from 'uuid';
import { Permission } from './Permission';

export interface RoleProps {
  id?: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions?: Permission[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class Role {
  private props: RoleProps;

  constructor(props: RoleProps) {
    this.props = {
      ...props,
      id: props.id || uuidv4(),
      isSystem: props.isSystem ?? false,
      permissions: props.permissions || [],
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get id(): string {
    return this.props.id!;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get isSystem(): boolean {
    return this.props.isSystem;
  }

  get permissions(): Permission[] {
    return this.props.permissions || [];
  }

  get createdAt(): Date {
    return this.props.createdAt!;
  }

  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  // Business logic methods
  updateName(name: string): void {
    if (this.props.isSystem) {
      throw new Error('Cannot update system role name');
    }
    this.props.name = name;
    this.updateTimestamp();
  }

  updateDescription(description: string): void {
    this.props.description = description;
    this.updateTimestamp();
  }

  addPermission(permission: Permission): void {
    if (this.hasPermission(permission.name)) {
      throw new Error(`Role already has permission: ${permission.name}`);
    }
    this.props.permissions!.push(permission);
    this.updateTimestamp();
  }

  removePermission(permissionName: string): void {
    if (this.props.isSystem) {
      throw new Error('Cannot remove permissions from system role');
    }
    
    const index = this.props.permissions!.findIndex(p => p.name === permissionName);
    if (index === -1) {
      throw new Error(`Permission not found: ${permissionName}`);
    }
    
    this.props.permissions!.splice(index, 1);
    this.updateTimestamp();
  }

  setPermissions(permissions: Permission[]): void {
    if (this.props.isSystem) {
      throw new Error('Cannot modify permissions of system role');
    }
    this.props.permissions = permissions;
    this.updateTimestamp();
  }

  hasPermission(permissionName: string): boolean {
    return this.permissions.some(p => p.name === permissionName);
  }

  private updateTimestamp(): void {
    this.props.updatedAt = new Date();
  }

  toJSON(): RoleProps {
    return { ...this.props };
  }

  // Static factory methods for common roles
  static createAdminRole(): Role {
    return new Role({
      name: 'admin',
      description: 'System administrator with full access',
      isSystem: true,
    });
  }

  static createUserRole(): Role {
    return new Role({
      name: 'user',
      description: 'Regular user with basic access',
      isSystem: true,
    });
  }

  static createManagerRole(): Role {
    return new Role({
      name: 'manager',
      description: 'Manager with elevated permissions',
      isSystem: true,
    });
  }
}