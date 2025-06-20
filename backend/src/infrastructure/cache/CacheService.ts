import { CacheManager } from './CacheManager';
import { Logger } from '../logging/Logger';
import { Redis } from 'ioredis';

export interface CacheableQuery {
  key: string;
  query: () => Promise<any>;
  ttl?: number;
  tags?: string[];
  namespace?: string;
}

export class CacheService {
  private readonly logger: Logger;
  private readonly cache: CacheManager;
  
  // Specific cache managers for different domains
  private readonly buildingCache: BuildingCacheService;
  private readonly userCache: UserCacheService;
  private readonly accessCache: AccessCacheService;
  private readonly eventCache: EventCacheService;
  private readonly metricsCache: MetricsCacheService;

  constructor(redis: Redis) {
    this.logger = new Logger('CacheService');
    this.cache = new CacheManager(redis);
    
    // Initialize domain-specific caches
    this.buildingCache = new BuildingCacheService(this.cache);
    this.userCache = new UserCacheService(this.cache);
    this.accessCache = new AccessCacheService(this.cache);
    this.eventCache = new EventCacheService(this.cache);
    this.metricsCache = new MetricsCacheService(this.cache);
  }

  // Expose domain-specific caches
  get buildings() { return this.buildingCache; }
  get users() { return this.userCache; }
  get access() { return this.accessCache; }
  get events() { return this.eventCache; }
  get metrics() { return this.metricsCache; }

  /**
   * Execute a cacheable query
   */
  async query<T>(options: CacheableQuery): Promise<T> {
    return this.cache.getOrSet<T>(
      options.key,
      options.query,
      {
        ttl: options.ttl,
        tags: options.tags,
        namespace: options.namespace
      }
    );
  }

  /**
   * Invalidate cache entries
   */
  async invalidate(options: {
    keys?: string[];
    tags?: string[];
    pattern?: string;
  }): Promise<void> {
    if (options.keys) {
      for (const key of options.keys) {
        await this.cache.delete(key);
      }
    }

    if (options.tags) {
      await this.cache.invalidateByTags(options.tags);
    }

    if (options.pattern) {
      await this.cache.clearPattern(options.pattern);
    }
  }

  /**
   * Warm up all caches
   */
  async warmUp(): Promise<void> {
    await Promise.all([
      this.buildingCache.warmUp(),
      this.userCache.warmUp(),
      this.metricsCache.warmUp()
    ]);
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    return this.cache.getStats();
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    await this.cache.clearPattern('cache:*');
  }
}

// Domain-specific cache services

export class BuildingCacheService {
  constructor(private cache: CacheManager) {}

  async getBuilding(id: string): Promise<any> {
    return this.cache.get(id, 'buildings');
  }

  async setBuilding(id: string, data: any): Promise<void> {
    await this.cache.set(id, data, this.cache.getStrategy('buildings'));
  }

  async getBuildingList(filters?: any): Promise<any[]> {
    const key = `list:${JSON.stringify(filters || {})}`;
    return this.cache.get(key, 'buildings') || [];
  }

  async setBuildingList(filters: any, data: any[]): Promise<void> {
    const key = `list:${JSON.stringify(filters || {})}`;
    await this.cache.set(key, data, this.cache.getStrategy('buildings'));
  }

  async getBuildingStats(id: string): Promise<any> {
    const key = `stats:${id}`;
    return this.cache.get(key, 'buildings');
  }

  async setBuildingStats(id: string, stats: any): Promise<void> {
    const key = `stats:${id}`;
    await this.cache.set(key, stats, {
      ...this.cache.getStrategy('metrics'),
      tags: ['buildings', 'stats']
    });
  }

  async invalidateBuilding(id: string): Promise<void> {
    await this.cache.delete(id, 'buildings');
    await this.cache.delete(`stats:${id}`, 'buildings');
    await this.cache.invalidateByTags(['buildings']);
  }

  async warmUp(): Promise<void> {
    // Implement building cache warm-up logic
    // This would typically load frequently accessed buildings
  }
}

export class UserCacheService {
  constructor(private cache: CacheManager) {}

  async getUserPermissions(userId: string): Promise<any> {
    const key = `permissions:${userId}`;
    return this.cache.get(key, 'users');
  }

  async setUserPermissions(userId: string, permissions: any): Promise<void> {
    const key = `permissions:${userId}`;
    await this.cache.set(key, permissions, this.cache.getStrategy('userPermissions'));
  }

  async getUserProfile(userId: string): Promise<any> {
    return this.cache.get(userId, 'users');
  }

  async setUserProfile(userId: string, profile: any): Promise<void> {
    await this.cache.set(userId, profile, {
      ttl: 600, // 10 minutes
      tags: ['users', 'profiles']
    });
  }

  async getUserSessions(userId: string): Promise<any[]> {
    const key = `sessions:${userId}`;
    return this.cache.get(key, 'users') || [];
  }

