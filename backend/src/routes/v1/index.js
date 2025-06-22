/**
 * API v1 Routes (Deprecated)
 * Legacy endpoints for backward compatibility
 */

const express = require('express');
const router = express.Router();

// Import existing route modules for v1 compatibility
const auditRoutes = require('../audit.routes');
const cacheRoutes = require('../cache.routes');
const metricsRoutes = require('../metrics.routes');
const rateLimitRoutes = require('../rateLimit.routes');
const notificationRoutes = require('../notification.routes');
const websocketRoutes = require('../websocket.routes');
const exportRoutes = require('../export.routes');
const pinRoutes = require('../pin.routes');
const eventRoutes = require('../event.routes');
const accessRoutes = require('../access.routes');
const webhookRoutes = require('../webhook.routes');
const statisticsRoutes = require('../statistics.routes');
const softDeleteRoutes = require('../softDelete.routes');
const geolocationRoutes = require('../geolocation.routes');

// V1 specific middleware for compatibility
const v1CompatibilityMiddleware = (req, res, next) => {
  // Add v1 specific headers
  res.setHeader('X-API-Version', '1');
  res.setHeader('X-Deprecation-Warning', 'This API version will be removed on 2025-06-30');
  
  // Transform request for v1 compatibility if needed
  // This is where you'd handle any breaking changes between v1 and v2
  
  next();
};

router.use(v1CompatibilityMiddleware);

// Mount all existing routes under v1
router.use('/audit-logs', auditRoutes);
router.use('/cache', cacheRoutes);
router.use('/metrics', metricsRoutes);
router.use('/rate-limit', rateLimitRoutes);
router.use('/notifications', notificationRoutes);
router.use('/websocket', websocketRoutes);
router.use('/export', exportRoutes);
router.use('/pins', pinRoutes);
router.use('/events', eventRoutes);
router.use('/access', accessRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/soft-deletes', softDeleteRoutes);
router.use('/geolocation', geolocationRoutes);

// V1 specific endpoints that might differ from v2
router.get('/info', (req, res) => {
  res.json({
    success: true,
    version: '1.0.0',
    status: 'deprecated',
    message: 'API v1 is deprecated. Please migrate to v2.',
    deprecation_date: '2024-12-31',
    sunset_date: '2025-06-30',
    migration_guide: 'https://docs.forten.com/api/migration'
  });
});

// Legacy health check format
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1',
    timestamp: new Date().toISOString(),
    deprecated: true
  });
});

module.exports = router;