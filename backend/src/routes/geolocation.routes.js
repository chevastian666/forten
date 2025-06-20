/**
 * Geolocation Routes
 * API endpoints for geolocation services and anomaly detection
 */

const express = require('express');
const { param, query, body, validationResult } = require('express-validator');
const GeolocationService = require('../services/geolocation.service');
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
 * Extract IP address from request
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip ||
         '127.0.0.1';
};

/**
 * GET /api/geolocation/lookup/:ip
 * Get geolocation information for an IP address
 */
router.get('/lookup/:ip',
  authenticate,
  [
    param('ip')
      .isIP()
      .withMessage('Valid IP address is required')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const { ip } = req.params;
      const location = GeolocationService.getLocation(ip);

      res.json({
        success: true,
        data: location
      });

    } catch (error) {
      logger.error('Error looking up geolocation', {
        ip: req.params.ip,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * POST /api/geolocation/analyze
 * Analyze access for security anomalies
 */
router.post('/analyze',
  authenticate,
  [
    body('ip')
      .optional()
      .isIP()
      .withMessage('Valid IP address required if provided'),
    body('userId')
      .optional()
      .isString()
      .withMessage('User ID must be a string'),
    body('context')
      .optional()
      .isObject()
      .withMessage('Context must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { ip, userId, context } = req.body;
      const clientIP = ip || getClientIP(req);
      const targetUserId = userId || req.user.id;

      const analysis = await GeolocationService.analyzeAccess(
        clientIP,
        targetUserId,
        {
          userAgent: req.headers['user-agent'],
          endpoint: req.originalUrl,
          ...context
        }
      );

      res.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      logger.error('Error analyzing geolocation', {
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/geolocation/current
 * Get current request geolocation analysis
 */
router.get('/current',
  authenticate,
  async (req, res) => {
    try {
      const clientIP = getClientIP(req);
      
      const analysis = await GeolocationService.analyzeAccess(
        clientIP,
        req.user.id,
        {
          userAgent: req.headers['user-agent'],
          endpoint: req.originalUrl,
          timestamp: new Date()
        }
      );

      res.json({
        success: true,
        data: {
          ip: clientIP,
          analysis,
          headers: {
            'user-agent': req.headers['user-agent'],
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-real-ip': req.headers['x-real-ip']
          }
        }
      });

    } catch (error) {
      logger.error('Error analyzing current geolocation', {
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/geolocation/stats/:userId
 * Get access statistics for a user
 */
router.get('/stats/:userId',
  authenticate,
  [
    param('userId')
      .notEmpty()
      .withMessage('User ID is required'),
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { days = 30 } = req.query;

      // Check authorization (users can only see their own stats, admins can see all)
      if (req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const stats = await GeolocationService.getUserAccessStats(userId, parseInt(days));

      res.json({
        success: true,
        data: stats,
        meta: {
          userId,
          days: parseInt(days)
        }
      });

    } catch (error) {
      logger.error('Error getting geolocation stats', {
        userId: req.params.userId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/geolocation/config
 * Get current geolocation service configuration
 */
router.get('/config',
  authenticate,
  (req, res) => {
    try {
      // Only admins can view configuration
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const stats = GeolocationService.getStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error getting geolocation config', {
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * PUT /api/geolocation/config
 * Update geolocation service configuration
 */
router.put('/config',
  authenticate,
  [
    body('allowedCountries')
      .optional()
      .isArray()
      .withMessage('Allowed countries must be an array'),
    body('allowedCountries.*')
      .isLength({ min: 2, max: 2 })
      .withMessage('Country codes must be 2 characters'),
    body('riskyCountries')
      .optional()
      .isArray()
      .withMessage('Risky countries must be an array'),
    body('rapidChangeThresholdMinutes')
      .optional()
      .isInt({ min: 1, max: 1440 })
      .withMessage('Threshold must be between 1 and 1440 minutes'),
    body('rapidChangeDistanceKm')
      .optional()
      .isInt({ min: 100, max: 20000 })
      .withMessage('Distance must be between 100 and 20000 km')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Only admins can update configuration
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const updatedConfig = await GeolocationService.updateConfig(req.body);

      logger.info('Geolocation configuration updated', {
        updatedBy: req.user.id,
        changes: req.body
      });

      res.json({
        success: true,
        message: 'Configuration updated successfully',
        data: updatedConfig
      });

    } catch (error) {
      logger.error('Error updating geolocation config', {
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * POST /api/geolocation/test
 * Test geolocation functionality with sample data
 */
router.post('/test',
  authenticate,
  [
    body('testIPs')
      .optional()
      .isArray()
      .withMessage('Test IPs must be an array'),
    body('testIPs.*')
      .isIP()
      .withMessage('Each test IP must be valid')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { testIPs } = req.body;
      const defaultTestIPs = [
        '8.8.8.8',      // Google DNS (US)
        '1.1.1.1',      // Cloudflare (US)
        '190.210.8.1',  // Uruguay
        '200.32.3.1',   // Argentina
        '186.250.1.1',  // Brazil
        '45.33.32.156', // Suspicious/VPN range
        '127.0.0.1'     // Localhost
      ];

      const ipsToTest = testIPs || defaultTestIPs;
      const results = [];

      for (const ip of ipsToTest) {
        try {
          const location = GeolocationService.getLocation(ip);
          const analysis = await GeolocationService.analyzeAccess(
            ip,
            req.user.id,
            { test: true, timestamp: new Date() }
          );

          results.push({
            ip,
            location,
            analysis: {
              riskLevel: analysis.riskLevel,
              risks: analysis.risks,
              alertsCount: analysis.alerts.length
            }
          });
        } catch (error) {
          results.push({
            ip,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          results,
          summary: {
            totalTested: ipsToTest.length,
            successful: results.filter(r => !r.error).length,
            failed: results.filter(r => r.error).length,
            highRisk: results.filter(r => r.analysis?.riskLevel === 'high').length,
            mediumRisk: results.filter(r => r.analysis?.riskLevel === 'medium').length,
            lowRisk: results.filter(r => r.analysis?.riskLevel === 'low').length
          }
        }
      });

    } catch (error) {
      logger.error('Error testing geolocation', {
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/geolocation/health
 * Health check for geolocation service
 */
router.get('/health',
  authenticate,
  (req, res) => {
    try {
      const stats = GeolocationService.getStats();
      const testLocation = GeolocationService.getLocation('8.8.8.8');
      
      const health = {
        status: stats.isInitialized ? 'healthy' : 'unhealthy',
        initialized: stats.isInitialized,
        geoipWorking: testLocation.country !== 'Unknown',
        cacheEnabled: stats.cacheEnabled,
        allowedCountries: stats.allowedCountries.length,
        timestamp: new Date().toISOString()
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health
      });

    } catch (error) {
      logger.error('Error checking geolocation health', {
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

module.exports = router;