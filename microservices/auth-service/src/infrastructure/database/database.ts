import knex, { Knex } from 'knex';
import Redis from 'ioredis';

export class Database {
  private static instance: Database;
  private _knex: Knex | null = null;
  private _redis: Redis | null = null;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  get knex(): Knex {
    if (!this._knex) {
      this._knex = knex({
        client: 'postgresql',
        connection: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_NAME || 'forten_auth',
        },
        migrations: {
          directory: './src/infrastructure/database/migrations',
          extension: 'ts'
        },
        pool: {
          min: 2,
          max: 10
        },
        acquireConnectionTimeout: 30000,
        debug: process.env.NODE_ENV === 'development'
      });
    }
    return this._knex;
  }

  get redis(): Redis {
    if (!this._redis) {
      const redisUrl = process.env.REDIS_URL;
      
      if (redisUrl) {
        this._redis = new Redis(redisUrl);
      } else {
        this._redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
          retryDelayOnFailover: 100,
          lazyConnect: true
        });
      }
    }
    return this._redis;
  }

  async connect(): Promise<void> {
    try {
      // Test PostgreSQL connection
      await this.knex.raw('SELECT 1');
      console.log('✅ PostgreSQL connected');

      // Test Redis connection
      await this.redis.ping();
      console.log('✅ Redis connected');

      // Run migrations
      await this.runMigrations();
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this._knex) {
      await this._knex.destroy();
      this._knex = null;
    }

    if (this._redis) {
      this._redis.disconnect();
      this._redis = null;
    }
  }

  private async runMigrations(): Promise<void> {
    try {
      await this.knex.migrate.latest();
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async seed(): Promise<void> {
    try {
      // Check if default roles exist
      const adminRole = await this.knex('roles').where('name', 'admin').first();
      
      if (!adminRole) {
        await this.seedDefaultRoles();
        await this.seedDefaultPermissions();
        await this.seedRolePermissions();
        console.log('✅ Database seeded with default data');
      }
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  private async seedDefaultRoles(): Promise<void> {
    const roles = [
      {
        id: 'admin-role-id',
        name: 'admin',
        description: 'System administrator with full access',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'manager-role-id',
        name: 'manager',
        description: 'Manager with elevated permissions',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'user-role-id',
        name: 'user',
        description: 'Regular user with basic access',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await this.knex('roles').insert(roles);
  }

  private async seedDefaultPermissions(): Promise<void> {
    const permissions = [
      // System permissions
      { id: 'perm-1', name: 'system:admin', description: 'Full system access', resource: '*', action: '*' },
      
      // User permissions
      { id: 'perm-2', name: 'users:create', description: 'Create users', resource: 'users', action: 'create' },
      { id: 'perm-3', name: 'users:read', description: 'Read users', resource: 'users', action: 'read' },
      { id: 'perm-4', name: 'users:update', description: 'Update users', resource: 'users', action: 'update' },
      { id: 'perm-5', name: 'users:delete', description: 'Delete users', resource: 'users', action: 'delete' },
      { id: 'perm-6', name: 'users:list', description: 'List users', resource: 'users', action: 'list' },
      
      // Role permissions
      { id: 'perm-7', name: 'roles:create', description: 'Create roles', resource: 'roles', action: 'create' },
      { id: 'perm-8', name: 'roles:read', description: 'Read roles', resource: 'roles', action: 'read' },
      { id: 'perm-9', name: 'roles:update', description: 'Update roles', resource: 'roles', action: 'update' },
      { id: 'perm-10', name: 'roles:delete', description: 'Delete roles', resource: 'roles', action: 'delete' },
      { id: 'perm-11', name: 'roles:list', description: 'List roles', resource: 'roles', action: 'list' },
      
      // Permission management
      { id: 'perm-12', name: 'permissions:assign', description: 'Assign permissions', resource: 'permissions', action: 'assign' },
      { id: 'perm-13', name: 'permissions:revoke', description: 'Revoke permissions', resource: 'permissions', action: 'revoke' },
      { id: 'perm-14', name: 'permissions:list', description: 'List permissions', resource: 'permissions', action: 'list' },
      
      // Profile permissions
      { id: 'perm-15', name: 'profile:read', description: 'Read own profile', resource: 'profile', action: 'read' },
      { id: 'perm-16', name: 'profile:update', description: 'Update own profile', resource: 'profile', action: 'update' }
    ];

    const permissionsWithTimestamps = permissions.map(p => ({
      ...p,
      created_at: new Date(),
      updated_at: new Date()
    }));

    await this.knex('permissions').insert(permissionsWithTimestamps);
  }

  private async seedRolePermissions(): Promise<void> {
    // Admin role gets all permissions
    const allPermissions = await this.knex('permissions').select('id');
    const adminRolePermissions = allPermissions.map(p => ({
      role_id: 'admin-role-id',
      permission_id: p.id
    }));

    // Manager role gets user and role management permissions
    const managerPermissions = [
      'perm-2', 'perm-3', 'perm-4', 'perm-6', // user permissions except delete
      'perm-8', 'perm-9', 'perm-11', // role permissions except create/delete
      'perm-14', // list permissions
      'perm-15', 'perm-16' // profile permissions
    ];
    const managerRolePermissions = managerPermissions.map(permId => ({
      role_id: 'manager-role-id',
      permission_id: permId
    }));

    // User role gets basic permissions
    const userPermissions = ['perm-15', 'perm-16']; // profile permissions only
    const userRolePermissions = userPermissions.map(permId => ({
      role_id: 'user-role-id',
      permission_id: permId
    }));

    await this.knex('role_permissions').insert([
      ...adminRolePermissions,
      ...managerRolePermissions,
      ...userRolePermissions
    ]);
  }
}