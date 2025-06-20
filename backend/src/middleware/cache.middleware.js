/**
 * Cache Middleware
 * Express middleware for automatic caching of HTTP responses
 */

const CacheService = require('../services/cache.service');

/**
 * Cache middleware factory
 * @param {Object} options - Caching options
 * @returns {Function} Express middleware
 */
function cacheMiddleware(options = {}) {
  const {
    ttl = CacheService.TTL.STATIC_DATA,
    keyGenerator = null,
    skipCache = null,
    onlyMethods = ['GET'],
    excludePaths = ['/health', '/metrics'],
    includeQuery = true,
    includeHeaders = [],
    varyBy = []
  } = options;

  return async (req, res, next) => {
    // Skip if method not in allowed methods
    if (!onlyMethods.includes(req.method)) {
      return next();
    }

    // Skip if path is excluded
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Skip cache if condition is met
    if (skipCache && skipCache(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator ? 
      keyGenerator(req) : 
      generateDefaultKey(req, { includeQuery, includeHeaders, varyBy });

    try {
      // Try to get from cache
      const cachedResponse = await CacheService.get(cacheKey);
      
      if (cachedResponse) {
        // Cache hit - return cached response
        res.set(cachedResponse.headers || {});
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        return res.status(cachedResponse.status || 200).json(cachedResponse.data);
      }

      // Cache miss - continue to route handler
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);

      // Override response methods to capture response
      const originalJson = res.json;
      const originalSend = res.send;
      const originalStatus = res.status;
      let statusCode = 200;

      res.status = function(code) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      res.json = function(data) {
        // Only cache successful responses
        if (statusCode >= 200 && statusCode < 300) {
          const responseToCache = {
            data: data,
            status: statusCode,
            headers: getHeadersToCache(res.getHeaders(), includeHeaders),
            timestamp: Date.now()
          };

          // Cache the response asynchronously
          CacheService.set(cacheKey, responseToCache, ttl)
            .catch(error => console.error('Cache set error:', error));
        }

        return originalJson.call(this, data);
      };

      res.send = function(data) {
        // Only cache successful responses
        if (statusCode >= 200 && statusCode < 300) {
          const responseToCache = {
            data: data,
            status: statusCode,
            headers: getHeadersToCache(res.getHeaders(), includeHeaders),
            timestamp: Date.now()
          };

          // Cache the response asynchronously
          CacheService.set(cacheKey, responseToCache, ttl)
            .catch(error => console.error('Cache set error:', error));
        }

        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Generate default cache key
 * @param {Object} req - Express request
 * @param {Object} options - Key generation options
 * @returns {string} Generated cache key
 */
function generateDefaultKey(req, options = {}) {
  const { includeQuery, includeHeaders, varyBy } = options;
  
  let keyParts = [
    req.method,
    req.path
  ];

  // Include query parameters
  if (includeQuery && Object.keys(req.query).length > 0) {
    const sortedQuery = Object.keys(req.query)
      .sort()
      .map(key => `${key}=${req.query[key]}`)
      .join('&');
    keyParts.push(`query:${sortedQuery}`);
  }

  // Include specific headers
  if (includeHeaders.length > 0) {
    const headerValues = includeHeaders
      .map(header => `${header}:${req.get(header) || ''}`)
      .join('|');
    keyParts.push(`headers:${headerValues}`);
  }

  // Include vary-by fields
  if (varyBy.length > 0) {
    const varyValues = varyBy
      .map(field => {
        if (field.startsWith('user.')) {
          const userField = field.substring(5);
          return `user.${userField}:${req.user?.[userField] || ''}`;
        }
        if (field === 'userId') {
          return `userId:${req.user?.id || ''}`;
        }
        return `${field}:${req[field] || ''}`;
      })
      .join('|');
    keyParts.push(`vary:${varyValues}`);
  }

  return CacheService.generateKey('http:', keyParts.join('|'));
}

/**
 * Get headers to cache
 * @param {Object} headers - Response headers
 * @param {Array} includeHeaders - Headers to include in cache
 * @returns {Object} Headers to cache
 */
function getHeadersToCache(headers, includeHeaders = []) {
  const headersToCache = {};
  
  // Always include content-type
  if (headers['content-type']) {
    headersToCache['content-type'] = headers['content-type'];
  }

  // Include specified headers
  includeHeaders.forEach(header => {
    const lowerHeader = header.toLowerCase();
    if (headers[lowerHeader]) {
      headersToCache[lowerHeader] = headers[lowerHeader];
    }
  });

  return headersToCache;
}

/**
 * Cache invalidation middleware
 * Automatically invalidates cache on data modifications
 */
function cacheInvalidationMiddleware() {
  return async (req, res, next) => {
    // Only process modification methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Store original response methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to trigger cache invalidation
    res.json = function(data) {
      // Trigger cache invalidation after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        triggerCacheInvalidation(req, data)
          .catch(error => console.error('Cache invalidation error:', error));
      }
      return originalJson.call(this, data);
    };

    res.send = function(data) {
      // Trigger cache invalidation after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        triggerCacheInvalidation(req, data)
          .catch(error => console.error('Cache invalidation error:', error));
      }
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Trigger cache invalidation based on request
 * @param {Object} req - Express request
 * @param {any} responseData - Response data
 * @returns {Promise<void>}
 */
async function triggerCacheInvalidation(req, responseData) {
  try {
    // Determine entity type from path
    const pathParts = req.path.split('/').filter(Boolean);
    let entityType = 'unknown';
    let entityId = null;

    if (pathParts.length >= 2 && pathParts[0] === 'api') {
      entityType = pathParts[1].replace(/s$/, ''); // Remove plural 's'
      
      // Try to get entity ID from params or response
      entityId = req.params.id || responseData?.id || null;
    }

    // Invalidate related caches
    await CacheService.invalidateOnUpdate(entityType, entityId);
    
    console.log(`Cache invalidated for entity: ${entityType}, id: ${entityId}`);
  } catch (error) {
    console.error('Cache invalidation trigger error:', error);
  }
}

/**
 * Cache warming middleware
 * Pre-populates cache with common queries
 */
function cacheWarmingMiddleware() {
  return async (req, res, next) => {
    // Add cache warming logic here if needed
    next();
  };
}

/**
 * User-specific cache middleware
 * Caches data per user
 */
function userCacheMiddleware(options = {}) {
  return cacheMiddleware({
    ...options,
    varyBy: ['userId'],
    keyGenerator: (req) => {
      const userId = req.user?.id || 'anonymous';
      const baseKey = generateDefaultKey(req, options);
      return `user:${userId}:${baseKey}`;
    }
  });
}

/**
 * Metrics cache middleware
 * Specialized for dashboard metrics with short TTL
 */
function metricsCacheMiddleware(ttl = CacheService.TTL.METRICS) {
  return cacheMiddleware({
    ttl: ttl,
    varyBy: ['userId'],
    keyGenerator: (req) => {
      const userId = req.user?.id || 'anonymous';
      return CacheService.generateKey(CacheService.PATTERNS.METRICS, {
        userId,
        path: req.path,
        query: req.query
      });
    }
  });
}

/**
 * Conditional cache middleware
 * Only caches if condition is met
 */
function conditionalCacheMiddleware(condition, options = {}) {
  return cacheMiddleware({
    ...options,
    skipCache: (req) => !condition(req)
  });
}

module.exports = {
  cacheMiddleware,
  cacheInvalidationMiddleware,
  cacheWarmingMiddleware,
  userCacheMiddleware,
  metricsCacheMiddleware,
  conditionalCacheMiddleware,
  generateDefaultKey
};