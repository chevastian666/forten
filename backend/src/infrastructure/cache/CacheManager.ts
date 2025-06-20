import { Redis } from 'ioredis';
import { Logger } from '../logging/Logger';
import crypto from 'crypto';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  prefix?: string;
  compression?: boolean;
  namespace?: string;
  tags?: string[];
  invalidationRules?: InvalidationRule[];
}

export interface InvalidationRule {
  event: string;
  tags: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  size: number;
  keys: number;
}

export class CacheManager {
  private readonly logger: Logger;
  private readonly defaultTTL = 300; // 5 minutes
  private readonly statsPrefix = 'cache:stats:';
  private readonly tagPrefix = 'cache:tags:';
  
  // Cache strategy presets
  private readonly strategies = {
    buildings: { ttl: 3600, tags: ['buildings'] }, // 1 hour
    userPermissions: { ttl: 300, tags: ['users', 'permissions'] }, // 5 minutes
    activeAccess: { ttl: 60, tags: ['access', 'realtime'] }, // 1 minute
    metrics: { ttl: 30, tags: ['metrics', 'analytics'] }, // 30 seconds
    events: { ttl: 120, tags: ['events', 'monitoring'] }, // 2 minutes
    cameras: { ttl: 180, tags: ['cameras', 'devices'] }, // 3 minutes
    notifications: { ttl: 60, tags: ['notifications', 'users'] }, // 1 minute
    static: { ttl: 86400, tags: ['static'] }, // 24 hours
    search: { ttl: 600, tags: ['search'] }, // 10 minutes
    reports: { ttl: 1800, tags: ['reports', 'analytics'] } // 30 minutes
  };

  constructor(private readonly redis: Redis) {
    this.logger = new Logger('CacheManager');
  }

  /**
   * Get a value from cache with automatic deserialization
   */
  async get<T>(key: string, namespace?: string): Promise<T | null> {
    const cacheKey = this.buildKey(key, namespace);
    const timer = this.logger.startTimer();
    
    try {
      const value = await this.redis.get(cacheKey);
      const duration = timer();
      
      if (value === null) {
        await this.incrementStat('misses');
        this.logger.debug('Cache miss', { key: cacheKey, duration });
        return null;
      }
      
      await this.incrementStat('hits');
      this.logger.debug('Cache hit', { key: cacheKey, duration });
      
      return this.deserialize<T>(value);
    } catch (error) {
      this.logger.error('Cache get error', error, { key: cacheKey });
      return null;
    }
  }

