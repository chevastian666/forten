/**
 * Metrics Controller
 * Handles dashboard metrics endpoints with real-time KPI data
 */

const metricsService = require('../services/metrics.service');
const CacheService = require('../services/cache.service');
const { metricsCacheMiddleware } = require('../middleware/cache.middleware');

class MetricsController {
  /**
   * Get all dashboard metrics
   * @route GET /api/metrics/dashboard
   */
  static async getDashboardMetrics(req, res) {
    try {
      // Try to get from cache first
      let metrics = await metricsService.getCachedMetrics('realtime');
      
      if (!metrics) {
        // If no cached data, force update
        console.log('No cached metrics found, forcing update...');
        await metricsService.forceUpdate();
        metrics = await metricsService.getCachedMetrics('realtime');
      }

      if (!metrics) {
        return res.status(503).json({
          success: false,
          message: 'Metrics service temporarily unavailable',
          error: 'Unable to generate metrics data'
        });
      }

      res.set('X-Cache', 'HIT');
      res.json({
        success: true,
        data: metrics,
        meta: {
          cached: true,
          updateInterval: 30000, // 30 seconds
          nextUpdate: new Date(Date.now() + 30000).toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get overview metrics only
   * @route GET /api/metrics/overview
   */
  static async getOverviewMetrics(req, res) {
    try {
      const overview = await metricsService.getCachedMetrics('overview');
      
      if (!overview) {
        return res.status(404).json({
          success: false,
          message: 'Overview metrics not available'
        });
      }

      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      console.error('Error fetching overview metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching overview metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get events hourly metrics
   * @route GET /api/metrics/events/hourly
   */
  static async getEventsHourly(req, res) {
    try {
      const events = await metricsService.getCachedMetrics('events');
      
      if (!events) {
        return res.status(404).json({
          success: false,
          message: 'Events metrics not available'
        });
      }

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error('Error fetching events metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching events metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get access daily metrics
   * @route GET /api/metrics/access/daily
   */
  static async getAccessDaily(req, res) {
    try {
      const access = await metricsService.getCachedMetrics('access');
      
      if (!access) {
        return res.status(404).json({
          success: false,
          message: 'Access metrics not available'
        });
      }

      res.json({
        success: true,
        data: access
      });
    } catch (error) {
      console.error('Error fetching access metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching access metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get active alerts metrics
   * @route GET /api/metrics/alerts
   */
  static async getAlertsMetrics(req, res) {
    try {
      const alerts = await metricsService.getCachedMetrics('alerts');
      
      if (!alerts) {
        return res.status(404).json({
          success: false,
          message: 'Alerts metrics not available'
        });
      }

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('Error fetching alerts metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching alerts metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get devices status metrics
   * @route GET /api/metrics/devices
   */
  static async getDevicesMetrics(req, res) {
    try {
      const devices = await metricsService.getCachedMetrics('devices');
      
      if (!devices) {
        return res.status(404).json({
          success: false,
          message: 'Devices metrics not available'
        });
      }

      res.json({
        success: true,
        data: devices
      });
    } catch (error) {
      console.error('Error fetching devices metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching devices metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get comparison metrics with previous day
   * @route GET /api/metrics/comparisons
   */
  static async getComparisons(req, res) {
    try {
      const comparisons = await metricsService.getCachedMetrics('comparisons');
      
      if (!comparisons) {
        return res.status(404).json({
          success: false,
          message: 'Comparison metrics not available'
        });
      }

      res.json({
        success: true,
        data: comparisons
      });
    } catch (error) {
      console.error('Error fetching comparison metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching comparison metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Force metrics update
   * @route POST /api/metrics/update
   */
  static async forceUpdate(req, res) {
    try {
      console.log('Force metrics update requested');
      
      const startTime = Date.now();
      await metricsService.forceUpdate();
      const duration = Date.now() - startTime;

      const metrics = await metricsService.getCachedMetrics('realtime');
      
      res.json({
        success: true,
        message: 'Metrics updated successfully',
        data: {
          updateDuration: duration,
          lastUpdate: new Date().toISOString(),
          metrics: metrics
        }
      });
    } catch (error) {
      console.error('Error forcing metrics update:', error);
      res.status(500).json({
        success: false,
        message: 'Error forcing metrics update',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get metrics service status
   * @route GET /api/metrics/status
   */
  static async getStatus(req, res) {
    try {
      const status = metricsService.getStatus();
      const health = await metricsService.healthCheck();
      
      res.json({
        success: true,
        data: {
          ...status,
          health: health
        }
      });
    } catch (error) {
      console.error('Error getting metrics status:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting metrics status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Start metrics auto-update service
   * @route POST /api/metrics/start
   */
  static async startService(req, res) {
    try {
      metricsService.startAutoUpdate();
      
      res.json({
        success: true,
        message: 'Metrics auto-update service started',
        data: metricsService.getStatus()
      });
    } catch (error) {
      console.error('Error starting metrics service:', error);
      res.status(500).json({
        success: false,
        message: 'Error starting metrics service',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Stop metrics auto-update service
   * @route POST /api/metrics/stop
   */
  static async stopService(req, res) {
    try {
      metricsService.stopAutoUpdate();
      
      res.json({
        success: true,
        message: 'Metrics auto-update service stopped',
        data: metricsService.getStatus()
      });
    } catch (error) {
      console.error('Error stopping metrics service:', error);
      res.status(500).json({
        success: false,
        message: 'Error stopping metrics service',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get real-time metrics (WebSocket compatible)
   * @route GET /api/metrics/realtime
   */
  static async getRealTimeMetrics(req, res) {
    try {
      const metrics = await metricsService.getCachedMetrics('realtime');
      
      if (!metrics) {
        return res.status(503).json({
          success: false,
          message: 'Real-time metrics not available'
        });
      }

      // Add real-time indicators
      const realTimeData = {
        ...metrics,
        realTime: {
          timestamp: new Date().toISOString(),
          isLive: true,
          latency: Date.now() - new Date(metrics.lastUpdate).getTime(),
          nextUpdate: Date.now() + (30000 - (Date.now() % 30000)) // Next 30-second boundary
        }
      };

      res.json({
        success: true,
        data: realTimeData
      });
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching real-time metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get metrics history for trending
   * @route GET /api/metrics/history
   */
  static async getMetricsHistory(req, res) {
    try {
      const { period = '24h', metric = 'all' } = req.query;
      
      // This would typically query historical metrics from a time-series database
      // For now, return current metrics with timestamp
      const currentMetrics = await metricsService.getCachedMetrics('realtime');
      
      if (!currentMetrics) {
        return res.status(404).json({
          success: false,
          message: 'Metrics history not available'
        });
      }

      // Simulate historical data - in production, this would come from a time-series DB
      const history = {
        period: period,
        metric: metric,
        data: [currentMetrics], // Would contain multiple time points
        summary: {
          dataPoints: 1,
          timeRange: period,
          lastUpdate: currentMetrics.lastUpdate
        }
      };

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error fetching metrics history:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching metrics history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = MetricsController;