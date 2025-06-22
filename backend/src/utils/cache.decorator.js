/**
 * Cache Decorators
 * Decorators for caching method results with TTL and automatic invalidation
 */

const CacheService = require('../services/cache.service');

/**
 * Cache decorator for methods
 * @param {Object} options - Caching options
 * @returns {Function} Decorator function
 */
function Cache(options = {}) {
  const {
    ttl = CacheService.TTL.STATIC_DATA,
    keyPrefix = '',
    keyGenerator = null,
    condition = null,
    invalidateOnError = false
  } = options;

  return function(target, propertyName, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      try {
        // Check condition if provided
        if (condition && !condition(...args)) {
          return await originalMethod.apply(this, args);
        }

        // Generate cache key
        const cacheKey = keyGenerator ? 
          keyGenerator(...args) : 
          generateMethodCacheKey(target.constructor.name, propertyName, args, keyPrefix);

        // Try to get from cache
        const cachedResult = await CacheService.get(cacheKey);
        if (cachedResult !== null) {
          return cachedResult;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Cache the result
        await CacheService.set(cacheKey, result, ttl);

        return result;
      } catch (error) {
        if (invalidateOnError) {
          // Invalidate cache on error
          const cacheKey = keyGenerator ? 
            keyGenerator(...args) : 
            generateMethodCacheKey(target.constructor.name, propertyName, args, keyPrefix);
          
          await CacheService.delete(cacheKey);
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Cache with user context decorator
 * @param {Object} options - Caching options
 * @returns {Function} Decorator function
 */
function CacheWithUser(options = {}) {
  const {
    ttl = CacheService.TTL.USER_DATA,
    userParam = 0 // Index of user parameter in method arguments
  } = options;

  return Cache({
    ...options,
    ttl,
    keyGenerator: (...args) => {
      const user = args[userParam];
      const userId = user?.id || user?.userId || 'anonymous';
      const methodKey = generateMethodCacheKey('', '', args.slice(1));
      return CacheService.generateKey(CacheService.PATTERNS.USER, `${userId}:${methodKey}`);
    }
  });
}

/**
 * Metrics cache decorator
 * @param {number} ttl - TTL in seconds (default: 5 minutes)
 * @returns {Function} Decorator function
 */
function CacheMetrics(ttl = CacheService.TTL.METRICS) {
  return Cache({
    ttl,
    keyPrefix: CacheService.PATTERNS.METRICS,
    keyGenerator: (...args) => {
      return CacheService.generateKey(CacheService.PATTERNS.METRICS, {
        method: 'metrics',
        args: args
      });
    }
  });
}

/**
 * Dashboard data cache decorator
 * @param {number} ttl - TTL in seconds (default: 3 minutes)
 * @returns {Function} Decorator function
 */
function CacheDashboard(ttl = CacheService.TTL.DASHBOARD) {
  return Cache({
    ttl,
    keyPrefix: CacheService.PATTERNS.DASHBOARD,
    keyGenerator: (...args) => {
      return CacheService.generateKey(CacheService.PATTERNS.DASHBOARD, {
        method: 'dashboard',
        args: args
      });
    }
  });
}

/**
 * Audit logs cache decorator
 * @param {number} ttl - TTL in seconds (default: 10 minutes)
 * @returns {Function} Decorator function
 */
function CacheAuditLogs(ttl = CacheService.TTL.AUDIT_LOGS) {
  return Cache({
    ttl,
    keyPrefix: CacheService.PATTERNS.AUDIT,
    keyGenerator: (...args) => {
      return CacheService.generateKey(CacheService.PATTERNS.AUDIT, {
        method: 'audit',
        args: args
      });
    }
  });
}

/**
 * Reports cache decorator
 * @param {number} ttl - TTL in seconds (default: 30 minutes)
 * @returns {Function} Decorator function
 */
function CacheReports(ttl = CacheService.TTL.REPORTS) {
  return Cache({
    ttl,
    keyPrefix: CacheService.PATTERNS.REPORT,
    keyGenerator: (...args) => {
      return CacheService.generateKey(CacheService.PATTERNS.REPORT, {
        method: 'report',
        args: args
      });
    }
  });
}

/**
 * Conditional cache decorator
 * @param {Function} conditionFn - Function to determine if caching should occur
 * @param {Object} options - Caching options
 * @returns {Function} Decorator function
 */
function CacheIf(conditionFn, options = {}) {
  return Cache({
    ...options,
    condition: conditionFn
  });
}

/**
 * Cache invalidation decorator
 * Invalidates cache when method is called
 * @param {Object} options - Invalidation options
 * @returns {Function} Decorator function
 */
function InvalidateCache(options = {}) {
  const {
    patterns = [],
    entityType = null,
    entityIdParam = 0
  } = options;

  return function(target, propertyName, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      try {
        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Invalidate cache patterns
        for (const pattern of patterns) {
          await CacheService.deleteByPattern(pattern);
        }

        // Invalidate by entity type if specified
        if (entityType) {
          const entityId = args[entityIdParam]?.id || args[entityIdParam];
          await CacheService.invalidateOnUpdate(entityType, entityId);
        }

        return result;
      } catch (error) {
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Memoize decorator with TTL
 * Simple in-memory cache for expensive computations
 * @param {number} ttl - TTL in milliseconds
 * @returns {Function} Decorator function
 */
function Memoize(ttl = 60000) {
  const cache = new Map();

  return function(target, propertyName, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function(...args) {
      const key = JSON.stringify(args);
      const now = Date.now();

      // Check if cached result exists and is still valid
      if (cache.has(key)) {
        const { result, timestamp } = cache.get(key);
        if (now - timestamp < ttl) {
          return result;
        } else {
          cache.delete(key);
        }
      }

      // Execute method and cache result
      const result = originalMethod.apply(this, args);
      cache.set(key, { result, timestamp: now });

      // Clean up expired entries periodically
      if (cache.size > 100) {
        for (const [cacheKey, { timestamp }] of cache.entries()) {
          if (now - timestamp >= ttl) {
            cache.delete(cacheKey);
          }
        }
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Rate limited cache decorator
 * Prevents cache flooding with rate limiting
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @param {Object} options - Cache options
 * @returns {Function} Decorator function
 */
function CacheRateLimited(maxRequests = 10, windowMs = 60000, options = {}) {
  const requestCounts = new Map();

  return function(target, propertyName, descriptor) {
    const cacheDecorator = Cache(options);
    const cachedDescriptor = cacheDecorator(target, propertyName, descriptor);
    const cachedMethod = cachedDescriptor.value;

    cachedDescriptor.value = async function(...args) {
      const clientId = this.clientId || 'default';
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      for (const [key, timestamps] of requestCounts.entries()) {
        const validTimestamps = timestamps.filter(t => t > windowStart);
        if (validTimestamps.length === 0) {
          requestCounts.delete(key);
        } else {
          requestCounts.set(key, validTimestamps);
        }
      }

      // Check rate limit
      const timestamps = requestCounts.get(clientId) || [];
      const recentRequests = timestamps.filter(t => t > windowStart);

      if (recentRequests.length >= maxRequests) {
        throw new Error('Rate limit exceeded for cached method');
      }

      // Record this request
      recentRequests.push(now);
      requestCounts.set(clientId, recentRequests);

      // Execute cached method
      return await cachedMethod.apply(this, args);
    };

    return cachedDescriptor;
  };
}

/**
 * Generate cache key for method calls
 * @param {string} className - Class name
 * @param {string} methodName - Method name
 * @param {Array} args - Method arguments
 * @param {string} prefix - Key prefix
 * @returns {string} Generated cache key
 */
function generateMethodCacheKey(className, methodName, args, prefix = '') {
  const argsHash = CacheService.generateKey('', args);
  return `${prefix}${className}:${methodName}:${argsHash}`;
}

/**
 * Cache warming decorator
 * Pre-populates cache with common values
 * @param {Function} warmupFn - Function to generate warmup data
 * @param {Object} options - Cache options
 * @returns {Function} Decorator function
 */
function CacheWarmup(warmupFn, options = {}) {
  return function(target, propertyName, descriptor) {
    const cacheDecorator = Cache(options);
    const cachedDescriptor = cacheDecorator(target, propertyName, descriptor);

    // Trigger warmup asynchronously
    setTimeout(async () => {
      try {
        await warmupFn();
      } catch (error) {
        console.error('Cache warmup error:', error);
      }
    }, 1000);

    return cachedDescriptor;
  };
}

module.exports = {
  Cache,
  CacheWithUser,
  CacheMetrics,
  CacheDashboard,
  CacheAuditLogs,
  CacheReports,
  CacheIf,
  InvalidateCache,
  Memoize,
  CacheRateLimited,
  CacheWarmup,
  generateMethodCacheKey
};