  async setUserSessions(userId: string, sessions: any[]): Promise<void> {
    const key = `sessions:${userId}`;
    await this.cache.set(key, sessions, {
      ttl: 300, // 5 minutes
      tags: ['users', 'sessions']
    });
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.cache.delete(userId, 'users');
    await this.cache.delete(`permissions:${userId}`, 'users');
    await this.cache.delete(`sessions:${userId}`, 'users');
  }

  async warmUp(): Promise<void> {
    // Implement user cache warm-up logic
    // This would typically load admin users and their permissions
  }
}

export class AccessCacheService {
  constructor(private cache: CacheManager) {}

  async getActiveAccess(buildingId: string): Promise<any[]> {
    const key = `active:${buildingId}`;
    return this.cache.get(key, 'access') || [];
  }

  async setActiveAccess(buildingId: string, access: any[]): Promise<void> {
    const key = `active:${buildingId}`;
    await this.cache.set(key, access, this.cache.getStrategy('activeAccess'));
  }

  async validatePin(pin: string): Promise<any> {
    const key = `pin:${pin}`;
    return this.cache.get(key, 'access');
  }

  async cachePin(pin: string, accessData: any): Promise<void> {
    const key = `pin:${pin}`;
    await this.cache.set(key, accessData, {
      ttl: 60, // 1 minute
      tags: ['access', 'pins']
    });
  }

  async getAccessStats(buildingId: string, period: string): Promise<any> {
    const key = `stats:${buildingId}:${period}`;
    return this.cache.get(key, 'access');
  }

  async setAccessStats(buildingId: string, period: string, stats: any): Promise<void> {
    const key = `stats:${buildingId}:${period}`;
    await this.cache.set(key, stats, {
      ttl: 300, // 5 minutes
      tags: ['access', 'stats']
    });
  }

  async invalidateAccess(buildingId: string): Promise<void> {
    await this.cache.delete(`active:${buildingId}`, 'access');
    await this.cache.invalidateByTags(['access', buildingId]);
  }

  async invalidatePin(pin: string): Promise<void> {
    const key = `pin:${pin}`;
    await this.cache.delete(key, 'access');
  }
}

export class EventCacheService {
  constructor(private cache: CacheManager) {}

  async getRecentEvents(buildingId: string): Promise<any[]> {
    const key = `recent:${buildingId}`;
    return this.cache.get(key, 'events') || [];
  }

  async setRecentEvents(buildingId: string, events: any[]): Promise<void> {
    const key = `recent:${buildingId}`;
    await this.cache.set(key, events, this.cache.getStrategy('events'));
  }

  async getUnresolvedEvents(buildingId: string): Promise<any[]> {
    const key = `unresolved:${buildingId}`;
    return this.cache.get(key, 'events') || [];
  }

  async setUnresolvedEvents(buildingId: string, events: any[]): Promise<void> {
    const key = `unresolved:${buildingId}`;
    await this.cache.set(key, events, {
      ttl: 60, // 1 minute - frequently changing data
      tags: ['events', 'unresolved', buildingId]
    });
  }

  async getEventStats(buildingId: string, type?: string): Promise<any> {
    const key = type ? `stats:${buildingId}:${type}` : `stats:${buildingId}`;
    return this.cache.get(key, 'events');
  }

  async setEventStats(buildingId: string, stats: any, type?: string): Promise<void> {
    const key = type ? `stats:${buildingId}:${type}` : `stats:${buildingId}`;
    await this.cache.set(key, stats, {
      ttl: 300, // 5 minutes
      tags: ['events', 'stats', buildingId]
    });
  }

  async invalidateEvents(buildingId: string): Promise<void> {
    await this.cache.clearPattern(`cache:events:*${buildingId}*`);
  }
}

export class MetricsCacheService {
  constructor(private cache: CacheManager) {}

  async getMetrics(type: string, period: string): Promise<any> {
    const key = `${type}:${period}`;
    return this.cache.get(key, 'metrics');
  }

  async setMetrics(type: string, period: string, data: any): Promise<void> {
    const key = `${type}:${period}`;
    await this.cache.set(key, data, this.cache.getStrategy('metrics'));
  }

  async getDashboardMetrics(): Promise<any> {
    return this.cache.get('dashboard', 'metrics');
  }

  async setDashboardMetrics(data: any): Promise<void> {
    await this.cache.set('dashboard', data, {
      ttl: 30, // 30 seconds - real-time dashboard
      tags: ['metrics', 'dashboard']
    });
  }

  async getRealtimeMetrics(buildingId?: string): Promise<any> {
    const key = buildingId ? `realtime:${buildingId}` : 'realtime:all';
    return this.cache.get(key, 'metrics');
  }

  async setRealtimeMetrics(data: any, buildingId?: string): Promise<void> {
    const key = buildingId ? `realtime:${buildingId}` : 'realtime:all';
    await this.cache.set(key, data, {
      ttl: 10, // 10 seconds - very short for real-time data
      tags: ['metrics', 'realtime']
    });
  }

  async warmUp(): Promise<void> {
    // Implement metrics cache warm-up logic
    // This would typically pre-calculate common metrics
  }

  async invalidateAll(): Promise<void> {
    await this.cache.invalidateByTags(['metrics']);
  }
}