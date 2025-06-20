/**
 * Webhook Routes
 * API endpoints for webhook management
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const WebhookService = require('../services/webhook.service');
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
 * POST /api/webhooks
 * Create a new webhook
 */
router.post('/',
  authenticate,
  authorize(['admin', 'operator']),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name must be less than 100 characters'),
    body('url')
      .trim()
      .notEmpty()
      .withMessage('URL is required')
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Invalid URL'),
    body('events')
      .isArray({ min: 1 })
      .withMessage('At least one event is required'),
    body('events.*')
      .isString()
      .withMessage('Event must be a string'),
    body('filters')
      .optional()
      .isObject()
      .withMessage('Filters must be an object'),
    body('headers')
      .optional()
      .isObject()
      .withMessage('Headers must be an object'),
    body('buildingId')
      .optional()
      .isString()
      .withMessage('Building ID must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const webhook = await WebhookService.createWebhook({
        ...req.body,
        userId: req.user.id
      });

      res.status(201).json({
        success: true,
        data: webhook
      });
    } catch (error) {
      logger.error('Webhook creation error', {
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
 * GET /api/webhooks
 * List webhooks
 */
router.get('/',
  authenticate,
  async (req, res) => {
    try {
      const filters = {
        userId: req.user.role === 'admin' ? req.query.userId : req.user.id,
        buildingId: req.query.buildingId,
        isActive: req.query.isActive === 'true' ? true : 
                  req.query.isActive === 'false' ? false : undefined
      };

      const webhooks = await WebhookService.listWebhooks(filters);

      res.json({
        success: true,
        data: webhooks
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
 * GET /api/webhooks/:id
 * Get webhook details
 */
router.get('/:id',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid webhook ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const webhook = await WebhookService.getWebhook(req.params.id);
      
      if (!webhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook not found'
        });
      }

      // Check access
      if (req.user.role !== 'admin' && webhook.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: webhook
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
 * PUT /api/webhooks/:id
 * Update webhook
 */
router.put('/:id',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid webhook ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Name must be less than 100 characters'),
    body('url')
      .optional()
      .trim()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Invalid URL'),
    body('events')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one event is required'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check ownership
      const webhook = await WebhookService.getWebhook(req.params.id);
      if (!webhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook not found'
        });
      }

      if (req.user.role !== 'admin' && webhook.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const updated = await WebhookService.updateWebhook(req.params.id, req.body);

      res.json({
        success: true,
        data: updated
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
 * DELETE /api/webhooks/:id
 * Delete webhook
 */
router.delete('/:id',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid webhook ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check ownership
      const webhook = await WebhookService.getWebhook(req.params.id);
      if (!webhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook not found'
        });
      }

      if (req.user.role !== 'admin' && webhook.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await WebhookService.deleteWebhook(req.params.id);

      res.json({
        success: true,
        message: 'Webhook deleted successfully'
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
 * POST /api/webhooks/:id/test
 * Test webhook
 */
router.post('/:id/test',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid webhook ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check ownership
      const webhook = await WebhookService.getWebhook(req.params.id);
      if (!webhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook not found'
        });
      }

      if (req.user.role !== 'admin' && webhook.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const result = await WebhookService.testWebhook(req.params.id);

      res.json({
        success: true,
        message: 'Test event sent',
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
 * GET /api/webhooks/:id/stats
 * Get webhook statistics
 */
router.get('/:id/stats',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid webhook ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check ownership
      const webhook = await WebhookService.getWebhook(req.params.id);
      if (!webhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook not found'
        });
      }

      if (req.user.role !== 'admin' && webhook.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const stats = await WebhookService.getWebhookStats(req.params.id);

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
 * GET /api/webhooks/:id/deliveries
 * Get webhook delivery history
 */
router.get('/:id/deliveries',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid webhook ID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative'),
    query('status')
      .optional()
      .isIn(['pending', 'success', 'failed', 'retrying'])
      .withMessage('Invalid status')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check ownership
      const webhook = await WebhookService.getWebhook(req.params.id);
      if (!webhook) {
        return res.status(404).json({
          success: false,
          message: 'Webhook not found'
        });
      }

      if (req.user.role !== 'admin' && webhook.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const result = await WebhookService.getDeliveryHistory(req.params.id, {
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0,
        status: req.query.status
      });

      res.json({
        success: true,
        data: result.rows,
        total: result.count,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
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
 * POST /api/webhooks/deliveries/:id/retry
 * Retry failed delivery
 */
router.post('/deliveries/:id/retry',
  authenticate,
  authorize(['admin', 'operator']),
  [
    param('id').isUUID().withMessage('Invalid delivery ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await WebhookService.retryDelivery(req.params.id);

      res.json({
        success: true,
        message: 'Delivery queued for retry'
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
 * POST /api/webhooks/trigger
 * Manually trigger webhook event (admin only)
 */
router.post('/trigger',
  authenticate,
  authorize(['admin']),
  [
    body('eventType')
      .notEmpty()
      .withMessage('Event type is required'),
    body('eventData')
      .isObject()
      .withMessage('Event data must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await WebhookService.triggerEvent(
        req.body.eventType,
        req.body.eventData
      );

      res.json({
        success: true,
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
 * POST /api/webhooks/verify-signature
 * Verify webhook signature
 */
router.post('/verify-signature',
  [
    body('secret')
      .notEmpty()
      .withMessage('Secret is required'),
    body('payload')
      .isObject()
      .withMessage('Payload must be an object'),
    body('signature')
      .notEmpty()
      .withMessage('Signature is required')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const { secret, payload, signature } = req.body;
      
      const isValid = WebhookService.verifySignature(secret, payload, signature);

      res.json({
        success: true,
        valid: isValid
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
 * GET /api/webhooks/events
 * Get available webhook events
 */
router.get('/events',
  authenticate,
  (req, res) => {
    res.json({
      success: true,
      data: [
        {
          category: 'Building',
          events: [
            { name: 'building.alarm', description: 'Building alarm triggered' },
            { name: 'building.access_granted', description: 'Access granted to building' },
            { name: 'building.access_denied', description: 'Access denied to building' }
          ]
        },
        {
          category: 'Device',
          events: [
            { name: 'device.online', description: 'Device came online' },
            { name: 'device.offline', description: 'Device went offline' },
            { name: 'device.error', description: 'Device error occurred' }
          ]
        },
        {
          category: 'Alert',
          events: [
            { name: 'alert.security', description: 'Security alert triggered' },
            { name: 'alert.maintenance', description: 'Maintenance alert triggered' }
          ]
        },
        {
          category: 'User',
          events: [
            { name: 'user.login', description: 'User logged in' },
            { name: 'user.logout', description: 'User logged out' }
          ]
        },
        {
          category: 'Visitor',
          events: [
            { name: 'visitor.registered', description: 'Visitor registered' },
            { name: 'visitor.checkin', description: 'Visitor checked in' },
            { name: 'visitor.checkout', description: 'Visitor checked out' }
          ]
        },
        {
          category: 'System',
          events: [
            { name: 'emergency.triggered', description: 'Emergency triggered' },
            { name: 'system.error', description: 'System error occurred' }
          ]
        }
      ]
    });
  }
);

module.exports = router;