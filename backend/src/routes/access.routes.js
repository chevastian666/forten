/**
 * Access Routes
 * API endpoints for access log management with cursor-based pagination
 */

const express = require('express');
const { query, param, validationResult } = require('express-validator');
const AccessService = require('../services/access.service');
const { CursorPagination } = require('../utils/pagination.util');
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
 * Building access check
 */
const checkBuildingAccess = (req, res, next) => {
  const buildingId = req.query.buildingId || req.params.buildingId;
  
  if (buildingId && req.user.role !== 'admin') {
    if (!req.user.buildings || !req.user.buildings.includes(buildingId)) {
      return res.status(403).json({
        success: false,
        message: 'No access to this building'
      });
    }
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
 * GET /api/access
 * Get paginated access logs with filters
 */
router.get('/',
  authenticate,
  checkBuildingAccess,
  [
    query('cursor')
      .optional()
      .isString()
      .withMessage('Invalid cursor'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('direction')
      .optional()
      .isIn(['next', 'prev'])
      .withMessage('Direction must be next or prev'),
    query('buildingId')
      .optional()
      .isString(),
    query('accessType')
      .optional()
      .isIn(['entry', 'exit', 'attempt']),
    query('accessResult')
      .optional()
      .isIn(['granted', 'denied', 'pending']),
    query('startDate')
      .optional()
      .isISO8601(),
    query('endDate')
      .optional()
      .isISO8601(),
    query('search')
      .optional()
      .isString()
      .trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const filters = {
        buildingId: req.query.buildingId,
        userId: req.query.userId,
        accessType: req.query.accessType,
        accessResult: req.query.accessResult,
        deviceId: req.query.deviceId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        search: req.query.search
      };

      const paginationParams = {
        cursor: req.query.cursor,
        limit: parseInt(req.query.limit) || 20,
        direction: req.query.direction || 'next'
      };

      const result = await AccessService.getAccessLogs(filters, paginationParams);

      // Add pagination URLs
      const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
      result.links = CursorPagination.generatePaginationUrls(baseUrl, result.metadata);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Access route error', {
        error: error.message,
        path: req.path
      });
      
      if (error.message === 'Invalid pagination cursor') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/access/person/:document
 * Get access logs for specific person
 */
router.get('/person/:document',
  authenticate,
  [
    param('document')
      .notEmpty()
      .withMessage('Document is required'),
    query('cursor').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('direction').optional().isIn(['next', 'prev'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await AccessService.getAccessByPerson(
        req.params.document,
        {
          cursor: req.query.cursor,
          limit: parseInt(req.query.limit),
          direction: req.query.direction
        }
      );

      res.json({
        success: true,
        ...result
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
 * GET /api/access/failed/:buildingId
 * Get failed access attempts
 */
router.get('/failed/:buildingId',
  authenticate,
  checkBuildingAccess,
  [
    param('buildingId')
      .notEmpty()
      .withMessage('Building ID is required'),
    query('cursor').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('timeWindow').optional().isInt({ min: 1, max: 168 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await AccessService.getFailedAccess(
        req.params.buildingId,
        {
          cursor: req.query.cursor,
          limit: parseInt(req.query.limit),
          timeWindow: parseInt(req.query.timeWindow)
        }
      );

      res.json({
        success: true,
        ...result
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
 * GET /api/access/frequency/:buildingId
 * Get access frequency analysis
 */
router.get('/frequency/:buildingId',
  authenticate,
  checkBuildingAccess,
  [
    param('buildingId').notEmpty(),
    query('cursor').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('groupBy').optional().isIn(['hour', 'day', 'week'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await AccessService.getAccessFrequency(
        req.params.buildingId,
        {
          cursor: req.query.cursor,
          limit: parseInt(req.query.limit),
          startDate: req.query.startDate,
          endDate: req.query.endDate,
          groupBy: req.query.groupBy
        }
      );

      res.json({
        success: true,
        ...result
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
 * GET /api/access/visitors/:buildingId
 * Get top visitors with pagination
 */
router.get('/visitors/:buildingId',
  authenticate,
  checkBuildingAccess,
  [
    param('buildingId').notEmpty(),
    query('cursor').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await AccessService.getTopVisitors(
        req.params.buildingId,
        {
          cursor: req.query.cursor,
          limit: parseInt(req.query.limit),
          startDate: req.query.startDate,
          endDate: req.query.endDate
        }
      );

      res.json({
        success: true,
        ...result
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
 * GET /api/access/stats
 * Get access statistics
 */
router.get('/stats',
  authenticate,
  checkBuildingAccess,
  [
    query('buildingId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const stats = await AccessService.getAccessStats(
        req.query.buildingId,
        {
          startDate: req.query.startDate,
          endDate: req.query.endDate
        }
      );

      res.json({
        success: true,
        data: stats
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
 * GET /api/access/export
 * Stream access logs for export
 */
router.get('/export',
  authenticate,
  checkBuildingAccess,
  async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Transfer-Encoding', 'chunked');
      
      res.write('[');
      
      let first = true;
      const filters = {
        buildingId: req.query.buildingId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        accessResult: req.query.accessResult
      };

      for await (const batch of AccessService.getAccessLogsForExport(filters)) {
        for (const access of batch) {
          if (!first) res.write(',');
          res.write(JSON.stringify(access));
          first = false;
        }
      }
      
      res.write(']');
      res.end();
    } catch (error) {
      logger.error('Access export error', {
        error: error.message
      });
      res.status(500).end();
    }
  }
);

/**
 * Example response documentation
 */
router.get('/example',
  (req, res) => {
    res.json({
      success: true,
      example: {
        endpoint: 'GET /api/access',
        request: {
          query: {
            buildingId: 'building-1',
            accessResult: 'granted',
            limit: 50,
            cursor: 'encrypted-cursor-string',
            direction: 'next'
          }
        },
        response: {
          success: true,
          data: [
            {
              id: 'access-123',
              accessTime: '2024-01-15T10:30:00Z',
              accessType: 'entry',
              accessResult: 'granted',
              accessMethod: 'card',
              personName: 'John Doe',
              personDocument: '12345678',
              personType: 'resident',
              buildingId: 'building-1',
              device: {
                id: 'device-456',
                name: 'Main Entrance',
                type: 'card_reader',
                location: 'Lobby'
              }
            }
          ],
          metadata: {
            limit: 50,
            count: 50,
            hasNextPage: true,
            hasPrevPage: true,
            nextCursor: 'next-encrypted-cursor',
            prevCursor: 'prev-encrypted-cursor'
          },
          links: {
            current: 'https://api.forten.com/api/access',
            next: 'https://api.forten.com/api/access?cursor=next-encrypted-cursor&limit=50',
            prev: 'https://api.forten.com/api/access?cursor=prev-encrypted-cursor&limit=50&direction=prev'
          }
        },
        notes: {
          cursor: 'Cursors are encrypted and contain ID + timestamp for efficient pagination',
          maxLimit: 'Maximum 100 items per page',
          efficiency: 'Handles millions of records without performance degradation',
          ordering: 'Results ordered by access_time DESC, id DESC for consistency'
        }
      }
    });
  }
);

module.exports = router;