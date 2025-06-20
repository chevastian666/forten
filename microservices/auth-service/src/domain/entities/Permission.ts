import { v4 as uuidv4 } from 'uuid';

export interface PermissionProps {
  id?: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Permission {
  private props: PermissionProps;

  constructor(props: PermissionProps) {
    this.props = {
      ...props,
      id: props.id || uuidv4(),
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

  get resource(): string {
    return this.props.resource;
  }

  get action(): string {
    return this.props.action;
  }

  get createdAt(): Date {
    return this.props.createdAt!;
  }

  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  // Business logic methods
  updateDescription(description: string): void {
    this.props.description = description;
    this.updateTimestamp();
  }

  matches(resource: string, action: string): boolean {
    const resourceMatches = this.matchesPattern(resource, this.props.resource);
    const actionMatches = this.matchesPattern(action, this.props.action);
    return resourceMatches && actionMatches;
  }

  private matchesPattern(value: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === value) return true;
    
    // Support wildcard patterns like "users:*" or "*:read"
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(value);
  }

  private updateTimestamp(): void {
    this.props.updatedAt = new Date();
  }

  toJSON(): PermissionProps {
    return { ...this.props };
  }

  // Static factory methods for common permissions
  static createPermission(resource: string, action: string): Permission {
    return new Permission({
      name: `${resource}:${action}`,
      description: `${action} permission for ${resource}`,
      resource,
      action,
    });
  }

  // Common permission templates
  static readonly COMMON_PERMISSIONS = {
    // User permissions
    USERS_CREATE: { resource: 'users', action: 'create' },
    USERS_READ: { resource: 'users', action: 'read' },
    USERS_UPDATE: { resource: 'users', action: 'update' },
    USERS_DELETE: { resource: 'users', action: 'delete' },
    USERS_LIST: { resource: 'users', action: 'list' },
    
    // Role permissions
    ROLES_CREATE: { resource: 'roles', action: 'create' },
    ROLES_READ: { resource: 'roles', action: 'read' },
    ROLES_UPDATE: { resource: 'roles', action: 'update' },
    ROLES_DELETE: { resource: 'roles', action: 'delete' },
    ROLES_LIST: { resource: 'roles', action: 'list' },
    
    // Permission management
    PERMISSIONS_ASSIGN: { resource: 'permissions', action: 'assign' },
    PERMISSIONS_REVOKE: { resource: 'permissions', action: 'revoke' },
    PERMISSIONS_LIST: { resource: 'permissions', action: 'list' },
    
    // System permissions
    SYSTEM_ADMIN: { resource: '*', action: '*' },
    SYSTEM_AUDIT: { resource: 'audit', action: 'read' },
    SYSTEM_CONFIG: { resource: 'config', action: 'manage' },
  };
}