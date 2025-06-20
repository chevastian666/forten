/**
 * Audit Routes
 * API routes for audit log management
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const AuditController = require('../controllers/audit.controller');
const { auditCritical } = require('../middleware/audit.middleware');

const router = express.Router();

// Validation middleware
const validateAuditQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('userId').optional().isUUID().withMessage('User ID must be a valid UUID'),
  query('entityId').optional().isString().withMessage('Entity ID must be a string'),
  query('action').optional().isString().withMessage('Action must be a string'),
  query('entity').optional().isString().withMessage('Entity must be a string'),
  query('status').optional().isIn(['SUCCESS', 'FAILED', 'ERROR']).withMessage('Invalid status'),
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO8601 date'),
  query('sortBy').optional().isIn(['created_at', 'action', 'entity', 'status']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC')
];

const validateExportRequest = [
  body('format').optional().isIn(['csv', 'json']).withMessage('Format must be csv or json'),
  body('userId').optional().isUUID().withMessage('User ID must be a valid UUID'),
  body('action').optional().isString().withMessage('Action must be a string'),
  body('entity').optional().isString().withMessage('Entity must be a string'),
  body('startDate').optional().isISO8601().withMessage('Start date must be valid ISO8601 date'),
  body('endDate').optional().isISO8601().withMessage('End date must be valid ISO8601 date')
];

// Auth middleware placeholder (replace with actual auth middleware)
const requireAuth = (req, res, next) => {
  // TODO: Implement proper authentication
  // For now, mock user
  req.user = { id: 'user-123', role: 'admin' };
  next();
};

// Permission middleware for admin-only routes
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Insufficient permissions'
    });
  }
};

/**
 * @route GET /api/audit-logs
 * @desc Get audit logs with pagination and filters
 * @access Admin
 */
router.get(
  '/audit-logs',
  requireAuth,
  requireAdmin,
  validateAuditQuery,
  AuditController.getAuditLogs
);

/**
 * @route GET /api/audit-logs/stats
 * @desc Get audit statistics
 * @access Admin
 */
router.get(
  '/audit-logs/stats',
  requireAuth,
  requireAdmin,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  AuditController.getAuditStats
);

/**
 * @route GET /api/audit-logs/critical
 * @desc Get critical actions audit logs
 * @access Admin
 */
router.get(
  '/audit-logs/critical',
  requireAuth,
  requireAdmin,
  auditCritical('VIEW_CRITICAL_LOGS'),
  AuditController.getCriticalActions
);

/**
 * @route GET /api/audit-logs/entity/:entity/:entityId
 * @desc Get audit logs for specific entity
 * @access Admin
 */
router.get(
  '/audit-logs/entity/:entity/:entityId',
  requireAuth,
  requireAdmin,
  param('entity').isString().withMessage('Entity must be a string'),
  param('entityId').isString().withMessage('Entity ID must be a string'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  AuditController.getEntityAuditLogs
);

/**
 * @route GET /api/audit-logs/user/:userId
 * @desc Get user activity logs
 * @access Admin or Own User
 */
router.get(
  '/audit-logs/user/:userId',
  requireAuth,
  param('userId').isUUID().withMessage('User ID must be a valid UUID'),
  query('days').optional().isInt({ min: 1, max: 365 }),
  (req, res, next) => {
    // Allow users to view their own logs or admins to view any
    if (req.user.role === 'admin' || req.user.id === req.params.userId) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
  },
  AuditController.getUserActivity
);

/**
 * @route GET /api/audit-logs/:id
 * @desc Get audit log by ID
 * @access Admin
 */
router.get(
  '/audit-logs/:id',
  requireAuth,
  requireAdmin,
  param('id').isUUID().withMessage('ID must be a valid UUID'),
  AuditController.getAuditLogById
);

/**
 * @route POST /api/audit-logs/export
 * @desc Export audit logs
 * @access Admin
 */
router.post(
  '/audit-logs/export',
  requireAuth,
  requireAdmin,
  auditCritical('EXPORT_AUDIT_LOGS'),
  validateExportRequest,
  AuditController.exportAuditLogs
);

module.exports = router;