  /**
   * Set a value in cache with automatic serialization
   */
  async set<T>(
    key: string,
    value: T,
    options?: Partial<CacheConfig>
  ): Promise<boolean> {
    const config = this.mergeConfig(options);
    const cacheKey = this.buildKey(key, config.namespace);
    const timer = this.logger.startTimer();
    
    try {
      const serialized = this.serialize(value, config.compression);
      
      // Set with TTL
      await this.redis.setex(cacheKey, config.ttl, serialized);
      
      // Handle tags
      if (config.tags && config.tags.length > 0) {
        await this.tagKey(cacheKey, config.tags);
      }
      
      await this.incrementStat('sets');
      const duration = timer();
      
      this.logger.debug('Cache set', { 
        key: cacheKey, 
        ttl: config.ttl, 
        size: serialized.length,
        duration 
      });
      
      return true;
    } catch (error) {
      this.logger.error('Cache set error', error, { key: cacheKey });
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string, namespace?: string): Promise<boolean> {
    const cacheKey = this.buildKey(key, namespace);
    
    try {
      const result = await this.redis.del(cacheKey);
      
      if (result > 0) {
        await this.incrementStat('deletes');
        await this.removeKeyFromTags(cacheKey);
        this.logger.debug('Cache delete', { key: cacheKey });
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Cache delete error', error, { key: cacheKey });
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    const cacheKey = this.buildKey(key, namespace);
    
    try {
      const result = await this.redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      this.logger.error('Cache exists error', error, { key: cacheKey });
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[], namespace?: string): Promise<Map<string, T>> {
    const cacheKeys = keys.map(key => this.buildKey(key, namespace));
    const result = new Map<string, T>();
    
    try {
      const values = await this.redis.mget(...cacheKeys);
      
      keys.forEach((key, index) => {
        const value = values[index];
        if (value !== null) {
          const deserialized = this.deserialize<T>(value);
          if (deserialized !== null) {
            result.set(key, deserialized);
          }
        }
      });
      
      const hits = result.size;
      const misses = keys.length - hits;
      
      await this.incrementStat('hits', hits);
      await this.incrementStat('misses', misses);
      
      return result;
    } catch (error) {
      this.logger.error('Cache mget error', error);
      return result;
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset<T>(
    entries: Map<string, T>,
    options?: Partial<CacheConfig>
  ): Promise<boolean> {
    const config = this.mergeConfig(options);
    const pipeline = this.redis.pipeline();
    
    try {
      for (const [key, value] of entries) {
        const cacheKey = this.buildKey(key, config.namespace);
        const serialized = this.serialize(value, config.compression);
        
        pipeline.setex(cacheKey, config.ttl, serialized);
        
        if (config.tags && config.tags.length > 0) {
          for (const tag of config.tags) {
            pipeline.sadd(`${this.tagPrefix}${tag}`, cacheKey);
          }
        }
      }
      
      await pipeline.exec();
      await this.incrementStat('sets', entries.size);
      
      return true;
    } catch (error) {
      this.logger.error('Cache mset error', error);
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalDeleted = 0;
    
    try {
      for (const tag of tags) {
        const tagKey = `${this.tagPrefix}${tag}`;
        const keys = await this.redis.smembers(tagKey);
        
        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          totalDeleted += deleted;
          
          // Clean up tag set
          await this.redis.del(tagKey);
        }
      }
      
      if (totalDeleted > 0) {
        await this.incrementStat('deletes', totalDeleted);
        this.logger.info('Invalidated cache by tags', { tags, count: totalDeleted });
      }
      
      return totalDeleted;
    } catch (error) {
      this.logger.error('Cache invalidation error', error, { tags });
      return 0;
    }
  }

  /**
   * Clear all cache entries matching a pattern
   */
  async clearPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.scanKeys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const deleted = await this.redis.del(...keys);
      await this.incrementStat('deletes', deleted);
      
      this.logger.info('Cleared cache pattern', { pattern, count: deleted });
      
      return deleted;
    } catch (error) {
      this.logger.error('Clear pattern error', error, { pattern });
      return 0;
    }
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: Partial<CacheConfig>
  ): Promise<T> {
    const namespace = options?.namespace;
    
    // Try to get from cache
    const cached = await this.get<T>(key, namespace);
    if (cached !== null) {
      return cached;
    }
    
    // Generate value
    const value = await factory();
    
    // Store in cache
    await this.set(key, value, options);
    
    return value;
  }

  /**
   * Decorator for caching method results
   */
  cache(options?: Partial<CacheConfig>) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        // Generate cache key from method name and arguments
        const key = `${target.constructor.name}:${propertyKey}:${CacheManager.hashArgs(args)}`;
        
        return await this.cacheManager.getOrSet(
          key,
          () => originalMethod.apply(this, args),
          options
        );
      };
      
      return descriptor;
    };
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const [hits, misses, sets, deletes] = await Promise.all([
        this.getStat('hits'),
        this.getStat('misses'),
        this.getStat('sets'),
        this.getStat('deletes')
      ]);
      
      const total = hits + misses;
      const hitRate = total > 0 ? hits / total : 0;
      
      // Get cache size info
      const info = await this.redis.info('memory');
      const sizeMatch = info.match(/used_memory:(\d+)/);
      const size = sizeMatch ? parseInt(sizeMatch[1]) : 0;
      
      // Count keys
      const keys = await this.redis.dbsize();
      
      return {
        hits,
        misses,
        sets,
        deletes,
        hitRate,
        size,
        keys
      };
    } catch (error) {
      this.logger.error('Get stats error', error);
      return {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        hitRate: 0,
        size: 0,
        keys: 0
      };
    }
  }

