// Base repository class for common database operations

import { Logger } from '../logger';
import { NotFoundError, DatabaseError } from '../errors';
import { PaginationParams, PaginatedResponse, FilterParams } from '../types';

// Base entity interface
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Repository options
export interface RepositoryOptions {
  logger?: Logger;
  softDelete?: boolean;
}

// Query options
export interface QueryOptions {
  select?: string[];
  populate?: string[];
  lean?: boolean;
}

// Update options
export interface UpdateOptions {
  upsert?: boolean;
  returnNew?: boolean;
}

// Abstract base repository class
export abstract class BaseRepository<T extends BaseEntity> {
  protected abstract entityName: string;
  protected logger?: Logger;
  protected softDelete: boolean;

  constructor(options: RepositoryOptions = {}) {
    this.logger = options.logger;
    this.softDelete = options.softDelete ?? false;
  }

  // Abstract methods to be implemented by concrete repositories
  protected abstract _findById(id: string, options?: QueryOptions): Promise<T | null>;
  protected abstract _findOne(filter: any, options?: QueryOptions): Promise<T | null>;
  protected abstract _findMany(filter: any, options?: QueryOptions): Promise<T[]>;
  protected abstract _create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  protected abstract _update(id: string, data: Partial<T>, options?: UpdateOptions): Promise<T | null>;
  protected abstract _delete(id: string): Promise<boolean>;
  protected abstract _count(filter: any): Promise<number>;

  // Find by ID
  async findById(id: string, options?: QueryOptions): Promise<T> {
    try {
      const startTime = Date.now();
      const entity = await this._findById(id, options);
      
      if (!entity) {
        throw new NotFoundError(`${this.entityName} with ID ${id} not found`);
      }

      const duration = Date.now() - startTime;
      this.logger?.logQuery('findById', this.entityName, duration, { id });

      return entity;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      this.logger?.error(`Failed to find ${this.entityName} by ID`, error as Error, { id });
      throw new DatabaseError(`Failed to find ${this.entityName}`);
    }
  }

  // Find by ID (returns null if not found)
  async findByIdOrNull(id: string, options?: QueryOptions): Promise<T | null> {
    try {
      const startTime = Date.now();
      const entity = await this._findById(id, options);
      
      const duration = Date.now() - startTime;
      this.logger?.logQuery('findById', this.entityName, duration, { id });

      return entity;
    } catch (error) {
      this.logger?.error(`Failed to find ${this.entityName} by ID`, error as Error, { id });
      throw new DatabaseError(`Failed to find ${this.entityName}`);
    }
  }

  // Find one by filter
  async findOne(filter: any, options?: QueryOptions): Promise<T | null> {
    try {
      const startTime = Date.now();
      const entity = await this._findOne(filter, options);
      
      const duration = Date.now() - startTime;
      this.logger?.logQuery('findOne', this.entityName, duration, { filter });

      return entity;
    } catch (error) {
      this.logger?.error(`Failed to find ${this.entityName}`, error as Error, { filter });
      throw new DatabaseError(`Failed to find ${this.entityName}`);
    }
  }

  // Find many by filter
  async findMany(filter: any = {}, options?: QueryOptions): Promise<T[]> {
    try {
      const startTime = Date.now();
      const entities = await this._findMany(filter, options);
      
      const duration = Date.now() - startTime;
      this.logger?.logQuery('findMany', this.entityName, duration, { 
        filter, 
        count: entities.length 
      });

      return entities;
    } catch (error) {
      this.logger?.error(`Failed to find ${this.entityName} entities`, error as Error, { filter });
      throw new DatabaseError(`Failed to find ${this.entityName} entities`);
    }
  }

  // Find with pagination
  async findPaginated(
    filter: any = {},
    pagination: PaginationParams,
    options?: QueryOptions
  ): Promise<PaginatedResponse<T>> {
    try {
      const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const skip = (page - 1) * limit;

      const startTime = Date.now();
      
      // Get total count and data in parallel
      const [total, data] = await Promise.all([
        this._count(filter),
        this._findMany(
          filter,
          {
            ...options,
            skip,
            limit,
            sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
          } as any
        ),
      ]);

      const duration = Date.now() - startTime;
      this.logger?.logQuery('findPaginated', this.entityName, duration, {
        filter,
        page,
        limit,
        total,
      });

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger?.error(`Failed to find paginated ${this.entityName}`, error as Error);
      throw new DatabaseError(`Failed to find paginated ${this.entityName}`);
    }
  }

  // Create entity
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      const startTime = Date.now();
      const entity = await this._create(data);
      
      const duration = Date.now() - startTime;
      this.logger?.logQuery('create', this.entityName, duration, { id: entity.id });
      
      this.logger?.info(`${this.entityName} created`, { id: entity.id });

