/**
 * Advanced Rate Limiter Middleware
 * Role-based rate limiting with Redis storage and IP whitelist
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { getRedisClient } = require('../config/redis');
const { logSecurity } = require('../config/logger');

// Rate limits by user role (requests per hour)
const RATE_LIMITS = {
  admin: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // 1000 requests per hour
    message: 'Too many requests from admin user. Limit: 1000 requests per hour.'
  },
  operator: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 500, // 500 requests per hour
    message: 'Too many requests from operator user. Limit: 500 requests per hour.'
  },
  viewer: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 requests per hour
    message: 'Too many requests from viewer user. Limit: 100 requests per hour.'
  },
  guest: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 requests per hour for unauthenticated users
    message: 'Too many requests from guest user. Limit: 50 requests per hour.'
  }
};

// Strict rate limits for critical endpoints (per 15 minutes)
const STRICT_RATE_LIMITS = {
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests to critical endpoint. Limit: 100 requests per 15 minutes.'
  },
  operator: {
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Too many requests to critical endpoint. Limit: 50 requests per 15 minutes.'
  },
  viewer: {
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many requests to critical endpoint. Limit: 20 requests per 15 minutes.'
  },
  guest: {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many requests to critical endpoint. Limit: 10 requests per 15 minutes.'
  }
};

// IP whitelist - these IPs bypass rate limiting
const IP_WHITELIST = [
  '127.0.0.1',
  '::1',
  'localhost',
  // Add more IPs from environment variable
  ...(process.env.RATE_LIMIT_WHITELIST ? process.env.RATE_LIMIT_WHITELIST.split(',') : [])
];

// Critical endpoints that need stricter limits
const CRITICAL_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/users',
  '/api/admin',
  '/api/export'
];

/**
 * Get client IP address with proxy support
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

/**
 * Check if IP is in whitelist
 */
function isWhitelistedIP(ip) {
  return IP_WHITELIST.includes(ip) || 
         IP_WHITELIST.some(whitelistIP => {
           // Support CIDR notation check if needed
           return ip === whitelistIP;
         });
}

/**
 * Get user role from request
 */
function getUserRole(req) {
  // Priority order: user object, token payload, default guest
  return req.user?.role || req.userRole || 'guest';
}

/**
 * Generate rate limit key
 */
function generateKey(req, prefix = 'rl') {
  const ip = getClientIP(req);
  const userId = req.user?.id || 'anonymous';
  const role = getUserRole(req);
  
  return `${prefix}:${role}:${userId}:${ip}`;
}

/**
 * Create Redis store for rate limiting
 */
function createRedisStore() {
  const redisClient = getRedisClient();
  
  if (!redisClient) {
    logSecurity('Redis not available for rate limiting', {
      fallback: 'memory store'
    });
    return undefined; // Will use default memory store
  }
  
  return new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  });
}

/**
 * Custom error handler for rate limit exceeded
 */
function createRateLimitHandler(req, res, next, options) {
  const ip = getClientIP(req);
  const role = getUserRole(req);
  const userId = req.user?.id || 'anonymous';
  
  // Log rate limit violation
  logSecurity('Rate limit exceeded', {
    ip,
    role,
    userId,
    endpoint: req.path,
    method: req.method
  });
  
  // Custom error response
  const error = {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: options.message,
    details: {
      limit: options.max,
      windowMs: options.windowMs,
      retryAfter: Math.ceil(options.windowMs / 1000),
      role: role,
      endpoint: req.path
    },
    timestamp: new Date().toISOString()
  };
  
  // Set retry-after header
  res.set('Retry-After', Math.ceil(options.windowMs / 1000));
  res.set('X-RateLimit-Limit', options.max);
  res.set('X-RateLimit-Remaining', 0);
  res.set('X-RateLimit-Reset', new Date(Date.now() + options.windowMs).toISOString());
  
  return res.status(429).json(error);
}

/**
 * Create rate limiter middleware with role-based limits
 */
function createRateLimiter(isStrict = false) {
  const limits = isStrict ? STRICT_RATE_LIMITS : RATE_LIMITS;
  const keyPrefix = isStrict ? 'rl_strict' : 'rl_normal';
  
  return async (req, res, next) => {
    try {
      const ip = getClientIP(req);
      
      // Check if IP is whitelisted
      if (isWhitelistedIP(ip)) {
        logSecurity('Whitelisted IP bypassing rate limit', {
          ip,
          userId: req.user?.id
        });
        return next();
      }
      
      const role = getUserRole(req);
      const limits_config = limits[role] || limits.guest;
      
      // Create dynamic rate limiter for this role
      const limiter = rateLimit({
        windowMs: limits_config.windowMs,
        max: limits_config.max,
        message: limits_config.message,
        store: createRedisStore(),
        keyGenerator: (req) => generateKey(req, keyPrefix),
        standardHeaders: true, // Return rate limit info in headers
        legacyHeaders: false,
        skip: (req) => {
          // Additional skip logic if needed
          return false;
        },
        handler: (req, res, next, options) => {
          return createRateLimitHandler(req, res, next, {
            ...options,
            message: limits_config.message
          });
        },
        onLimitReached: (req, res, options) => {
          logSecurity('Rate limit warning', {
            role,
            path: req.path,
            remaining: req.rateLimit?.remaining || 0,
            userId: req.user?.id
          });
        }
      });
      
      // Apply the rate limiter
      return limiter(req, res, next);
      
    } catch (error) {
      logSecurity('Rate limiter error', {
        error: error.message,
        path: req.path,
        userId: req.user?.id
      });
      // Continue without rate limiting on error
      return next();
    }
  };
}