  /**
   * Reset cache statistics
   */
  async resetStats(): Promise<void> {
    const stats = ['hits', 'misses', 'sets', 'deletes'];
    const pipeline = this.redis.pipeline();
    
    for (const stat of stats) {
      pipeline.set(`${this.statsPrefix}${stat}`, '0');
    }
    
    await pipeline.exec();
    this.logger.info('Cache statistics reset');
  }

  /**
   * Warm up cache with predefined data
   */
  async warmUp(
    dataLoaders: Array<{
      key: string;
      loader: () => Promise<any>;
      options?: Partial<CacheConfig>;
    }>
  ): Promise<void> {
    const startTime = Date.now();
    let loaded = 0;
    
    for (const { key, loader, options } of dataLoaders) {
      try {
        const data = await loader();
        const success = await this.set(key, data, options);
        
        if (success) {
          loaded++;
        }
      } catch (error) {
        this.logger.error('Cache warm-up error', error, { key });
      }
    }
    
    const duration = Date.now() - startTime;
    this.logger.info('Cache warm-up completed', { 
      total: dataLoaders.length, 
      loaded,
      duration 
    });
  }

  /**
   * Get a preset cache strategy
   */
  getStrategy(name: keyof typeof this.strategies): CacheConfig {
    return this.strategies[name] || { ttl: this.defaultTTL };
  }

  // Private helper methods

  private buildKey(key: string, namespace?: string): string {
    const parts = ['cache'];
    
    if (namespace) {
      parts.push(namespace);
    }
    
    parts.push(key);
    
    return parts.join(':');
  }

  private mergeConfig(options?: Partial<CacheConfig>): CacheConfig {
    return {
      ttl: options?.ttl || this.defaultTTL,
      prefix: options?.prefix,
      compression: options?.compression || false,
      namespace: options?.namespace,
      tags: options?.tags || [],
      invalidationRules: options?.invalidationRules || []
    };
  }

  private serialize(value: any, compress: boolean = false): string {
    const json = JSON.stringify(value);
    
    if (compress && json.length > 1024) {
      // Use zlib compression for large values
      const zlib = require('zlib');
      const compressed = zlib.gzipSync(json);
      return `gzip:${compressed.toString('base64')}`;
    }
    
    return json;
  }

  private deserialize<T>(value: string): T | null {
    try {
      if (value.startsWith('gzip:')) {
        const zlib = require('zlib');
        const compressed = Buffer.from(value.slice(5), 'base64');
        const json = zlib.gunzipSync(compressed).toString();
        return JSON.parse(json);
      }
      
      return JSON.parse(value);
    } catch (error) {
      this.logger.error('Deserialization error', error);
      return null;
    }
  }

  private async tagKey(key: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const tag of tags) {
      pipeline.sadd(`${this.tagPrefix}${tag}`, key);
    }
    
    await pipeline.exec();
  }

  private async removeKeyFromTags(key: string): Promise<void> {
    // Scan for tags containing this key
    const pattern = `${this.tagPrefix}*`;
    const tags = await this.scanKeys(pattern);
    
    if (tags.length > 0) {
      const pipeline = this.redis.pipeline();
      
      for (const tag of tags) {
        pipeline.srem(tag, key);
      }
      
      await pipeline.exec();
    }
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const [nextCursor, batch] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      
      keys.push(...batch);
      cursor = nextCursor;
    } while (cursor !== '0');
    
    return keys;
  }

  private async incrementStat(stat: string, amount: number = 1): Promise<void> {
    await this.redis.incrby(`${this.statsPrefix}${stat}`, amount);
  }

  private async getStat(stat: string): Promise<number> {
    const value = await this.redis.get(`${this.statsPrefix}${stat}`);
    return value ? parseInt(value) : 0;
  }

  private static hashArgs(args: any[]): string {
    const str = JSON.stringify(args);
    return crypto.createHash('md5').update(str).digest('hex');
  }
}