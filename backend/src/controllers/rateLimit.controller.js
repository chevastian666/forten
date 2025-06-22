/**
 * Rate Limit Controller
 * Manages rate limiting information and controls
 */

const { getRateLimitStatus, RATE_LIMITS, STRICT_RATE_LIMITS, IP_WHITELIST, CRITICAL_ENDPOINTS } = require('../middleware/rateLimiter.middleware');

class RateLimitController {
  /**
   * Get current rate limit status for the requesting user
   * @route GET /api/rate-limit/status
   */
  static async getStatus(req, res) {
    try {
      const status = await getRateLimitStatus(req);
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving rate limit status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get rate limit configuration
   * @route GET /api/rate-limit/config
   */
  static async getConfig(req, res) {
    try {
      const config = {
        roles: {
          admin: {
            hourly: RATE_LIMITS.admin,
            strict: STRICT_RATE_LIMITS.admin,
            description: 'Administrator - highest limits'
          },
          operator: {
            hourly: RATE_LIMITS.operator,
            strict: STRICT_RATE_LIMITS.operator,
            description: 'Operator - moderate limits'
          },
          viewer: {
            hourly: RATE_LIMITS.viewer,
            strict: STRICT_RATE_LIMITS.viewer,
            description: 'Viewer - basic limits'
          },
          guest: {
            hourly: RATE_LIMITS.guest,
            strict: STRICT_RATE_LIMITS.guest,
            description: 'Guest - minimal limits'
          }
        },
        criticalEndpoints: CRITICAL_ENDPOINTS,
        whitelistSize: IP_WHITELIST.length,
        policies: {
          auth: 'Authentication endpoints: 5-20 requests per minute',
          api: 'API endpoints: 20-200 requests per minute',
          global: 'Global limit: 10,000 requests per 15 minutes'
        }
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error getting rate limit config:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving rate limit configuration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Test rate limiting (for development/testing)
   * @route POST /api/rate-limit/test
   */
  static async testRateLimit(req, res) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          message: 'Rate limit testing not available in production'
        });
      }

      const { endpoint, iterations = 1 } = req.body;
      
      // Simulate multiple requests to test rate limiting
      const results = [];
      
      for (let i = 0; i < Math.min(iterations, 10); i++) {
        const testResult = {
          iteration: i + 1,
          timestamp: new Date().toISOString(),
          headers: {
            'X-RateLimit-Limit': res.get('X-RateLimit-Limit'),
            'X-RateLimit-Remaining': res.get('X-RateLimit-Remaining'),
            'X-RateLimit-Reset': res.get('X-RateLimit-Reset')
          }
        };
        results.push(testResult);
      }

      res.json({
        success: true,
        message: 'Rate limit test completed',
        data: {
          endpoint: endpoint || req.path,
          iterations: iterations,
          results: results,
          userRole: req.user?.role || 'guest',
          userIP: req.ip
        }
      });
    } catch (error) {
      console.error('Error testing rate limit:', error);
      res.status(500).json({
        success: false,
        message: 'Error testing rate limit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get rate limit health check
   * @route GET /api/rate-limit/health
   */
  static async healthCheck(req, res) {
    try {
      const { getRedisClient } = require('../config/redis');
      const redisClient = getRedisClient();
      
      const health = {
        status: 'healthy',
        redisConnected: !!redisClient,
        timestamp: new Date().toISOString(),
        policies: {
          rolesConfigured: Object.keys(RATE_LIMITS).length,
          criticalEndpoints: CRITICAL_ENDPOINTS.length,
          whitelistedIPs: IP_WHITELIST.length
        }
      };

      // Test Redis connection if available
      if (redisClient) {
        try {
          await redisClient.ping();
          health.redisStatus = 'connected';
        } catch (error) {
          health.redisStatus = 'error';
          health.redisError = error.message;
        }
      } else {
        health.redisStatus = 'not_available';
        health.warning = 'Using memory store for rate limiting';
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health
      });
    } catch (error) {
      console.error('Rate limit health check error:', error);
      res.status(503).json({
        success: false,
        message: 'Rate limit health check failed',
        error: error.message
      });
    }
  }

  /**
   * Get rate limit statistics
   * @route GET /api/rate-limit/stats
   */
  static async getStats(req, res) {
    try {
      const { getRedisClient } = require('../config/redis');
      const redisClient = getRedisClient();
      
      if (!redisClient) {
        return res.status(503).json({
          success: false,
          message: 'Redis not available for statistics'
        });
      }

      // Get rate limit keys from Redis
      const keys = await redisClient.keys('rl*');
      
      const stats = {
        totalKeys: keys.length,
        keysByType: {},
        activeUsers: new Set(),
        activeIPs: new Set()
      };

      // Analyze keys
      for (const key of keys) {
        const parts = key.split(':');
        const type = parts[1] || 'unknown';
        const role = parts[2] || 'unknown';
        const userId = parts[3] || 'anonymous';
        const ip = parts[4] || 'unknown';

        // Count by type
        stats.keysByType[type] = (stats.keysByType[type] || 0) + 1;

        // Track unique users and IPs
        if (userId !== 'anonymous') {
          stats.activeUsers.add(userId);
        }
        if (ip !== 'unknown') {
          stats.activeIPs.add(ip);
        }
      }

      // Convert sets to counts
      stats.uniqueActiveUsers = stats.activeUsers.size;
      stats.uniqueActiveIPs = stats.activeIPs.size;
      delete stats.activeUsers;
      delete stats.activeIPs;

      // Add rate limit configuration summary
      stats.configuration = {
        roles: Object.keys(RATE_LIMITS),
        criticalEndpoints: CRITICAL_ENDPOINTS.length,
        whitelistedIPs: IP_WHITELIST.length
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting rate limit stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving rate limit statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Clear rate limit data for a user (admin only)
   * @route DELETE /api/rate-limit/clear/:userId
   */
  static async clearUserRateLimit(req, res) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const { userId } = req.params;
      const { getRedisClient } = require('../config/redis');
      const redisClient = getRedisClient();
      
      if (!redisClient) {
        return res.status(503).json({
          success: false,
          message: 'Redis not available'
        });
      }

      // Find and delete all rate limit keys for this user
      const pattern = `rl*:*:${userId}:*`;
      const keys = await redisClient.keys(pattern);
      
      let deletedCount = 0;
      if (keys.length > 0) {
        deletedCount = await redisClient.del(...keys);
      }

      res.json({
        success: true,
        message: `Cleared rate limit data for user ${userId}`,
        data: {
          userId,
          deletedKeys: deletedCount,
          clearedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error clearing user rate limit:', error);
      res.status(500).json({
        success: false,
        message: 'Error clearing user rate limit data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get current user's rate limit usage
   * @route GET /api/rate-limit/usage
   */
  static async getCurrentUsage(req, res) {
    try {
      const status = await getRateLimitStatus(req);
      
      if (status.error) {
        return res.status(503).json({
          success: false,
          message: 'Could not retrieve usage data',
          error: status.error
        });
      }

      // Calculate usage percentages
      const usage = {
        role: status.role,
        ip: status.ip,
        isWhitelisted: status.isWhitelisted,
        usage: {}
      };

      // Calculate percentage usage for each limit type
      Object.keys(status.limits).forEach(limitType => {
        const limit = status.limits[limitType];
        const current = status.current[limitType];
        
        if (typeof limit === 'object' && limit.max) {
          usage.usage[limitType] = {
            current: current,
            limit: limit.max,
            percentage: Math.round((current / limit.max) * 100),
            remaining: limit.max - current,
            windowMs: limit.windowMs,
            resetTime: new Date(Date.now() + limit.windowMs).toISOString()
          };
        }
      });

      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      console.error('Error getting current usage:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving current usage',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = RateLimitController;