import { Knex } from 'knex';
import { Role } from '../../domain/entities/Role';
import { Permission } from '../../domain/entities/Permission';
import { IRoleRepository } from '../../domain/repositories/IRoleRepository';

export class PostgresRoleRepository implements IRoleRepository {
  constructor(private db: Knex) {}

  async create(role: Role): Promise<Role> {
    const roleData = {
      id: role.id,
      name: role.name,
      description: role.description,
      is_system: role.isSystem,
      created_at: role.createdAt,
      updated_at: role.updatedAt
    };

    await this.db('roles').insert(roleData);
    return role;
  }

  async update(role: Role): Promise<Role> {
    const roleData = {
      name: role.name,
      description: role.description,
      is_system: role.isSystem,
      updated_at: new Date()
    };

    await this.db('roles')
      .where({ id: role.id })
      .update(roleData);

    return role;
  }

  async delete(id: string): Promise<void> {
    await this.db('roles')
      .where({ id })
      .del();
  }

  async findById(id: string): Promise<Role | null> {
    const roleData = await this.db('roles')
      .where({ id })
      .first();

    if (!roleData) return null;

    const permissions = await this.fetchRolePermissions(id);
    return this.mapToRole(roleData, permissions);
  }

  async findByName(name: string): Promise<Role | null> {
    const roleData = await this.db('roles')
      .where({ name })
      .first();

    if (!roleData) return null;

    const permissions = await this.fetchRolePermissions(roleData.id);
    return this.mapToRole(roleData, permissions);
  }

  async findAll(params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<{ roles: Role[]; total: number }> {
    let query = this.db('roles');
    let countQuery = this.db('roles').count('id as count');

    if (params?.search) {
      const searchTerm = `%${params.search}%`;
      query = query.where(function() {
        this.where('name', 'like', searchTerm)
          .orWhere('description', 'like', searchTerm);
      });
      
      countQuery = countQuery.where(function() {
        this.where('name', 'like', searchTerm)
          .orWhere('description', 'like', searchTerm);
      });
    }

    // Get total count
    const [{ count }] = await countQuery;
    const total = parseInt(count.toString(), 10);

    // Apply pagination
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.offset(params.offset);
    }

    query = query.orderBy('created_at', 'desc');

    const rolesData = await query;

    const roles = await Promise.all(
      rolesData.map(async (roleData) => {
        const permissions = await this.fetchRolePermissions(roleData.id);
        return this.mapToRole(roleData, permissions);
      })
    );

    return { roles, total };
  }

  async findByUserId(userId: string): Promise<Role[]> {
    const rolesData = await this.db('roles')
      .join('user_roles', 'roles.id', 'user_roles.role_id')
      .where('user_roles.user_id', userId)
      .select('roles.*');

    const roles = await Promise.all(
      rolesData.map(async (roleData) => {
        const permissions = await this.fetchRolePermissions(roleData.id);
        return this.mapToRole(roleData, permissions);
      })
    );

    return roles;
  }

  async assignToUser(userId: string, roleId: string): Promise<void> {
    await this.db('user_roles').insert({
      user_id: userId,
      role_id: roleId,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  async removeFromUser(userId: string, roleId: string): Promise<void> {
    await this.db('user_roles')
      .where({
        user_id: userId,
        role_id: roleId
      })
      .del();
  }

  async existsByName(name: string): Promise<boolean> {
    const result = await this.db('roles')
      .where({ name })
      .count('id as count')
      .first();

    return parseInt(result?.count.toString() || '0', 10) > 0;
  }

  async countRoles(): Promise<number> {
    const result = await this.db('roles')
      .count('id as count')
      .first();

    return parseInt(result?.count.toString() || '0', 10);
  }

  private async fetchRolePermissions(roleId: string): Promise<Permission[]> {
    const permissionsData = await this.db('permissions')
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .where('role_permissions.role_id', roleId)
      .select('permissions.*');

    return permissionsData.map(p => new Permission({
      id: p.id,
      name: p.name,
      description: p.description,
      resource: p.resource,
      action: p.action,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));
  }

  private mapToRole(roleData: any, permissions: Permission[]): Role {
    return new Role({
      id: roleData.id,
      name: roleData.name,
      description: roleData.description,
      isSystem: roleData.is_system,
      permissions,
      createdAt: roleData.created_at,
      updatedAt: roleData.updated_at
    });
  }
}