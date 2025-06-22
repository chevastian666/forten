import { Permission } from '../entities/Permission';

export interface IPermissionRepository {
  create(permission: Permission): Promise<Permission>;
  update(permission: Permission): Promise<Permission>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Permission | null>;
  findByName(name: string): Promise<Permission | null>;
  findAll(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    resource?: string;
    action?: string;
  }): Promise<{ permissions: Permission[]; total: number }>;
  findByRoleId(roleId: string): Promise<Permission[]>;
  assignToRole(roleId: string, permissionId: string): Promise<void>;
  removeFromRole(roleId: string, permissionId: string): Promise<void>;
  existsByName(name: string): Promise<boolean>;
  findByResourceAndAction(resource: string, action: string): Promise<Permission | null>;
}