import { Knex } from 'knex';
import { User } from '../../domain/entities/User';
import { Role } from '../../domain/entities/Role';
import { Permission } from '../../domain/entities/Permission';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

export class PostgresUserRepository implements IUserRepository {
  constructor(private db: Knex) {}

  async create(user: User): Promise<User> {
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      password_hash: user.passwordHash,
      first_name: user.firstName,
      last_name: user.lastName,
      is_active: user.isActive,
      is_email_verified: user.isEmailVerified,
      email_verification_token: user.emailVerificationToken,
      password_reset_token: user.passwordResetToken,
      password_reset_expires: user.passwordResetExpires,
      two_factor_secret: user.twoFactorSecret,
      two_factor_enabled: user.twoFactorEnabled,
      last_login_at: user.lastLoginAt,
      failed_login_attempts: user.failedLoginAttempts,
      locked_until: user.lockedUntil,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    };

    await this.db('users').insert(userData);
    return user;
  }

  async update(user: User): Promise<User> {
    const userData = {
      email: user.email,
      username: user.username,
      password_hash: user.passwordHash,
      first_name: user.firstName,
      last_name: user.lastName,
      is_active: user.isActive,
      is_email_verified: user.isEmailVerified,
      email_verification_token: user.emailVerificationToken,
      password_reset_token: user.passwordResetToken,
      password_reset_expires: user.passwordResetExpires,
      two_factor_secret: user.twoFactorSecret,
      two_factor_enabled: user.twoFactorEnabled,
      last_login_at: user.lastLoginAt,
      failed_login_attempts: user.failedLoginAttempts,
      locked_until: user.lockedUntil,
      updated_at: new Date()
    };

    await this.db('users')
      .where({ id: user.id })
      .update(userData);

    return user;
  }

  async delete(id: string): Promise<void> {
    await this.db('users')
      .where({ id })
      .del();
  }

  async findById(id: string): Promise<User | null> {
    const userData = await this.db('users')
      .where({ id })
      .first();

    if (!userData) return null;

    // Fetch user roles and permissions
    const roles = await this.fetchUserRoles(id);

    return this.mapToUser(userData, roles);
  }

  async findByEmail(email: string): Promise<User | null> {
    const userData = await this.db('users')
      .where({ email })
      .first();

    if (!userData) return null;

    // Fetch user roles and permissions
    const roles = await this.fetchUserRoles(userData.id);

    return this.mapToUser(userData, roles);
  }

  async findByUsername(username: string): Promise<User | null> {
    const userData = await this.db('users')
      .where({ username })
      .first();

    if (!userData) return null;

    // Fetch user roles and permissions
    const roles = await this.fetchUserRoles(userData.id);

    return this.mapToUser(userData, roles);
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    const userData = await this.db('users')
      .where({ email_verification_token: token })
      .first();

    if (!userData) return null;

    // Fetch user roles and permissions
    const roles = await this.fetchUserRoles(userData.id);

    return this.mapToUser(userData, roles);
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    const userData = await this.db('users')
      .where({ password_reset_token: token })
      .first();

    if (!userData) return null;

    // Fetch user roles and permissions
    const roles = await this.fetchUserRoles(userData.id);

    return this.mapToUser(userData, roles);
  }

  async findAll(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    isActive?: boolean;
    roleId?: string;
  }): Promise<{ users: User[]; total: number }> {
    let query = this.db('users');
    let countQuery = this.db('users').count('id as count');

    if (params?.search) {
      const searchTerm = `%${params.search}%`;
      query = query.where(function() {
        this.where('email', 'like', searchTerm)
          .orWhere('username', 'like', searchTerm)
          .orWhere('first_name', 'like', searchTerm)
          .orWhere('last_name', 'like', searchTerm);
      });
      
      countQuery = countQuery.where(function() {
        this.where('email', 'like', searchTerm)
          .orWhere('username', 'like', searchTerm)
          .orWhere('first_name', 'like', searchTerm)
          .orWhere('last_name', 'like', searchTerm);
      });
    }

    if (params?.isActive !== undefined) {
      query = query.where('is_active', params.isActive);
      countQuery = countQuery.where('is_active', params.isActive);
    }

    if (params?.roleId) {
      query = query.join('user_roles', 'users.id', 'user_roles.user_id')
        .where('user_roles.role_id', params.roleId);
      
      countQuery = countQuery.join('user_roles', 'users.id', 'user_roles.user_id')
        .where('user_roles.role_id', params.roleId);
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

    const usersData = await query;

    // Fetch roles for each user
    const users = await Promise.all(
      usersData.map(async (userData) => {
        const roles = await this.fetchUserRoles(userData.id);
        return this.mapToUser(userData, roles);
      })
    );

    return { users, total };
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await this.db('users')
      .where({ email })
      .count('id as count')
      .first();

    return parseInt(result?.count.toString() || '0', 10) > 0;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const result = await this.db('users')
      .where({ username })
      .count('id as count')
      .first();

    return parseInt(result?.count.toString() || '0', 10) > 0;
  }

  async countActiveUsers(): Promise<number> {
    const result = await this.db('users')
      .where({ is_active: true })
      .count('id as count')
      .first();

    return parseInt(result?.count.toString() || '0', 10);
  }

  private async fetchUserRoles(userId: string): Promise<Role[]> {
    const rolesData = await this.db('roles')
      .join('user_roles', 'roles.id', 'user_roles.role_id')
      .where('user_roles.user_id', userId)
      .select('roles.*');

    const roles = await Promise.all(
      rolesData.map(async (roleData) => {
        // Fetch permissions for each role
        const permissionsData = await this.db('permissions')
          .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
          .where('role_permissions.role_id', roleData.id)
          .select('permissions.*');

        const permissions = permissionsData.map(p => new Permission({
          id: p.id,
          name: p.name,
          description: p.description,
          resource: p.resource,
          action: p.action,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }));

        return new Role({
          id: roleData.id,
          name: roleData.name,
          description: roleData.description,
          isSystem: roleData.is_system,
          permissions,
          createdAt: roleData.created_at,
          updatedAt: roleData.updated_at
        });
      })
    );

    return roles;
  }

  private mapToUser(userData: any, roles: Role[]): User {
    return new User({
      id: userData.id,
      email: userData.email,
      username: userData.username,
      passwordHash: userData.password_hash,
      firstName: userData.first_name,
      lastName: userData.last_name,
      isActive: userData.is_active,
      isEmailVerified: userData.is_email_verified,
      emailVerificationToken: userData.email_verification_token,
      passwordResetToken: userData.password_reset_token,
      passwordResetExpires: userData.password_reset_expires,
      twoFactorSecret: userData.two_factor_secret,
      twoFactorEnabled: userData.two_factor_enabled,
      lastLoginAt: userData.last_login_at,
      failedLoginAttempts: userData.failed_login_attempts,
      lockedUntil: userData.locked_until,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
      roles
    });
  }
}