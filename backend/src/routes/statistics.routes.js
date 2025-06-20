/**
 * Statistics Routes
 * API endpoints for accessing aggregated statistics
 */

const express = require('express');
const { query, param, validationResult } = require('express-validator');
const AggregationService = require('../services/aggregation.service');
const AggregationJobs = require('../jobs/aggregation.jobs');
const { logger } = require('../config/logger');

const router = express.Router();

/**
 * Authentication middleware (placeholder)
 */
const authenticate = (req, res, next) => {
  req.user = {
    id: 'user-123',
    email: 'admin@forten.com.uy',
    role: 'admin',
    buildings: ['building-1', 'building-2', 'building-3']
  };
  next();
};

/**
 * Authorization middleware
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

/**
 * Building access middleware
 */
const checkBuildingAccess = (req, res, next) => {
  const buildingId = req.params.buildingId || req.query.buildingId;
  
  if (req.user.role !== 'admin' && !req.user.buildings.includes(buildingId)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this building'
    });
  }
  
  next();
};

/**
 * Validation middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

/**
 * GET /api/statistics/daily/:buildingId
 * Get daily statistics for a building
 */
router.get('/daily/:buildingId',
  authenticate,
  checkBuildingAccess,
  [
    param('buildingId').isUUID().withMessage('Invalid building ID'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date'),
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { buildingId } = req.params;
      let { startDate, endDate, days } = req.query;

      // Default to last 30 days if no date range specified
      if (!startDate && !endDate) {
        days = days || 30;
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      } else {
        startDate = new Date(startDate);
        endDate = new Date(endDate);
      }

      const stats = await AggregationService.getAggregatedStats(
        buildingId,
        startDate,
        endDate,
        'daily'
      );

      res.json({
        success: true,
        data: stats,
        meta: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          count: stats.length
        }
      });

    } catch (error) {
      logger.error('Error fetching daily statistics', {
        error: error.message,
        buildingId: req.params.buildingId
      });

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/statistics/weekly/:buildingId
 * Get weekly statistics for a building
 */
router.get('/weekly/:buildingId',
  authenticate,
  checkBuildingAccess,
  [
    param('buildingId').isUUID().withMessage('Invalid building ID'),
    query('weeks')
      .optional()
      .isInt({ min: 1, max: 52 })
      .withMessage('Weeks must be between 1 and 52')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { buildingId } = req.params;
      const weeks = parseInt(req.query.weeks) || 12;

      const stats = await AggregationService.models.WeeklyStatistics.getLatest(
        buildingId,
        weeks
      );

      res.json({
        success: true,
        data: stats,
        meta: {
          weeks,
          count: stats.length
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/statistics/monthly/:buildingId
 * Get monthly statistics for a building
 */
router.get('/monthly/:buildingId',
  authenticate,
  checkBuildingAccess,
  [
    param('buildingId').isUUID().withMessage('Invalid building ID'),
    query('months')
      .optional()
      .isInt({ min: 1, max: 24 })
      .withMessage('Months must be between 1 and 24')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { buildingId } = req.params;
      const months = parseInt(req.query.months) || 12;

      const stats = await AggregationService.models.MonthlyStatistics.getLatest(
        buildingId,
        months
      );

      res.json({
        success: true,
        data: stats,
        meta: {
          months,
          count: stats.length
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/statistics/summary/:buildingId
 * Get summary statistics across all time periods
 */
router.get('/summary/:buildingId',
  authenticate,
  checkBuildingAccess,
  [
    param('buildingId').isUUID().withMessage('Invalid building ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { buildingId } = req.params;

      // Get latest stats from each period
      const [daily, weekly, monthly] = await Promise.all([
        AggregationService.models.DailyStatistics.getLatest(buildingId, 7),
        AggregationService.models.WeeklyStatistics.getLatest(buildingId, 4),
        AggregationService.models.MonthlyStatistics.getLatest(buildingId, 3)
      ]);

      // Calculate summary metrics
      const summary = {
        current: {
          today: daily[0] || null,
          this_week: weekly[0] || null,
          this_month: monthly[0] || null
        },
        trends: {},
        performance: {}
      };

      // Calculate daily trend
      if (daily.length >= 2) {
        const yesterday = daily[1];
        const today = daily[0];
        summary.trends.daily_access_change = yesterday.total_access_attempts > 0
          ? ((today.total_access_attempts - yesterday.total_access_attempts) / 
             yesterday.total_access_attempts * 100).toFixed(2)
          : 0;
      }

      // Calculate weekly trend
      if (weekly.length >= 2) {
        summary.trends.weekly_access_trend = weekly[0].access_trend;
        summary.trends.weekly_alert_trend = weekly[0].alert_trend;
      }

      // Calculate monthly trend
      if (monthly.length >= 2) {
        summary.trends.monthly_growth_rate = monthly[0].access_growth_rate;
        summary.trends.monthly_user_growth = monthly[0].user_growth_rate;
      }

      // Performance metrics
      if (daily.length > 0) {
        const avgResponseTime = daily.reduce((sum, d) => 
          sum + (d.avg_response_time || 0), 0) / daily.length;
        const avgUptime = daily.reduce((sum, d) => 
          sum + d.system_uptime_percentage, 0) / daily.length;

        summary.performance = {
          avg_response_time_7d: avgResponseTime.toFixed(2),
          avg_uptime_7d: avgUptime.toFixed(2),
          total_access_7d: daily.reduce((sum, d) => sum + d.total_access_attempts, 0),
          total_alerts_7d: daily.reduce((sum, d) => 
            sum + d.security_alerts + d.maintenance_alerts + d.emergency_alerts, 0)
        };
      }

      res.json({
        success: true,
        data: summary,
        meta: {
          buildingId,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/statistics/comparison
 * Compare statistics across buildings
 */
router.get('/comparison',
  authenticate,
  authorize(['admin']),
  [
    query('buildingIds')
      .notEmpty()
      .withMessage('Building IDs required')
      .custom(value => {
        const ids = value.split(',');
        return ids.every(id => 
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        );
      })
      .withMessage('Invalid building IDs'),
    query('period')
      .optional()
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Invalid period'),
    query('metric')
      .optional()
      .isIn(['access', 'alerts', 'users', 'performance'])
      .withMessage('Invalid metric')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const buildingIds = req.query.buildingIds.split(',');
      const period = req.query.period || 'daily';
      const metric = req.query.metric || 'access';

      const comparisons = [];

      for (const buildingId of buildingIds) {
        let stats;
        switch (period) {
          case 'daily':
            stats = await AggregationService.models.DailyStatistics.getLatest(
              buildingId, 1
            );
            break;
          case 'weekly':
            stats = await AggregationService.models.WeeklyStatistics.getLatest(
              buildingId, 1
            );
            break;
          case 'monthly':
            stats = await AggregationService.models.MonthlyStatistics.getLatest(
              buildingId, 1
            );
            break;
        }

        if (stats && stats.length > 0) {
          const stat = stats[0];
          const comparison = {
            building_id: buildingId,
            period: period,
            date: stat.date || stat.week_start || stat.month_start
          };

          switch (metric) {
            case 'access':
              comparison.metrics = {
                total_access: stat.total_access_attempts,
                successful: stat.successful_access,
                failed: stat.failed_access,
                unique_users: stat.unique_users
              };
              break;
            case 'alerts':
              comparison.metrics = {
                total: (stat.security_alerts || 0) + 
                       (stat.maintenance_alerts || 0) + 
                       (stat.emergency_alerts || 0),
                security: stat.security_alerts || 0,
                maintenance: stat.maintenance_alerts || 0,
                emergency: stat.emergency_alerts || 0
              };
              break;
            case 'users':
              comparison.metrics = {
                unique_users: stat.unique_users || 0,
                unique_visitors: stat.unique_visitors || 0,
                new_users: stat.new_users || 0
              };
              break;
            case 'performance':
              comparison.metrics = {
                avg_response_time: stat.avg_response_time || 0,
                uptime_percentage: stat.system_uptime_percentage || 100,
                devices_online: stat.devices_online || stat.avg_devices_online || 0
              };
              break;
          }

          comparisons.push(comparison);
        }
      }

      res.json({
        success: true,
        data: comparisons,
        meta: {
          period,
          metric,
          building_count: comparisons.length
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * POST /api/statistics/aggregate
 * Manually trigger aggregation
 */
router.post('/aggregate',
  authenticate,
  authorize(['admin']),
  [
    query('type')
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Invalid aggregation type'),
    query('date')
      .isISO8601()
      .withMessage('Invalid date'),
    query('buildingId')
      .isUUID()
      .withMessage('Invalid building ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { type, date, buildingId } = req.query;

      const result = await AggregationJobs.forceRunAggregation(
        type,
        date,
        buildingId
      );

      res.json({
        success: true,
        message: `${type} aggregation completed`,
        data: result
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/statistics/jobs/status
 * Get aggregation job status
 */
router.get('/jobs/status',
  authenticate,
  authorize(['admin']),
  (req, res) => {
    const status = AggregationJobs.getStatus();

    res.json({
      success: true,
      data: status
    });
  }
);

/**
 * GET /api/statistics/export/:buildingId
 * Export statistics data
 */
router.get('/export/:buildingId',
  authenticate,
  checkBuildingAccess,
  [
    param('buildingId').isUUID().withMessage('Invalid building ID'),
    query('period')
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Invalid period'),
    query('format')
      .optional()
      .isIn(['json', 'csv'])
      .withMessage('Invalid format'),
    query('startDate')
      .isISO8601()
      .withMessage('Invalid start date'),
    query('endDate')
      .isISO8601()
      .withMessage('Invalid end date')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { buildingId } = req.params;
      const { period, format = 'json', startDate, endDate } = req.query;

      const stats = await AggregationService.getAggregatedStats(
        buildingId,
        new Date(startDate),
        new Date(endDate),
        period
      );

      if (format === 'csv') {
        // Convert to CSV format
        const csv = convertStatsToCSV(stats, period);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 
          `attachment; filename=statistics-${period}-${buildingId}.csv`);
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: stats,
          meta: {
            period,
            startDate,
            endDate,
            count: stats.length
          }
        });
      }

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * Convert statistics to CSV format
 */
function convertStatsToCSV(stats, period) {
  if (stats.length === 0) return '';

  // Get headers from first record
  const headers = Object.keys(stats[0].dataValues || stats[0])
    .filter(key => !['created_at', 'updated_at', 'id'].includes(key));

  // Build CSV
  let csv = headers.join(',') + '\n';
  
  for (const stat of stats) {
    const row = headers.map(header => {
      const value = stat[header];
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value || '';
    });
    csv += row.join(',') + '\n';
  }

  return csv;
}

module.exports = router;