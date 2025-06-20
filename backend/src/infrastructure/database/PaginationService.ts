import { Sequelize, Op, FindOptions, Model, ModelStatic } from 'sequelize';
import { CacheService } from '../cache/CacheService';
import { Logger } from '../logging/Logger';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
  search?: string;
  searchFields?: string[];
  include?: any[];
  attributes?: string[];
  cache?: boolean;
  cacheTTL?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    sortBy: string;
    sortOrder: string;
    filters: Record<string, any>;
    cached: boolean;
    executionTime: number;
  };
}

export interface CursorPaginationOptions {
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

export interface CursorPaginatedResult<T> {
  data: T[];
  pagination: {
    cursor: string | null;
    hasNext: boolean;
    limit: number;
  };
}

export class PaginationService {
  private readonly logger: Logger;
  private readonly defaultLimit = 20;
  private readonly maxLimit = 100;
  
  constructor(
    private readonly sequelize: Sequelize,
    private readonly cache?: CacheService
  ) {
    this.logger = new Logger('PaginationService');
  }

  /**
   * Paginate query results with offset-based pagination
   */
  async paginate<T extends Model>(
    model: ModelStatic<T>,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const startTime = Date.now();
    
    // Validate and normalize options
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(this.maxLimit, Math.max(1, options.limit || this.defaultLimit));
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'DESC';

    // Build cache key if caching is enabled
    const cacheKey = this.buildCacheKey(model.name, options);
    
    if (options.cache && this.cache) {
      const cached = await this.cache.query<PaginatedResult<T>>({
        key: cacheKey,
        query: async () => this.executeQuery(model, page, limit, offset, sortBy, sortOrder, options),
        ttl: options.cacheTTL || 60,
        namespace: 'pagination'
      });
      
      if (cached) {
        cached.meta = { ...cached.meta, cached: true };
        return cached;
      }
    }

    return this.executeQuery(model, page, limit, offset, sortBy, sortOrder, options);
  }

  /**
   * Cursor-based pagination for large datasets
   */
  async paginateCursor<T extends Model>(
    model: ModelStatic<T>,
    options: CursorPaginationOptions = {}
  ): Promise<CursorPaginatedResult<T>> {
    const limit = Math.min(this.maxLimit, Math.max(1, options.limit || this.defaultLimit));
    const sortBy = options.sortBy || 'id';
    const sortOrder = options.sortOrder || 'ASC';

    const where: any = { ...options.filters };

    // Decode cursor and add to where clause
    if (options.cursor) {
      const decodedCursor = this.decodeCursor(options.cursor);
      where[sortBy] = {
        [sortOrder === 'ASC' ? Op.gt : Op.lt]: decodedCursor[sortBy]
      };
    }

    const queryOptions: FindOptions = {
      where,
      limit: limit + 1, // Fetch one extra to check hasNext
      order: [[sortBy, sortOrder]]
    };

    const results = await model.findAll(queryOptions);
    
    const hasNext = results.length > limit;
    const data = hasNext ? results.slice(0, -1) : results;
    
    const nextCursor = hasNext 
      ? this.encodeCursor({ [sortBy]: data[data.length - 1].get(sortBy) })
      : null;

    return {
      data,
      pagination: {
        cursor: nextCursor,
        hasNext,
        limit
      }
    };
  }

  /**
   * Lazy load related data
   */
  async lazyLoad<T extends Model, R>(
    instance: T,
    association: string,
    options?: {
      limit?: number;
      offset?: number;
      where?: any;
      order?: any[];
    }
  ): Promise<R[]> {
    const associationMethod = (instance as any)[`get${association}`];
    
    if (!associationMethod) {
      throw new Error(`Association ${association} not found on model`);
    }

    const queryOptions: any = {
      limit: options?.limit || this.defaultLimit,
      offset: options?.offset || 0
    };

    if (options?.where) queryOptions.where = options.where;
    if (options?.order) queryOptions.order = options.order;

    return associationMethod.call(instance, queryOptions);
  }

  /**
   * Batch load related data to avoid N+1 queries
   */
  async batchLoad<T extends Model, R>(
    instances: T[],
    association: string,
    options?: {
      where?: any;
      order?: any[];
      attributes?: string[];
    }
  ): Promise<Map<any, R[]>> {
    if (instances.length === 0) return new Map();

    const model = instances[0].constructor as ModelStatic<T>;
    const associationDef = (model as any).associations[association];
    
    if (!associationDef) {
      throw new Error(`Association ${association} not found`);
    }

    // Get foreign key from association
    const foreignKey = associationDef.foreignKey;
    const ids = instances.map(instance => instance.get('id'));

    // Build query
    const queryOptions: FindOptions = {
      where: {
        [foreignKey]: ids,
        ...options?.where
      }
    };

    if (options?.order) queryOptions.order = options.order;
    if (options?.attributes) queryOptions.attributes = options.attributes;

    // Fetch all related data in one query
    const relatedData = await associationDef.target.findAll(queryOptions);

    // Group by foreign key
    const grouped = new Map<any, R[]>();
    
    for (const instance of instances) {
      const id = instance.get('id');
      grouped.set(id, []);
    }

    for (const item of relatedData) {
      const fkValue = item.get(foreignKey);
      const group = grouped.get(fkValue) || [];
      group.push(item as any);
      grouped.set(fkValue, group);
    }

    return grouped;
  }

