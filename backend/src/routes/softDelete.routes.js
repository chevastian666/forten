/**
 * Soft Delete Routes
 * API endpoints for managing soft deleted records
 */

const express = require('express');
const { param, query, body, validationResult } = require('express-validator');
const SoftDeleteService = require('../services/softDelete.service');
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
 * Authorization middleware - Only admins can manage soft deletes
 */
const authorize = (roles = ['admin']) => {
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
 * GET /api/soft-deletes
 * Get all soft deleted records
 */
router.get('/',
  authenticate,
  authorize(),
  [
    query('model')
      .optional()
      .isString()
      .withMessage('Model must be a string'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Limit must be between 1 and 500'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { model, limit, offset } = req.query;
      
      const deletedRecords = await SoftDeleteService.getAllDeletedRecords({
        model,
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0
      });

      res.json({
        success: true,
        data: deletedRecords,
        meta: {
          model: model || 'all',
          limit: parseInt(limit) || 100,
          offset: parseInt(offset) || 0
        }
      });

    } catch (error) {
      logger.error('Error fetching deleted records', {
        error: error.message,
        query: req.query
      });

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * POST /api/soft-deletes/:model/:id/restore
 * Restore a soft deleted record
 */
router.post('/:model/:id/restore',
  authenticate,
  authorize(),
  [
    param('model')
      .notEmpty()
      .withMessage('Model is required'),
    param('id')
      .isUUID()
      .withMessage('Invalid ID format')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { model, id } = req.params;
      
      const restoredRecord = await SoftDeleteService.restoreRecord(model, id);

      res.json({
        success: true,
        message: 'Record restored successfully',
        data: restoredRecord
      });

    } catch (error) {
      logger.error('Error restoring record', {
        error: error.message,
        model: req.params.model,
        id: req.params.id,
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
 * DELETE /api/soft-deletes/:model/:id/permanent
 * Permanently delete a soft deleted record
 */
router.delete('/:model/:id/permanent',
  authenticate,
  authorize(),
  [
    param('model')
      .notEmpty()
      .withMessage('Model is required'),
    param('id')
      .isUUID()
      .withMessage('Invalid ID format')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { model, id } = req.params;
      
      await SoftDeleteService.permanentlyDelete(model, id);

      res.json({
        success: true,
        message: 'Record permanently deleted'
      });

    } catch (error) {
      logger.error('Error permanently deleting record', {
        error: error.message,
        model: req.params.model,
        id: req.params.id,
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
 * POST /api/soft-deletes/:model/bulk-restore
 * Bulk restore multiple records
 */
router.post('/:model/bulk-restore',
  authenticate,
  authorize(),
  [
    param('model')
      .notEmpty()
      .withMessage('Model is required'),
    body('ids')
      .isArray({ min: 1 })
      .withMessage('IDs array is required'),
    body('ids.*')
      .isUUID()
      .withMessage('Each ID must be a valid UUID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { model } = req.params;
      const { ids } = req.body;
      
      const result = await SoftDeleteService.bulkRestore(model, ids);

      res.json({
        success: true,
        message: 'Bulk restore completed',
        data: result
      });

    } catch (error) {
      logger.error('Error in bulk restore', {
        error: error.message,
        model: req.params.model,
        ids: req.body.ids,
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
 * GET /api/soft-deletes/statistics
 * Get soft delete statistics
 */
router.get('/statistics',
  authenticate,
  authorize(),
  async (req, res) => {
    try {
      const stats = await SoftDeleteService.getDeleteStatistics();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error fetching delete statistics', {
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
 * POST /api/soft-deletes/cleanup
 * Clean up old soft deleted records
 */
router.post('/cleanup',
  authenticate,
  authorize(),
  [
    body('daysOld')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days old must be between 1 and 365'),
    body('model')
      .optional()
      .isString()
      .withMessage('Model must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { daysOld = 30, model } = req.body;
      
      const result = await SoftDeleteService.cleanupOldDeleted(daysOld, model);

      res.json({
        success: true,
        message: 'Cleanup completed',
        data: result
      });

    } catch (error) {
      logger.error('Error in cleanup', {
        error: error.message,
        daysOld: req.body.daysOld,
        model: req.body.model,
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
 * GET /api/soft-deletes/search
 * Search deleted records
 */
router.get('/search',
  authenticate,
  authorize(),
  [
    query('q')
      .notEmpty()
      .withMessage('Search query is required'),
    query('models')
      .optional()
      .isString()
      .withMessage('Models must be a comma-separated string'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { q: searchTerm, models, limit } = req.query;
      
      const modelArray = models ? models.split(',') : null;
      
      const results = await SoftDeleteService.searchDeletedRecords(searchTerm, {
        models: modelArray,
        limit: parseInt(limit) || 50
      });

      res.json({
        success: true,
        data: results,
        meta: {
          searchTerm,
          models: modelArray,
          limit: parseInt(limit) || 50
        }
      });

    } catch (error) {
      logger.error('Error searching deleted records', {
        error: error.message,
        searchTerm: req.query.q
      });

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * GET /api/soft-deletes/models
 * Get list of models that support soft deletes
 */
router.get('/models',
  authenticate,
  authorize(),
  (req, res) => {
    try {
      const models = SoftDeleteService.models;
      const paranoidModels = [];

      if (models) {
        for (const [modelName, Model] of Object.entries(models)) {
          if (Model && Model.options && Model.options.paranoid) {
            paranoidModels.push({
              name: modelName,
              tableName: Model.tableName,
              paranoid: true
            });
          }
        }
      }

      res.json({
        success: true,
        data: paranoidModels,
        meta: {
          total: paranoidModels.length
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

module.exports = router;