/**
 * Cache Service
 * Handles Redis caching for dashboard queries with TTL and automatic invalidation
 */

const { getRedisClient, isRedisAvailable } = require('../config/redis');
const crypto = require('crypto');

// Default TTL values (in seconds)
const DEFAULT_TTL = {
  METRICS: 5 * 60,        // 5 minutes for metrics
  STATIC_DATA: 60 * 60,   // 1 hour for static data
  USER_DATA: 15 * 60,     // 15 minutes for user data
  AUDIT_LOGS: 10 * 60,    // 10 minutes for audit logs
  DASHBOARD: 3 * 60,      // 3 minutes for dashboard data
  REPORTS: 30 * 60,       // 30 minutes for reports
  SHORT: 60,              // 1 minute for short-lived data
  LONG: 24 * 60 * 60      // 24 hours for long-lived data
};

// Cache key patterns
const CACHE_PATTERNS = {
  METRICS: 'metrics:',
  DASHBOARD: 'dashboard:',
  USER: 'user:',
  AUDIT: 'audit:',
  REPORT: 'report:',
  STATS: 'stats:',
  COUNT: 'count:',
  LIST: 'list:'
};

class CacheService {
  /**
   * Generate cache key from parameters
   * @param {string} pattern - Cache pattern prefix
   * @param {Object|string} params - Parameters to include in key
   * @returns {string} Generated cache key
   */
  static generateKey(pattern, params = {}) {
    if (typeof params === 'string') {
      return `${pattern}${params}`;
    }

    // Sort parameters for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    // Create hash of parameters for complex objects
    const paramString = JSON.stringify(sortedParams);
    const hash = crypto.createHash('md5').update(paramString).digest('hex');
    
    return `${pattern}${hash}`;
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached data or null
   */
  static async get(key) {
    if (!isRedisAvailable()) {
      return null;
    }

    try {
      const client = getRedisClient();
      const data = await client.get(key);
      
      if (data) {
        const parsed = JSON.parse(data);
        
        // Check if data has expiration info
        if (parsed._cacheInfo) {
          const now = Date.now();
          if (now > parsed._cacheInfo.expiresAt) {
            // Data expired, remove it
            await this.delete(key);
            return null;
          }
          
          // Return data without cache info
          const { _cacheInfo, ...actualData } = parsed;
          return actualData;
        }
        
        return parsed;
      }
      
      return null;
    } catch (error) {
      console.error('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  static async set(key, data, ttl = DEFAULT_TTL.STATIC_DATA) {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      
      // Add cache metadata
      const cacheData = {
        ...data,
        _cacheInfo: {
          createdAt: Date.now(),
          expiresAt: Date.now() + (ttl * 1000),
          ttl: ttl
        }
      };
      
      const serialized = JSON.stringify(cacheData);
      
      // Set with TTL
      await client.setex(key, ttl, serialized);
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Delete data from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  static async delete(key) {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      const result = await client.del(key);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Key pattern to match
   * @returns {Promise<number>} Number of deleted keys
   */
  static async deleteByPattern(pattern) {
    if (!isRedisAvailable()) {
      return 0;
    }

    try {
      const client = getRedisClient();
      const keys = await client.keys(`*${pattern}*`);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await client.del(...keys);
      return result;
    } catch (error) {
      console.error('Cache delete by pattern error:', error.message);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Existence status
   */
  static async exists(key) {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error.message);
      return false;
    }
  }

  /**
   * Get TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds (-1 if no TTL, -2 if key doesn't exist)
   */
  static async getTTL(key) {
    if (!isRedisAvailable()) {
      return -2;
    }

    try {
      const client = getRedisClient();
      return await client.ttl(key);
    } catch (error) {
      console.error('Cache TTL error:', error.message);
      return -2;
    }
  }

  /**
   * Increment counter in cache
   * @param {string} key - Cache key
   * @param {number} increment - Increment value (default: 1)
   * @param {number} ttl - TTL for new keys
   * @returns {Promise<number>} New value
   */
  static async increment(key, increment = 1, ttl = DEFAULT_TTL.METRICS) {
    if (!isRedisAvailable()) {
      return increment;
    }

    try {
      const client = getRedisClient();
      const newValue = await client.incrby(key, increment);
      
      // Set TTL if this is a new key
      if (newValue === increment) {
        await client.expire(key, ttl);
      }
      
      return newValue;
    } catch (error) {
      console.error('Cache increment error:', error.message);
      return increment;
    }
  }

  /**
   * Get or set pattern - get from cache or execute function and cache result
   * @param {string} key - Cache key
   * @param {Function} fn - Function to execute if cache miss
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<any>} Cached or computed data
   */
  static async getOrSet(key, fn, ttl = DEFAULT_TTL.STATIC_DATA) {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    try {
      // Execute function to get fresh data
      const data = await fn();
      
      // Cache the result
      await this.set(key, data, ttl);
      
      return data;
    } catch (error) {
      console.error('Cache getOrSet error:', error.message);
      throw error;
    }
  }

  /**
   * Cache dashboard metrics
   * @param {string} userId - User ID
   * @param {Object} metrics - Metrics data
   * @returns {Promise<boolean>} Success status
   */
  static async cacheMetrics(userId, metrics) {
    const key = this.generateKey(CACHE_PATTERNS.METRICS, { userId, type: 'dashboard' });
    return await this.set(key, metrics, DEFAULT_TTL.METRICS);
  }

  /**
   * Get cached dashboard metrics
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Cached metrics or null
   */
  static async getMetrics(userId) {
    const key = this.generateKey(CACHE_PATTERNS.METRICS, { userId, type: 'dashboard' });
    return await this.get(key);
  }

  /**
   * Cache user data
   * @param {string} userId - User ID
   * @param {Object} userData - User data
   * @returns {Promise<boolean>} Success status
   */
  static async cacheUserData(userId, userData) {
    const key = this.generateKey(CACHE_PATTERNS.USER, userId);
    return await this.set(key, userData, DEFAULT_TTL.USER_DATA);
  }

  /**
   * Get cached user data
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Cached user data or null
   */
  static async getUserData(userId) {
    const key = this.generateKey(CACHE_PATTERNS.USER, userId);
    return await this.get(key);
  }

  /**
   * Invalidate user cache
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of deleted keys
   */
  static async invalidateUserCache(userId) {
    return await this.deleteByPattern(`${CACHE_PATTERNS.USER}${userId}`);
  }

  /**
   * Cache audit logs
   * @param {Object} filters - Query filters
   * @param {Array} logs - Audit logs
   * @returns {Promise<boolean>} Success status
   */
  static async cacheAuditLogs(filters, logs) {
    const key = this.generateKey(CACHE_PATTERNS.AUDIT, filters);
    return await this.set(key, logs, DEFAULT_TTL.AUDIT_LOGS);
  }

  /**
   * Get cached audit logs
   * @param {Object} filters - Query filters
   * @returns {Promise<Array|null>} Cached logs or null
   */
  static async getAuditLogs(filters) {
    const key = this.generateKey(CACHE_PATTERNS.AUDIT, filters);
    return await this.get(key);
  }

  /**
   * Invalidate all caches when data is modified
   * @param {string} entityType - Type of entity that was modified
   * @param {string} entityId - ID of modified entity
   * @returns {Promise<number>} Number of deleted keys
   */
  static async invalidateOnUpdate(entityType, entityId) {
    const patterns = [];
    
    switch (entityType.toLowerCase()) {
      case 'user':
        patterns.push(CACHE_PATTERNS.USER);
        patterns.push(CACHE_PATTERNS.METRICS);
        patterns.push(CACHE_PATTERNS.DASHBOARD);
        break;
      case 'audit':
        patterns.push(CACHE_PATTERNS.AUDIT);
        patterns.push(CACHE_PATTERNS.STATS);
        break;
      case 'building':
      case 'event':
      case 'access':
        patterns.push(CACHE_PATTERNS.METRICS);
        patterns.push(CACHE_PATTERNS.DASHBOARD);
        patterns.push(CACHE_PATTERNS.STATS);
        break;
      default:
        patterns.push(CACHE_PATTERNS.DASHBOARD);
        patterns.push(CACHE_PATTERNS.METRICS);
    }

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.deleteByPattern(pattern);
    }

    return totalDeleted;
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>} Success status
   */
  static async clear() {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      await client.flushdb();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  static async getStats() {
    if (!isRedisAvailable()) {
      return {
        available: false,
        keys: 0,
        memory: 0,
        hits: 0,
        misses: 0
      };
    }

    try {
      const client = getRedisClient();
      const info = await client.info('memory');
      const keyCount = await client.dbsize();
      
      return {
        available: true,
        keys: keyCount,
        memory: this.parseMemoryInfo(info),
        uptime: await this.getUptime()
      };
    } catch (error) {
      console.error('Cache stats error:', error.message);
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Parse Redis memory info
   * @param {string} info - Redis info string
   * @returns {Object} Parsed memory info
   */
  static parseMemoryInfo(info) {
    const lines = info.split('\r\n');
    const memory = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key.includes('memory')) {
          memory[key] = value;
        }
      }
    });
    
    return memory;
  }

  /**
   * Get Redis uptime
   * @returns {Promise<number>} Uptime in seconds
   */
  static async getUptime() {
    try {
      const client = getRedisClient();
      const info = await client.info('server');
      const uptimeLine = info.split('\r\n').find(line => line.startsWith('uptime_in_seconds:'));
      return uptimeLine ? parseInt(uptimeLine.split(':')[1]) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Health check for cache service
   * @returns {Promise<Object>} Health status
   */
  static async healthCheck() {
    const start = Date.now();
    
    if (!isRedisAvailable()) {
      return {
        status: 'unhealthy',
        message: 'Redis not available',
        responseTime: 0
      };
    }

    try {
      const client = getRedisClient();
      await client.ping();
      
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        message: 'Redis connection successful',
        responseTime: responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        responseTime: Date.now() - start
      };
    }
  }
}

// Export TTL constants and patterns for use in other modules
CacheService.TTL = DEFAULT_TTL;
CacheService.PATTERNS = CACHE_PATTERNS;

module.exports = CacheService;