      return entity;
    } catch (error) {
      this.logger?.error(`Failed to create ${this.entityName}`, error as Error);
      throw new DatabaseError(`Failed to create ${this.entityName}`);
    }
  }

  // Create many entities
  async createMany(dataArray: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T[]> {
    try {
      const startTime = Date.now();
      const entities = await Promise.all(dataArray.map(data => this._create(data)));
      
      const duration = Date.now() - startTime;
      this.logger?.logQuery('createMany', this.entityName, duration, { 
        count: entities.length 
      });
      
      this.logger?.info(`${entities.length} ${this.entityName} entities created`);

      return entities;
    } catch (error) {
      this.logger?.error(`Failed to create multiple ${this.entityName}`, error as Error);
      throw new DatabaseError(`Failed to create multiple ${this.entityName}`);
    }
  }

  // Update entity
  async update(
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>,
    options?: UpdateOptions
  ): Promise<T> {
    try {
      const startTime = Date.now();
      const entity = await this._update(id, data as Partial<T>, options);
      
      if (!entity) {
        throw new NotFoundError(`${this.entityName} with ID ${id} not found`);
      }

      const duration = Date.now() - startTime;
      this.logger?.logQuery('update', this.entityName, duration, { id });
      
      this.logger?.info(`${this.entityName} updated`, { id });

      return entity;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      this.logger?.error(`Failed to update ${this.entityName}`, error as Error, { id });
      throw new DatabaseError(`Failed to update ${this.entityName}`);
    }
  }

  // Update many entities
  async updateMany(filter: any, data: Partial<T>): Promise<number> {
    try {
      const startTime = Date.now();
      const entities = await this._findMany(filter);
      
      await Promise.all(
        entities.map(entity => this._update(entity.id, data))
      );

      const duration = Date.now() - startTime;
      this.logger?.logQuery('updateMany', this.entityName, duration, { 
        filter, 
        count: entities.length 
      });
      
      this.logger?.info(`${entities.length} ${this.entityName} entities updated`);

      return entities.length;
    } catch (error) {
      this.logger?.error(`Failed to update multiple ${this.entityName}`, error as Error);
      throw new DatabaseError(`Failed to update multiple ${this.entityName}`);
    }
  }

  // Delete entity
  async delete(id: string): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      if (this.softDelete) {
        await this._update(id, { deletedAt: new Date() } as any);
      } else {
        const deleted = await this._delete(id);
        if (!deleted) {
          throw new NotFoundError(`${this.entityName} with ID ${id} not found`);
        }
      }

      const duration = Date.now() - startTime;
      this.logger?.logQuery('delete', this.entityName, duration, { id });
      
      this.logger?.info(`${this.entityName} deleted`, { id, softDelete: this.softDelete });

      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      this.logger?.error(`Failed to delete ${this.entityName}`, error as Error, { id });
      throw new DatabaseError(`Failed to delete ${this.entityName}`);
    }
  }

  // Delete many entities
  async deleteMany(filter: any): Promise<number> {
    try {
      const startTime = Date.now();
      const entities = await this._findMany(filter);
      
      await Promise.all(
        entities.map(entity => this.delete(entity.id))
      );

      const duration = Date.now() - startTime;
      this.logger?.logQuery('deleteMany', this.entityName, duration, { 
        filter, 
        count: entities.length 
      });
      
      this.logger?.info(`${entities.length} ${this.entityName} entities deleted`);

      return entities.length;
    } catch (error) {
      this.logger?.error(`Failed to delete multiple ${this.entityName}`, error as Error);
      throw new DatabaseError(`Failed to delete multiple ${this.entityName}`);
    }
  }

  // Count entities
  async count(filter: any = {}): Promise<number> {
    try {
      const startTime = Date.now();
      const count = await this._count(filter);
      
      const duration = Date.now() - startTime;
      this.logger?.logQuery('count', this.entityName, duration, { filter, count });

      return count;
    } catch (error) {
      this.logger?.error(`Failed to count ${this.entityName}`, error as Error);
      throw new DatabaseError(`Failed to count ${this.entityName}`);
    }
  }

  // Check if entity exists
  async exists(filter: any): Promise<boolean> {
    const count = await this.count(filter);
    return count > 0;
  }

  // Transaction support (to be implemented by concrete repositories)
  async transaction<R>(fn: () => Promise<R>): Promise<R> {
    throw new Error('Transaction support not implemented for this repository');
  }

  // Build filter from common parameters
  protected buildFilter(params: FilterParams): any {
    const filter: any = {};

    if (params.search) {
      // To be implemented by concrete repositories based on searchable fields
    }

    if (params.dateFrom || params.dateTo) {
      filter.createdAt = {};
      if (params.dateFrom) {
        filter.createdAt.$gte = params.dateFrom;
      }
      if (params.dateTo) {
        filter.createdAt.$lte = params.dateTo;
      }
    }

    if (params.status) {
      filter.status = params.status;
    }

    if (params.assignedTo) {
      filter.assignedTo = params.assignedTo;
    }

    if (params.tags && params.tags.length > 0) {
      filter.tags = { $in: params.tags };
    }

    if (this.softDelete) {
      filter.deletedAt = { $exists: false };
    }

    return filter;
  }
}

// Cache decorator for repository methods
export function CacheResult(ttl: number = 300) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = new Map<string, { data: any; expiry: number }>();

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyName}:${JSON.stringify(args)}`;
      const cached = cache.get(cacheKey);

      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }

      const result = await originalMethod.apply(this, args);
      
      cache.set(cacheKey, {
        data: result,
        expiry: Date.now() + ttl * 1000,
      });

      return result;
    };

    return descriptor;
  };
}