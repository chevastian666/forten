/**
 * Cache Management Routes
 * Endpoints for managing Redis cache
 */

const express = require('express');
const CacheService = require('../services/cache.service');
const { metricsCacheMiddleware, userCacheMiddleware } = require('../middleware/cache.middleware');

const router = express.Router();

/**
 * Get cache statistics
 * @route GET /api/cache/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await CacheService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting cache statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Cache health check
 * @route GET /api/cache/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await CacheService.healthCheck();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Cache health check failed',
      error: error.message
    });
  }
});

/**
 * Clear cache by pattern
 * @route DELETE /api/cache/pattern/:pattern
 */
router.delete('/pattern/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    
    if (!pattern) {
      return res.status(400).json({
        success: false,
        message: 'Pattern parameter is required'
      });
    }

    const deletedCount = await CacheService.deleteByPattern(pattern);
    
    res.json({
      success: true,
      message: `Deleted ${deletedCount} cache entries`,
      data: { deletedCount, pattern }
    });
  } catch (error) {
    console.error('Cache pattern delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting cache pattern',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Clear specific cache key
 * @route DELETE /api/cache/key/:key
 */
router.delete('/key/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Key parameter is required'
      });
    }

    const deleted = await CacheService.delete(key);
    
    res.json({
      success: true,
      message: deleted ? 'Cache key deleted' : 'Cache key not found',
      data: { deleted, key }
    });
  } catch (error) {
    console.error('Cache key delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting cache key',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Clear all cache
 * @route DELETE /api/cache/all
 */
router.delete('/all', async (req, res) => {
  try {
    const cleared = await CacheService.clear();
    
    res.json({
      success: true,
      message: cleared ? 'All cache cleared' : 'Failed to clear cache',
      data: { cleared }
    });
  } catch (error) {
    console.error('Cache clear all error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing all cache',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get cache key details
 * @route GET /api/cache/key/:key
 */
router.get('/key/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Key parameter is required'
      });
    }

    const [exists, ttl, value] = await Promise.all([
      CacheService.exists(key),
      CacheService.getTTL(key),
      CacheService.get(key)
    ]);
    
    res.json({
      success: true,
      data: {
        key,
        exists,
        ttl,
        value: exists ? value : null,
        size: value ? JSON.stringify(value).length : 0
      }
    });
  } catch (error) {
    console.error('Cache key get error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting cache key',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Invalidate user cache
 * @route DELETE /api/cache/user/:userId
 */
router.delete('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID parameter is required'
      });
    }

    const deletedCount = await CacheService.invalidateUserCache(userId);
    
    res.json({
      success: true,
      message: `Invalidated ${deletedCount} cache entries for user`,
      data: { deletedCount, userId }
    });
  } catch (error) {
    console.error('User cache invalidation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error invalidating user cache',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Test cache functionality
 * @route POST /api/cache/test
 */
router.post('/test', async (req, res) => {
  try {
    const testKey = 'test:cache:functionality';
    const testData = {
      timestamp: Date.now(),
      message: 'Cache test successful',
      data: req.body || { test: true }
    };

    // Test set
    const setResult = await CacheService.set(testKey, testData, 60); // 1 minute TTL
    
    // Test get
    const getData = await CacheService.get(testKey);
    
    // Test exists
    const exists = await CacheService.exists(testKey);
    
    // Test TTL
    const ttl = await CacheService.getTTL(testKey);
    
    res.json({
      success: true,
      message: 'Cache test completed',
      data: {
        setResult,
        getData,
        exists,
        ttl,
        testKey
      }
    });
  } catch (error) {
    console.error('Cache test error:', error);
    res.status(500).json({
      success: false,
      message: 'Cache test failed',
      error: error.message
    });
  }
});

/**
 * Example cached endpoint with metrics cache
 * @route GET /api/cache/example/metrics
 */
router.get('/example/metrics', metricsCacheMiddleware(), (req, res) => {
  // Simulate expensive metrics calculation
  const metrics = {
    timestamp: Date.now(),
    users: Math.floor(Math.random() * 1000),
    events: Math.floor(Math.random() * 5000),
    buildings: Math.floor(Math.random() * 100),
    uptime: process.uptime()
  };

  res.json({
    success: true,
    data: metrics,
    cached: false // Will be overridden by cache middleware
  });
});

/**
 * Example cached endpoint with user-specific cache
 * @route GET /api/cache/example/user-data
 */
router.get('/example/user-data', userCacheMiddleware(), (req, res) => {
  // Mock user data
  const userData = {
    timestamp: Date.now(),
    userId: req.user?.id || 'anonymous',
    permissions: ['read', 'write'],
    preferences: {
      theme: 'dark',
      language: 'es'
    }
  };

  res.json({
    success: true,
    data: userData,
    cached: false // Will be overridden by cache middleware
  });
});

module.exports = router;