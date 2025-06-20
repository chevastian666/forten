/**
 * Event Routes
 * API endpoints for event management with cursor-based pagination
 */

const express = require('express');
const { query, param, validationResult } = require('express-validator');
const EventService = require('../services/event.service');
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
 * GET /api/events
 * Get paginated events with filters
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
    query('eventType')
      .optional()
      .isString(),
    query('severity')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical']),
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
        eventType: req.query.eventType,
        severity: req.query.severity,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        userId: req.query.userId,
        search: req.query.search
      };

      const paginationParams = {
        cursor: req.query.cursor,
        limit: parseInt(req.query.limit) || 20,
        direction: req.query.direction || 'next'
      };

      const result = await EventService.getEvents(filters, paginationParams);

      // Add pagination URLs
      const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
      result.links = CursorPagination.generatePaginationUrls(baseUrl, result.metadata);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Event route error', {
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
 * GET /api/events/building/:buildingId
 * Get events for specific building
 */
router.get('/building/:buildingId',
  authenticate,
  checkBuildingAccess,
  [
    param('buildingId')
      .notEmpty()
      .withMessage('Building ID is required'),
    query('cursor').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('direction').optional().isIn(['next', 'prev'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await EventService.getEventsByBuilding(
        req.params.buildingId,
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
 * GET /api/events/critical
 * Get critical events across all buildings
 */
router.get('/critical',
  authenticate,
  [
    query('cursor').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await EventService.getCriticalEvents({
        cursor: req.query.cursor,
        limit: parseInt(req.query.limit)
      });

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
 * GET /api/events/stats
 * Get event statistics
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
      const stats = await EventService.getEventStats(
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
 * GET /api/events/export
 * Stream events for export (no pagination needed)
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
        endDate: req.query.endDate
      };

      for await (const batch of EventService.getEventsForExport(filters)) {
        for (const event of batch) {
          if (!first) res.write(',');
          res.write(JSON.stringify(event));
          first = false;
        }
      }
      
      res.write(']');
      res.end();
    } catch (error) {
      logger.error('Event export error', {
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
        endpoint: 'GET /api/events',
        request: {
          query: {
            buildingId: 'building-1',
            severity: 'high',
            limit: 20,
            cursor: 'encrypted-cursor-string'
          }
        },
        response: {
          success: true,
          data: [
            {
              id: 'event-123',
              eventType: 'security_alert',
              severity: 'high',
              description: 'Unauthorized access attempt',
              buildingId: 'building-1',
              createdAt: '2024-01-15T10:30:00Z',
              user: {
                id: 'user-456',
                email: 'john@example.com',
                name: 'John Doe'
              }
            }
          ],
          metadata: {
            limit: 20,
            count: 20,
            hasNextPage: true,
            hasPrevPage: false,
            nextCursor: 'next-encrypted-cursor',
            prevCursor: null
          },
          links: {
            current: 'https://api.forten.com/api/events',
            next: 'https://api.forten.com/api/events?cursor=next-encrypted-cursor&limit=20'
          }
        }
      }
    });
  }
);

module.exports = router;