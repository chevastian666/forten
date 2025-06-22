/**
 * Bulk Operations Routes
 * API endpoints for bulk create, update, and delete operations
 */

const express = require('express');
const router = express.Router();
const bulkController = require('../controllers/bulk.controller');
const bulkValidator = require('../validators/bulk.validator');
const { logger } = require('../config/logger');

// Middleware for request logging
const logBulkRequest = (req, res, next) => {
  logger.info('Bulk operation request', {
    method: req.method,
    path: req.path,
    operation: req.body?.operation,
    resource: req.body?.resource,
    recordCount: req.body?.data?.length,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
};

// Middleware for response logging
const logBulkResponse = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    try {
      const response = typeof data === 'string' ? JSON.parse(data) : data;
      
      logger.info('Bulk operation response', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        success: response?.success,
        operationId: response?.operationId,
        totalRecords: response?.summary?.totalRecords,
        successfulRecords: response?.summary?.successfulRecords,
        failedRecords: response?.summary?.failedRecords,
        executionTime: response?.executionTime
      });
    } catch (error) {
      logger.warn('Failed to log bulk response', { error: error.message });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * @route POST /api/bulk/operations
 * @desc Execute bulk operation (create, update, delete)
 * @access Private (requires authentication)
 */
router.post('/operations',
  logBulkRequest,
  logBulkResponse,
  bulkValidator.validateBulkRequest(),
  async (req, res) => {
    await bulkController.executeBulkOperation(req, res);
  }
);

/**
 * @route GET /api/bulk/operations/:operationId
 * @desc Get bulk operation status
 * @access Private
 */
router.get('/operations/:operationId',
  async (req, res) => {
    await bulkController.getOperationStatus(req, res);
  }
);

/**
 * @route GET /api/bulk/statistics
 * @desc Get bulk operations statistics
 * @access Private
 */
router.get('/statistics',
  async (req, res) => {
    await bulkController.getStatistics(req, res);
  }
);

/**
 * @route GET /api/bulk/info
 * @desc Get bulk operations information and configuration
 * @access Private
 */
router.get('/info', (req, res) => {
  try {
    const info = {
      success: true,
      configuration: {
        maxBatchSize: 1000,
        defaultBatchSize: 50,
        supportedOperations: ['create', 'update', 'delete'],
        supportedResources: ['events', 'audit_logs', 'pins', 'users', 'notifications'],
        transactionTimeout: 300000,
        maxRetries: 3
      },
      features: [
        'Bulk create, update, and delete operations',
        'Transaction support with rollback capability',
        'Dry run mode for validation',
        'Batch processing for large datasets',
        'Continue on error option',
        'Comprehensive validation and error reporting',
        'Operation status tracking',
        'Performance statistics'
      ],
      limits: {
        'events': { maxBatchSize: 500, requiredFields: ['title', 'event_type'] },
        'audit_logs': { maxBatchSize: 1000, requiredFields: ['action', 'resource'] },
        'pins': { maxBatchSize: 200, requiredFields: ['pin_code', 'user_id'] },
        'users': { maxBatchSize: 100, requiredFields: ['username', 'email'] },
        'notifications': { maxBatchSize: 300, requiredFields: ['title', 'message', 'type'] }
      },
      examples: {
        create: {
          operation: 'create',
          resource: 'events',
          data: [
            {
              title: 'Door Access',
              description: 'Main entrance accessed',
              event_type: 'access',
              location: 'Main Building',
              priority: 'medium'
            }
          ],
          options: {
            transaction: true,
            dryRun: false,
            continueOnError: false,
            batchSize: 50
          }
        },
        update: {
          operation: 'update',
          resource: 'events',
          data: [
            {
              id: 123,
              title: 'Updated Door Access',
              priority: 'high'
            }
          ],
          options: {
            transaction: true,
            continueOnError: true
          }
        },
        delete: {
          operation: 'delete',
          resource: 'events',
          data: [
            { id: 123 },
            { id: 124 }
          ],
          options: {
            transaction: true
          }
        }
      }
    };

    res.json(info);

  } catch (error) {
    logger.error('Failed to get bulk operations info', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INFO_ERROR',
        message: 'Failed to retrieve bulk operations information'
      }
    });
  }
});

/**
 * @route GET /api/bulk/health
 * @desc Health check for bulk operations service
 * @access Public
 */
router.get('/health', (req, res) => {
  try {
    const status = bulkController.getStatus();
    
    res.json({
      success: true,
      status: 'healthy',
      service: 'Bulk Operations',
      initialized: status.initialized,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
    });

  } catch (error) {
    logger.error('Bulk operations health check failed', {
      error: error.message
    });

    res.status(503).json({
      success: false,
      status: 'unhealthy',
      service: 'Bulk Operations',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/bulk/validate
 * @desc Validate bulk operation request without executing
 * @access Private
 */
router.post('/validate',
  logBulkRequest,
  bulkValidator.validateBulkRequest(),
  (req, res) => {
    try {
      // If we reach here, validation passed
      const { operation, resource, data, options = {} } = req.body;
      
      res.json({
        success: true,
        message: 'Bulk operation request is valid',
        operation,
        resource,
        recordCount: data.length,
        options,
        validatedAt: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Bulk validation endpoint error', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ENDPOINT_ERROR',
          message: 'Validation endpoint error'
        }
      });
    }
  }
);

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  logger.error('Bulk operations route error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'BULK_ROUTE_ERROR',
      message: 'Internal server error in bulk operations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;