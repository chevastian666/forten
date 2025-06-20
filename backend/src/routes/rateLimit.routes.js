/**
 * Rate Limit Routes
 * Endpoints for managing and monitoring rate limits
 */

const express = require('express');
const RateLimitController = require('../controllers/rateLimit.controller');
const { addRateLimitHeaders } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

// Add rate limit headers to all rate limit routes
router.use(addRateLimitHeaders);

/**
 * Get current user's rate limit status
 * @route GET /api/rate-limit/status
 */
router.get('/status', RateLimitController.getStatus);

/**
 * Get rate limit configuration
 * @route GET /api/rate-limit/config
 */
router.get('/config', RateLimitController.getConfig);

/**
 * Get current user's rate limit usage
 * @route GET /api/rate-limit/usage
 */
router.get('/usage', RateLimitController.getCurrentUsage);

/**
 * Rate limit health check
 * @route GET /api/rate-limit/health
 */
router.get('/health', RateLimitController.healthCheck);

/**
 * Get rate limit statistics (admin only)
 * @route GET /api/rate-limit/stats
 */
router.get('/stats', (req, res, next) => {
  // Simple role check - in production, use proper auth middleware
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}, RateLimitController.getStats);

/**
 * Test rate limiting (development only)
 * @route POST /api/rate-limit/test
 */
router.post('/test', RateLimitController.testRateLimit);

/**
 * Clear rate limit data for a user (admin only)
 * @route DELETE /api/rate-limit/clear/:userId
 */
router.delete('/clear/:userId', RateLimitController.clearUserRateLimit);

module.exports = router;