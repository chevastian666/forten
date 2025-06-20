/**
 * Notification Routes
 * API endpoints for managing notifications and queue system
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { notificationService, PRIORITIES, NOTIFICATION_TYPES, CHANNELS } = require('../services/notification.service');

const router = express.Router();

/**
 * Validation middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

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
    last_name: 'User'
  };
  next();
};

/**
 * Authorization middleware
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * GET /api/notifications/health
 * Get notification system health status
 */
router.get('/health', async (req, res) => {
  try {
    const health = await notificationService.getHealthStatus();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get health status',
      error: error.message
    });
  }
});

/**
 * GET /api/notifications/stats
 * Get notification queue statistics
 */
router.get('/stats', authenticate, authorize(['admin', 'operator']), async (req, res) => {
  try {
    const stats = await notificationService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get notification stats',
      error: error.message
    });
  }
});

/**
 * GET /api/notifications/dashboard
 * Get notification dashboard data
 */
router.get('/dashboard', authenticate, authorize(['admin', 'operator']), async (req, res) => {
  try {
    const dashboard = await notificationService.getDashboardData();
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data',
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/send
 * Send custom notification
 */
router.post('/send', [
  authenticate,
  authorize(['admin', 'operator']),
  body('type').isIn(Object.values(NOTIFICATION_TYPES)).withMessage('Invalid notification type'),
  body('data').isObject().withMessage('Data must be an object'),
  body('channels').optional().isArray().withMessage('Channels must be an array'),
  body('priority').optional().isIn(Object.values(PRIORITIES)).withMessage('Invalid priority'),
  body('recipients').optional().isArray().withMessage('Recipients must be an array'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { type, data, channels, priority, recipients, delay, metadata } = req.body;

    const options = {
      channels: channels || [CHANNELS.WEBSOCKET],
      priority: priority || PRIORITIES.MEDIUM,
      recipients: recipients || [],
      delay: delay || 0,
      metadata: metadata || {}
    };

    const result = await notificationService.sendCustomNotification(type, data, options);

    res.json({
      success: true,
      data: result,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/security-alert
 * Send security alert notification
 */
router.post('/security-alert', [
  authenticate,
  authorize(['admin', 'operator', 'security']),
  body('description').notEmpty().withMessage('Description is required'),
  body('buildingName').optional().isString(),
  body('location').optional().isString(),
  body('deviceId').optional().isString(),
  body('recipients').optional().isArray(),
  handleValidationErrors
], async (req, res) => {
  try {
    const alertData = req.body;
    const recipients = alertData.recipients || [];

    const result = await notificationService.sendSecurityAlert(alertData, recipients);

    res.json({
      success: true,
      data: result,
      message: 'Security alert sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send security alert',
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/access-event
 * Send access event notification
 */
router.post('/access-event', [
  authenticate,
  authorize(['admin', 'operator', 'security']),
  body('status').isIn(['granted', 'denied']).withMessage('Status must be granted or denied'),
  body('userName').notEmpty().withMessage('User name is required'),
  body('buildingName').optional().isString(),
  body('entryPoint').optional().isString(),
  body('method').optional().isString(),
  body('reason').optional().isString(),
  body('recipients').optional().isArray(),
  handleValidationErrors
], async (req, res) => {
  try {
    const accessData = req.body;
    const recipients = accessData.recipients || [];

    const result = await notificationService.sendAccessNotification(accessData, recipients);

    res.json({
      success: true,
      data: result,
      message: 'Access notification sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send access notification',
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/device-status
 * Send device status notification
 */
router.post('/device-status', [
  authenticate,
  authorize(['admin', 'operator', 'technical']),
  body('deviceName').optional().isString(),
  body('deviceId').optional().isString(),
  body('status').isIn(['online', 'offline', 'error', 'maintenance']).withMessage('Invalid status'),
  body('location').optional().isString(),
  body('lastSeen').optional().isISO8601(),
  body('recipients').optional().isArray(),
  handleValidationErrors
], async (req, res) => {
  try {
    const deviceData = req.body;
    const recipients = deviceData.recipients || [];

    const result = await notificationService.sendDeviceStatus(deviceData, recipients);

    res.json({
      success: true,
      data: result,
      message: 'Device status notification sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send device status notification',
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/maintenance
 * Send maintenance notification
 */
router.post('/maintenance', [
  authenticate,
  authorize(['admin', 'operator']),
  body('type').notEmpty().withMessage('Maintenance type is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('scheduleTime').optional().isISO8601(),
  body('duration').optional().isString(),
  body('affectedSystems').optional().isArray(),
  body('recipients').optional().isArray(),
  handleValidationErrors
], async (req, res) => {
  try {
    const maintenanceData = req.body;
    const recipients = maintenanceData.recipients || [];

    const result = await notificationService.sendMaintenanceNotification(maintenanceData, recipients);

    res.json({
      success: true,
      data: result,
      message: 'Maintenance notification sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send maintenance notification',
      error: error.message
    });
  }
});

/**
 * GET /api/notifications/failed
 * Get failed notifications
 */
router.get('/failed', authenticate, authorize(['admin', 'operator']), async (req, res) => {
  try {
    const { queue } = req.query;
    const failedJobs = await notificationService.getFailedNotifications(queue || 'all');

    res.json({
      success: true,
      data: failedJobs,
      count: failedJobs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get failed notifications',
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/retry
 * Retry failed notifications
 */
router.post('/retry', [
  authenticate,
  authorize(['admin']),
  body('queue').optional().isString(),
  body('jobIds').optional().isArray(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { queue, jobIds } = req.body;
    const result = await notificationService.retryFailedNotifications(queue || 'all', jobIds || []);

    res.json({
      success: true,
      data: result,
      message: 'Failed notifications retried successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retry notifications',
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/pause
 * Pause notification processing
 */
router.post('/pause', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const result = await notificationService.pauseNotifications();

    res.json({
      success: true,
      data: result,
      message: 'Notification processing paused'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to pause notifications',
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/resume
 * Resume notification processing
 */
router.post('/resume', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const result = await notificationService.resumeNotifications();

    res.json({
      success: true,
      data: result,
      message: 'Notification processing resumed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resume notifications',
      error: error.message
    });
  }
});

/**
 * DELETE /api/notifications/clean
 * Clean old notifications
 */
router.delete('/clean', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { maxAge } = req.query;
    const maxAgeMs = maxAge ? parseInt(maxAge) * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // Default 24 hours

    const result = await notificationService.cleanOldNotifications(maxAgeMs);

    res.json({
      success: true,
      data: result,
      message: 'Old notifications cleaned successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clean old notifications',
      error: error.message
    });
  }
});

/**
 * POST /api/notifications/test
 * Test notification system
 */
router.post('/test', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const result = await notificationService.testNotifications();

    res.json({
      success: true,
      data: result,
      message: 'Notification test completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Notification test failed',
      error: error.message
    });
  }
});

/**
 * GET /api/notifications/types
 * Get available notification types
 */
router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: {
      types: NOTIFICATION_TYPES,
      channels: CHANNELS,
      priorities: PRIORITIES
    }
  });
});

module.exports = router;