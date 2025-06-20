/**
 * Admin Configuration Routes
 * API endpoints for managing dynamic system configuration
 */

const express = require('express');
const { param, query, body, validationResult } = require('express-validator');
const ConfigService = require('../../services/config.service');
const { logger } = require('../../config/logger');

const router = express.Router();

/**
 * Authentication middleware (placeholder)
 */
const authenticate = (req, res, next) => {
  req.user = {
    id: 'admin-123',
    email: 'admin@forten.com.uy',
    role: 'admin',
    permissions: ['config:read', 'config:write', 'config:admin']
  };
  next();
};

/**
 * Authorization middleware - Only admins can access config
 */
const authorize = (permissions = []) => {
  return (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (permissions.length > 0) {
      const hasPermission = permissions.some(permission => 
        req.user.permissions.includes(permission)
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: permissions
        });
      }
    }

    next();
  };
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
 * GET /api/admin/config
 * Get all configuration settings
 */
router.get('/',
  authenticate,
  authorize(['config:read']),
  [
    query('category')
      .optional()
      .isString()
      .withMessage('Category must be a string'),
    query('includeSchema')
      .optional()
      .isBoolean()
      .withMessage('includeSchema must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { category, includeSchema } = req.query;
      let configs;

      if (category) {
        configs = await ConfigService.getConfigsByCategory(category);
      } else {
        configs = await ConfigService.getAllConfigs();
      }

      // Filter schema if not requested
      if (includeSchema === 'false' || includeSchema === false) {
        const filteredConfigs = {};
        for (const [key, config] of Object.entries(configs)) {
          filteredConfigs[key] = { value: config.value };
        }
        configs = filteredConfigs;
      }

      res.json({
        success: true,
        data: configs,
        meta: {
          category: category || 'all',
          includeSchema: includeSchema !== 'false',
          count: Object.keys(configs).length
        }
      });

    } catch (error) {
      logger.error('Error fetching configurations', {
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
 * GET /api/admin/config/:key
 * Get specific configuration value
 */
router.get('/:key',
  authenticate,
  authorize(['config:read']),
  [
    param('key')
      .notEmpty()
      .withMessage('Configuration key is required'),
    query('useCache')
      .optional()
      .isBoolean()
      .withMessage('useCache must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { key } = req.params;
      const { useCache = true } = req.query;

      const value = await ConfigService.get(key, useCache === 'true');

      if (value === null) {
        return res.status(404).json({
          success: false,
          message: `Configuration key '${key}' not found`
        });
      }

      res.json({
        success: true,
        data: {
          key,
          value,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error fetching configuration', {
        key: req.params.key,
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
 * PUT /api/admin/config/:key
 * Update specific configuration value
 */
router.put('/:key',
  authenticate,
  authorize(['config:write']),
  [
    param('key')
      .notEmpty()
      .withMessage('Configuration key is required'),
    body('value')
      .exists()
      .withMessage('Configuration value is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      await ConfigService.setConfig(key, value);

      res.json({
        success: true,
        message: 'Configuration updated successfully',
        data: {
          key,
          value,
          timestamp: new Date().toISOString(),
          requiresRestart: ConfigService.requiresRestart(key)
        }
      });

    } catch (error) {
      logger.error('Error updating configuration', {
        key: req.params.key,
        value: req.body.value,
        error: error.message,
        userId: req.user.id
      });

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * POST /api/admin/config/bulk-update
 * Bulk update multiple configuration values
 */
router.post('/bulk-update',
  authenticate,
  authorize(['config:write']),
  [
    body('configs')
      .isObject()
      .withMessage('Configs must be an object'),
    body('configs.*')
      .exists()
      .withMessage('Each config value is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { configs } = req.body;

      if (Object.keys(configs).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one configuration must be provided'
        });
      }

      const results = await ConfigService.bulkUpdateConfigs(configs);

      // Check if any require restart
      const requiresRestart = Object.keys(configs).some(key => 
        ConfigService.requiresRestart(key)
      );

      res.json({
        success: true,
        message: 'Bulk configuration update completed',
        data: {
          results,
          summary: {
            total: Object.keys(configs).length,
            successful: Object.values(results).filter(r => r.success).length,
            failed: Object.values(results).filter(r => !r.success).length,
            requiresRestart
          }
        }
      });

    } catch (error) {
      logger.error('Error in bulk configuration update', {
        configs: req.body.configs,
        error: error.message,
        userId: req.user.id
      });

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * POST /api/admin/config/:key/reset
 * Reset configuration to default value
 */
router.post('/:key/reset',
  authenticate,
  authorize(['config:write']),
  [
    param('key')
      .notEmpty()
      .withMessage('Configuration key is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { key } = req.params;

      await ConfigService.resetConfig(key);

      const newValue = await ConfigService.get(key);

      res.json({
        success: true,
        message: 'Configuration reset to default successfully',
        data: {
          key,
          value: newValue,
          timestamp: new Date().toISOString(),
          requiresRestart: ConfigService.requiresRestart(key)
        }
      });

    } catch (error) {
      logger.error('Error resetting configuration', {
        key: req.params.key,
        error: error.message,
        userId: req.user.id
      });

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * POST /api/admin/config/reset-all
 * Reset all configurations to default values
 */
router.post('/reset-all',
  authenticate,
  authorize(['config:admin']),
  async (req, res) => {
    try {
      if (!req.body.confirm) {
        return res.status(400).json({
          success: false,
          message: 'Confirmation required for reset-all operation',
          required: { confirm: true }
        });
      }

      const results = await ConfigService.resetAllConfigs();

      res.json({
        success: true,
        message: 'All configurations reset to defaults',
        data: {
          results,
          summary: {
            total: Object.keys(results).length,
            successful: Object.values(results).filter(r => r.success).length,
            failed: Object.values(results).filter(r => !r.success).length,
            timestamp: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      logger.error('Error resetting all configurations', {
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
 * POST /api/admin/config/validate
 * Validate configuration values without applying them
 */
router.post('/validate',
  authenticate,
  authorize(['config:read']),
  [
    body('configs')
      .isObject()
      .withMessage('Configs must be an object'),
    body('configs.*')
      .exists()
      .withMessage('Each config value is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { configs } = req.body;
      const validationResults = {};

      for (const [key, value] of Object.entries(configs)) {
        try {
          const validation = await ConfigService.validateConfig(key, value);
          validationResults[key] = {
            valid: validation.valid,
            error: validation.error || null,
            requiresRestart: ConfigService.requiresRestart(key)
          };
        } catch (error) {
          validationResults[key] = {
            valid: false,
            error: error.message,
            requiresRestart: false
          };
        }
      }

      const validCount = Object.values(validationResults).filter(r => r.valid).length;
      const invalidCount = Object.values(validationResults).length - validCount;

      res.json({
        success: true,
        data: {
          validations: validationResults,
          summary: {
            total: Object.keys(configs).length,
            valid: validCount,
            invalid: invalidCount,
            allValid: invalidCount === 0
          }
        }
      });

    } catch (error) {
      logger.error('Error validating configurations', {
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
 * GET /api/admin/config/export
 * Export all configurations as JSON
 */
router.get('/export',
  authenticate,
  authorize(['config:read']),
  async (req, res) => {
    try {
      const exportData = await ConfigService.exportConfig();

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="forten-config-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json({
        success: true,
        data: exportData
      });

    } catch (error) {
      logger.error('Error exporting configuration', {
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
 * POST /api/admin/config/import
 * Import configurations from JSON
 */
router.post('/import',
  authenticate,
  authorize(['config:admin']),
  [
    body('configData')
      .isObject()
      .withMessage('Configuration data must be an object'),
    body('configData.configs')
      .isObject()
      .withMessage('configs field is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { configData } = req.body;

      const results = await ConfigService.importConfig(configData);

      const successful = Object.values(results).filter(r => r.success).length;
      const failed = Object.values(results).length - successful;

      res.json({
        success: true,
        message: 'Configuration import completed',
        data: {
          results,
          summary: {
            total: Object.keys(results).length,
            successful,
            failed,
            importedFrom: configData.timestamp,
            importedAt: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      logger.error('Error importing configuration', {
        error: error.message,
        userId: req.user.id
      });

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/admin/config/stats
 * Get configuration service statistics
 */
router.get('/stats',
  authenticate,
  authorize(['config:read']),
  (req, res) => {
    try {
      const stats = ConfigService.getStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error fetching configuration stats', {
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
 * GET /api/admin/config/categories
 * Get list of available configuration categories
 */
router.get('/categories',
  authenticate,
  authorize(['config:read']),
  async (req, res) => {
    try {
      const allConfigs = await ConfigService.getAllConfigs();
      const categories = {};

      for (const [key, config] of Object.entries(allConfigs)) {
        const category = config.schema.category;
        if (!categories[category]) {
          categories[category] = {
            name: category,
            count: 0,
            keys: []
          };
        }
        categories[category].count++;
        categories[category].keys.push(key);
      }

      res.json({
        success: true,
        data: Object.values(categories),
        meta: {
          totalCategories: Object.keys(categories).length,
          totalConfigs: Object.keys(allConfigs).length
        }
      });

    } catch (error) {
      logger.error('Error fetching configuration categories', {
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
 * GET /api/admin/config/health
 * Health check for configuration service
 */
router.get('/health',
  authenticate,
  authorize(['config:read']),
  async (req, res) => {
    try {
      const stats = ConfigService.getStats();
      
      const health = {
        status: stats.isInitialized ? 'healthy' : 'unhealthy',
        initialized: stats.isInitialized,
        configsLoaded: stats.loadedConfigs,
        totalConfigs: stats.totalConfigs,
        lastUpdate: stats.lastUpdate ? new Date(stats.lastUpdate).toISOString() : null,
        categories: stats.categories,
        timestamp: new Date().toISOString()
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health
      });

    } catch (error) {
      logger.error('Error checking configuration health', {
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