  /**
   * Stream large result sets
   */
  async *stream<T extends Model>(
    model: ModelStatic<T>,
    options: {
      where?: any;
      order?: any[];
      chunkSize?: number;
      transform?: (item: T) => any;
    } = {}
  ): AsyncGenerator<T | any, void, unknown> {
    const chunkSize = options.chunkSize || 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const results = await model.findAll({
        where: options.where,
        order: options.order,
        limit: chunkSize,
        offset,
        raw: false
      });

      if (results.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of results) {
        yield options.transform ? options.transform(item) : item;
      }

      offset += chunkSize;
      hasMore = results.length === chunkSize;
    }
  }

  /**
   * Optimize includes for better performance
   */
  optimizeIncludes(includes: any[]): any[] {
    return includes.map(include => {
      if (typeof include === 'object' && !include.separate) {
        // Use separate queries for hasMany associations
        if (include.association?.isMultiAssociation) {
          return { ...include, separate: true };
        }
      }
      return include;
    });
  }

  /**
   * Build optimized count query
   */
  async count(
    model: ModelStatic<any>,
    options: {
      where?: any;
      include?: any[];
      distinct?: boolean;
      col?: string;
    } = {}
  ): Promise<number> {
    // Use cache for count queries
    if (this.cache) {
      const cacheKey = `count:${model.name}:${JSON.stringify(options)}`;
      return this.cache.query({
        key: cacheKey,
        query: () => model.count(options),
        ttl: 300, // 5 minutes
        namespace: 'counts'
      });
    }

    return model.count(options);
  }

  // Private helper methods

  private async executeQuery<T extends Model>(
    model: ModelStatic<T>,
    page: number,
    limit: number,
    offset: number,
    sortBy: string,
    sortOrder: string,
    options: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const where = this.buildWhereClause(options);
    
    const queryOptions: FindOptions = {
      where,
      limit,
      offset,
      order: [[sortBy, sortOrder]]
    };

    if (options.include) {
      queryOptions.include = this.optimizeIncludes(options.include);
    }

    if (options.attributes) {
      queryOptions.attributes = options.attributes;
    }

    // Execute count and find in parallel
    const [total, data] = await Promise.all([
      this.count(model, { where, distinct: true }),
      model.findAll(queryOptions)
    ]);

    const totalPages = Math.ceil(total / limit);
    const executionTime = Date.now() - Date.now();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      meta: {
        sortBy,
        sortOrder,
        filters: options.filters || {},
        cached: false,
        executionTime
      }
    };
  }

  private buildWhereClause(options: PaginationOptions): any {
    const where: any = { ...options.filters };

    // Add search conditions
    if (options.search && options.searchFields && options.searchFields.length > 0) {
      const searchConditions = options.searchFields.map(field => ({
        [field]: {
          [Op.iLike]: `%${options.search}%`
        }
      }));

      where[Op.or] = searchConditions;
    }

    // Remove null/undefined values
    Object.keys(where).forEach(key => {
      if (where[key] === null || where[key] === undefined) {
        delete where[key];
      }
    });

    return where;
  }

  private buildCacheKey(modelName: string, options: PaginationOptions): string {
    const keyParts = [
      modelName,
      options.page || 1,
      options.limit || this.defaultLimit,
      options.sortBy || 'createdAt',
      options.sortOrder || 'DESC',
      JSON.stringify(options.filters || {}),
      options.search || '',
      JSON.stringify(options.searchFields || [])
    ];

    return keyParts.join(':');
  }

  private encodeCursor(data: Record<string, any>): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private decodeCursor(cursor: string): Record<string, any> {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch (error) {
      throw new Error('Invalid cursor');
    }
  }
}

// Helper class for building complex queries with pagination
export class QueryBuilder<T extends Model> {
  private options: PaginationOptions = {};
  
  constructor(
    private model: ModelStatic<T>,
    private paginationService: PaginationService
  ) {}

  page(page: number): this {
    this.options.page = page;
    return this;
  }

  limit(limit: number): this {
    this.options.limit = limit;
    return this;
  }

  sortBy(field: string, order: 'ASC' | 'DESC' = 'ASC'): this {
    this.options.sortBy = field;
    this.options.sortOrder = order;
    return this;
  }

  filter(filters: Record<string, any>): this {
    this.options.filters = { ...this.options.filters, ...filters };
    return this;
  }

  search(query: string, fields: string[]): this {
    this.options.search = query;
    this.options.searchFields = fields;
    return this;
  }

  include(associations: any[]): this {
    this.options.include = associations;
    return this;
  }

  select(attributes: string[]): this {
    this.options.attributes = attributes;
    return this;
  }

  cache(ttl?: number): this {
    this.options.cache = true;
    if (ttl) this.options.cacheTTL = ttl;
    return this;
  }

  async execute(): Promise<PaginatedResult<T>> {
    return this.paginationService.paginate(this.model, this.options);
  }

  async stream(transform?: (item: T) => any): Promise<AsyncGenerator<T | any, void, unknown>> {
    return this.paginationService.stream(this.model, {
      where: this.buildWhereClause(),
      order: [[this.options.sortBy || 'createdAt', this.options.sortOrder || 'DESC']],
      transform
    });
  }

  private buildWhereClause(): any {
    const where: any = { ...this.options.filters };

    if (this.options.search && this.options.searchFields) {
      where[Op.or] = this.options.searchFields.map(field => ({
        [field]: { [Op.iLike]: `%${this.options.search}%` }
      }));
    }

    return where;
  }
}