/**
 * Role-based rate limiter middleware
 */
const roleBasedRateLimit = createRateLimiter(false);

/**
 * Strict rate limiter for critical endpoints
 */
const strictRateLimit = createRateLimiter(true);

/**
 * Adaptive rate limiter that chooses strict or normal based on endpoint
 */
function adaptiveRateLimit(req, res, next) {
  const isStrict = CRITICAL_ENDPOINTS.some(endpoint => 
    req.path.startsWith(endpoint)
  );
  
  if (isStrict) {
    return strictRateLimit(req, res, next);
  } else {
    return roleBasedRateLimit(req, res, next);
  }
}

/**
 * Very strict rate limiter for auth endpoints (per minute)
 */
const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    const role = getUserRole(req);
    switch (role) {
      case 'admin': return 20;
      case 'operator': return 15;
      case 'viewer': return 10;
      default: return 5; // guest
    }
  },
  message: 'Too many authentication attempts. Please try again later.',
  store: createRedisStore(),
  keyGenerator: (req) => generateKey(req, 'rl_auth'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = getClientIP(req);
    return isWhitelistedIP(ip);
  },
  handler: (req, res, next, options) => {
    return createRateLimitHandler(req, res, next, {
      ...options,
      message: 'Too many authentication attempts. Please try again in 1 minute.'
    });
  }
});

/**
 * API rate limiter for general API endpoints (per minute)
 */
const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    const role = getUserRole(req);
    switch (role) {
      case 'admin': return 200;
      case 'operator': return 100;
      case 'viewer': return 50;
      default: return 20; // guest
    }
  },
  message: 'Too many API requests. Please slow down.',
  store: createRedisStore(),
  keyGenerator: (req) => generateKey(req, 'rl_api'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = getClientIP(req);
    return isWhitelistedIP(ip);
  },
  handler: (req, res, next, options) => {
    const role = getUserRole(req);
    const limits = {
      admin: 200,
      operator: 100,
      viewer: 50,
      guest: 20
    };
    
    return createRateLimitHandler(req, res, next, {
      ...options,
      max: limits[role] || limits.guest,
      message: `API rate limit exceeded for ${role}. Limit: ${limits[role] || limits.guest} requests per minute.`
    });
  }
});

/**
 * Global rate limiter (very permissive, just to prevent abuse)
 */
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Very high limit
  message: 'Global rate limit exceeded. Server is under heavy load.',
  store: createRedisStore(),
  keyGenerator: (req) => `rl_global:${getClientIP(req)}`,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = getClientIP(req);
    return isWhitelistedIP(ip);
  }
});

/**
 * Get rate limit status for a user
 */
async function getRateLimitStatus(req) {
  try {
    const redisClient = getRedisClient();
    if (!redisClient) {
      return { error: 'Redis not available' };
    }
    
    const role = getUserRole(req);
    const ip = getClientIP(req);
    const userId = req.user?.id || 'anonymous';
    
    const keys = [
      generateKey(req, 'rl_normal'),
      generateKey(req, 'rl_strict'), 
      generateKey(req, 'rl_auth'),
      generateKey(req, 'rl_api')
    ];
    
    const values = await Promise.all(
      keys.map(key => redisClient.get(key))
    );
    
    return {
      role,
      ip,
      userId,
      limits: {
        normal: RATE_LIMITS[role],
        strict: STRICT_RATE_LIMITS[role],
        auth: '5-20 per minute',
        api: '20-200 per minute'
      },
      current: {
        normal: parseInt(values[0]) || 0,
        strict: parseInt(values[1]) || 0,
        auth: parseInt(values[2]) || 0,
        api: parseInt(values[3]) || 0
      },
      isWhitelisted: isWhitelistedIP(ip)
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Middleware to add rate limit info to response headers
 */
function addRateLimitHeaders(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(data) {
    const role = getUserRole(req);
    const limits = RATE_LIMITS[role] || RATE_LIMITS.guest;
    
    // Add custom headers
    res.set('X-RateLimit-User-Role', role);
    res.set('X-RateLimit-Policy', `${limits.max} requests per ${limits.windowMs / 1000} seconds`);
    res.set('X-RateLimit-Whitelist-Status', isWhitelistedIP(getClientIP(req)) ? 'whitelisted' : 'normal');
    
    return originalSend.call(this, data);
  };
  
  next();
}

module.exports = {
  roleBasedRateLimit,
  strictRateLimit,
  adaptiveRateLimit,
  authRateLimit,
  apiRateLimit,
  globalRateLimit,
  addRateLimitHeaders,
  getRateLimitStatus,
  getClientIP,
  isWhitelistedIP,
  getUserRole,
  RATE_LIMITS,
  STRICT_RATE_LIMITS,
  IP_WHITELIST,
  CRITICAL_ENDPOINTS
};