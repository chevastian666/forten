/**
 * Metrics Routes
 * Routes for dashboard metrics and KPI endpoints
 */

const express = require('express');
const MetricsController = require('../controllers/metrics.controller');
const { metricsCacheMiddleware, conditionalCacheMiddleware } = require('../middleware/cache.middleware');

const router = express.Router();

/**
 * Get all dashboard metrics (main endpoint)
 * @route GET /api/metrics/dashboard
 */
router.get('/dashboard', 
  metricsCacheMiddleware(30), // 30 second cache
  MetricsController.getDashboardMetrics
);

/**
 * Get overview metrics only
 * @route GET /api/metrics/overview
 */
router.get('/overview', 
  metricsCacheMiddleware(30),
  MetricsController.getOverviewMetrics
);

/**
 * Get events hourly metrics
 * @route GET /api/metrics/events/hourly
 */
router.get('/events/hourly', 
  metricsCacheMiddleware(60), // 1 minute cache for hourly data
  MetricsController.getEventsHourly
);

/**
 * Get access daily metrics
 * @route GET /api/metrics/access/daily
 */
router.get('/access/daily', 
  metricsCacheMiddleware(300), // 5 minute cache for daily data
  MetricsController.getAccessDaily
);

/**
 * Get active alerts metrics
 * @route GET /api/metrics/alerts
 */
router.get('/alerts', 
  metricsCacheMiddleware(15), // 15 second cache for alerts (more urgent)
  MetricsController.getAlertsMetrics
);

/**
 * Get devices status metrics
 * @route GET /api/metrics/devices
 */
router.get('/devices', 
  metricsCacheMiddleware(30),
  MetricsController.getDevicesMetrics
);

/**
 * Get comparison metrics with previous day
 * @route GET /api/metrics/comparisons
 */
router.get('/comparisons', 
  metricsCacheMiddleware(300), // 5 minute cache for comparisons
  MetricsController.getComparisons
);

/**
 * Get real-time metrics (WebSocket compatible)
 * @route GET /api/metrics/realtime
 */
router.get('/realtime', 
  conditionalCacheMiddleware(
    (req) => req.query.nocache !== 'true', // Allow bypassing cache with ?nocache=true
    { ttl: 10 } // Very short cache for real-time
  ),
  MetricsController.getRealTimeMetrics
);

/**
 * Get metrics history for trending
 * @route GET /api/metrics/history
 */
router.get('/history', 
  metricsCacheMiddleware(600), // 10 minute cache for history
  MetricsController.getMetricsHistory
);

/**
 * Force metrics update
 * @route POST /api/metrics/update
 */
router.post('/update', MetricsController.forceUpdate);

/**
 * Get metrics service status
 * @route GET /api/metrics/status
 */
router.get('/status', MetricsController.getStatus);

/**
 * Start metrics auto-update service
 * @route POST /api/metrics/start
 */
router.post('/start', MetricsController.startService);

/**
 * Stop metrics auto-update service
 * @route POST /api/metrics/stop
 */
router.post('/stop', MetricsController.stopService);

/**
 * Metrics health check
 * @route GET /api/metrics/health
 */
router.get('/health', async (req, res) => {
  try {
    const metricsService = require('../services/metrics.service');
    const health = await metricsService.healthCheck();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Metrics health check failed',
      error: error.message
    });
  }
});

module.exports = router;