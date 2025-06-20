import { Query, QueryResult } from '../entities/Query';

export interface QueryFilters {
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  createdBy?: string;
  name?: string;
  dataSource?: string;
}

export interface IQueryRepository {
  findById(id: string): Promise<Query | null>;
  findAll(filters?: QueryFilters, limit?: number, offset?: number): Promise<Query[]>;
  findByUser(userId: string): Promise<Query[]>;
  findByCategory(category: string): Promise<Query[]>;
  findByTags(tags: string[]): Promise<Query[]>;
  findPopularQueries(limit?: number): Promise<Query[]>;
  save(query: Query): Promise<Query>;
  update(query: Query): Promise<Query>;
  delete(id: string): Promise<boolean>;
  
  // Execution operations
  execute(query: Query, parameters?: Record<string, any>): Promise<QueryResult>;
  executeRaw(sql: string, parameters?: any[]): Promise<QueryResult>;
  validateQuery(query: Query): Promise<{ valid: boolean; errors?: string[] }>;
  
  // Cache operations
  getCachedResult(cacheKey: string): Promise<QueryResult | null>;
  setCachedResult(cacheKey: string, result: QueryResult, ttl: number): Promise<void>;
  invalidateCache(queryId: string): Promise<void>;
  
  // Access control
  findAccessibleByUser(userId: string, userRole?: string): Promise<Query[]>;
  checkAccess(queryId: string, userId: string, userRole?: string): Promise<boolean>;
}