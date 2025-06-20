/**
 * Export Routes
 * API endpoints for data export functionality
 */

const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const exportController = require('../controllers/export.controller');
const { export: exportLogger } = require('../config/logger');

const router = express.Router();

/**
 * Authentication middleware (placeholder)
 * In production, replace with actual authentication
 */
const authenticate = (req, res, next) => {
  // Mock authentication
  req.user = {
    id: 'user-123',
    email: 'admin@forten.com.uy',
    role: 'admin',
    first_name: 'Admin',
    last_name: 'User',
    buildings: ['building-1', 'building-2', 'building-3'],
    ipAddress: req.ip
  };
  next();
};

/**
 * Rate limiting for export endpoints
 * Prevent abuse of resource-intensive export operations
 */
const exportRateLimit = (req, res, next) => {
  // In production, implement proper rate limiting
  // For now, just log the request
  exportLogger.info('Export request received', {
    user: req.user?.email || 'unknown',
    path: req.path,
    method: req.method
  });
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
 * GET /api/export/options
 * Get available export options based on user permissions
 */
router.get('/options',
  authenticate,
  exportController.getExportOptions.bind(exportController)
);

/**
 * GET /api/export/history
 * Get user's export history
 */
router.get('/history',
  authenticate,
  exportController.getExportHistory.bind(exportController)
);

/**
 * POST /api/export/preview
 * Preview export data before generating file
 */
router.post('/preview',
  authenticate,
  [
    body('dataType')
      .isIn(['events', 'access_logs', 'alerts', 'devices', 'users'])
      .withMessage('Invalid data type'),
    body('filters')
      .optional()
      .isObject()
      .withMessage('Filters must be an object')
  ],
  handleValidationErrors,
  exportController.previewExport.bind(exportController)
);

/**
 * GET /api/export/:dataType/:format
 * Export data in specified format
 * 
 * Parameters:
 * - dataType: events, access_logs, alerts, devices, users
 * - format: csv, xlsx, pdf
 * 
 * Query parameters:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - buildingId: Building ID or 'all'
 * - eventType: Event type filter (for applicable data types)
 * - limit: Maximum records (up to 10000)
 */
router.get('/:dataType/:format',
  authenticate,
  exportRateLimit,
  [
    param('dataType')
      .isIn(['events', 'access_logs', 'alerts', 'devices', 'users'])
      .withMessage('Invalid data type'),
    param('format')
      .isIn(['csv', 'xlsx', 'pdf'])
      .withMessage('Invalid format'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date'),
    query('buildingId')
      .optional()
      .matches(/^(all|building-\d+)$/)
      .withMessage('Invalid building ID'),
    query('eventType')
      .optional()
      .isString()
      .withMessage('Event type must be a string'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Limit must be between 1 and 10000')
  ],
  handleValidationErrors,
  exportController.exportData.bind(exportController)
);

/**
 * GET /api/export/templates/:dataType
 * Get export template configuration for frontend
 */
router.get('/templates/:dataType',
  authenticate,
  [
    param('dataType')
      .isIn(['events', 'access_logs', 'alerts', 'devices', 'users'])
      .withMessage('Invalid data type')
  ],
  handleValidationErrors,
  (req, res) => {
    const { dataType } = req.params;
    
    // Return template configuration for frontend to build export UI
    const templates = {
      events: {
        title: 'Export System Events',
        description: 'Export system events with optional filters',
        filters: [
          {
            name: 'dateRange',
            type: 'dateRange',
            label: 'Date Range',
            required: false,
            defaultValue: { days: 30 }
          },
          {
            name: 'buildingId',
            type: 'select',
            label: 'Building',
            required: false,
            options: 'dynamic' // Loaded from /api/export/options
          },
          {
            name: 'eventType',
            type: 'select',
            label: 'Event Type',
            required: false,
            options: 'dynamic'
          }
        ],
        formats: ['csv', 'xlsx', 'pdf'],
        defaultFormat: 'xlsx'
      },
      access_logs: {
        title: 'Export Access Logs',
        description: 'Export building access logs',
        filters: [
          {
            name: 'dateRange',
            type: 'dateRange',
            label: 'Date Range',
            required: false,
            defaultValue: { days: 7 }
          },
          {
            name: 'buildingId',
            type: 'select',
            label: 'Building',
            required: false,
            options: 'dynamic'
          }
        ],
        formats: ['csv', 'xlsx', 'pdf'],
        defaultFormat: 'xlsx'
      },
      alerts: {
        title: 'Export Security Alerts',
        description: 'Export security alerts and notifications',
        filters: [
          {
            name: 'dateRange',
            type: 'dateRange',
            label: 'Date Range',
            required: false,
            defaultValue: { days: 30 }
          },
          {
            name: 'buildingId',
            type: 'select',
            label: 'Building',
            required: false,
            options: 'dynamic'
          },
          {
            name: 'severity',
            type: 'select',
            label: 'Severity',
            required: false,
            options: [
              { value: 'all', label: 'All Severities' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' }
            ]
          }
        ],
        formats: ['csv', 'xlsx', 'pdf'],
        defaultFormat: 'pdf'
      },
      devices: {
        title: 'Export Device List',
        description: 'Export current device status and information',
        filters: [
          {
            name: 'buildingId',
            type: 'select',
            label: 'Building',
            required: false,
            options: 'dynamic'
          },
          {
            name: 'status',
            type: 'select',
            label: 'Device Status',
            required: false,
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'online', label: 'Online' },
              { value: 'offline', label: 'Offline' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'error', label: 'Error' }
            ]
          }
        ],
        formats: ['csv', 'xlsx', 'pdf'],
        defaultFormat: 'xlsx'
      },
      users: {
        title: 'Export User List',
        description: 'Export system users',
        filters: [
          {
            name: 'role',
            type: 'select',
            label: 'User Role',
            required: false,
            options: [
              { value: 'all', label: 'All Roles' },
              { value: 'admin', label: 'Admin' },
              { value: 'operator', label: 'Operator' },
              { value: 'security', label: 'Security' },
              { value: 'viewer', label: 'Viewer' }
            ]
          },
          {
            name: 'status',
            type: 'select',
            label: 'User Status',
            required: false,
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' }
            ]
          }
        ],
        formats: ['csv', 'xlsx', 'pdf'],
        defaultFormat: 'xlsx'
      }
    };

    const template = templates[dataType];
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  }
);

/**
 * POST /api/export/bulk
 * Export multiple data types in a single zip file
 * (Future enhancement)
 */
router.post('/bulk',
  authenticate,
  exportRateLimit,
  [
    body('exports')
      .isArray({ min: 1, max: 5 })
      .withMessage('Exports must be an array with 1-5 items'),
    body('exports.*.dataType')
      .isIn(['events', 'access_logs', 'alerts', 'devices', 'users'])
      .withMessage('Invalid data type'),
    body('exports.*.format')
      .isIn(['csv', 'xlsx', 'pdf'])
      .withMessage('Invalid format'),
    body('exports.*.filters')
      .optional()
      .isObject()
      .withMessage('Filters must be an object')
  ],
  handleValidationErrors,
  (req, res) => {
    // Placeholder for bulk export functionality
    res.status(501).json({
      success: false,
      message: 'Bulk export functionality coming soon'
    });
  }
);

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  exportLogger.error('Export route error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({
    success: false,
    message: 'Internal server error during export',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;