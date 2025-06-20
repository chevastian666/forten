/**
 * PIN Routes
 * API endpoints for secure PIN management
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const PinService = require('../services/pin.service');
const { logSecurity } = require('../config/logger');

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
      logSecurity('Unauthorized PIN access attempt', {
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: roles,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

/**
 * Building access check
 */
const checkBuildingAccess = (req, res, next) => {
  const buildingId = req.params.buildingId || req.body.buildingId;
  
  if (buildingId && req.user.role !== 'admin') {
    if (!req.user.buildings || !req.user.buildings.includes(buildingId)) {
      logSecurity('Unauthorized building access in PIN request', {
        userId: req.user.id,
        buildingId,
        userBuildings: req.user.buildings
      });
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
 * POST /api/pins/generate
 * Generate a new secure PIN
 */
router.post('/generate',
  authenticate,
  authorize(['admin', 'operator']),
  checkBuildingAccess,
  [
    body('buildingId')
      .notEmpty()
      .withMessage('Building ID is required'),
    body('purpose')
      .optional()
      .isIn(['access', 'temporary_access', 'delivery', 'emergency', 'maintenance', 'visitor', 'contractor', 'special_event'])
      .withMessage('Invalid purpose'),
    body('length')
      .optional()
      .isInt({ min: 4, max: 10 })
      .withMessage('PIN length must be between 4 and 10'),
    body('expirationHours')
      .optional()
      .isFloat({ min: 0.5, max: 720 })
      .withMessage('Expiration must be between 0.5 and 720 hours'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const pinData = await PinService.generatePin({
        ...req.body,
        userId: req.user.id
      });

      logSecurity('PIN generated', {
        pinId: pinData.id,
        buildingId: req.body.buildingId,
        purpose: req.body.purpose || 'access',
        generatedBy: req.user.id
      });

      res.json({
        success: true,
        data: pinData
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
 * POST /api/pins/validate
 * Validate a PIN
 */
router.post('/validate',
  authenticate,
  [
    body('pin')
      .notEmpty()
      .matches(/^\d{4,10}$/)
      .withMessage('Invalid PIN format'),
    body('buildingId')
      .notEmpty()
      .withMessage('Building ID is required'),
    body('purpose')
      .optional()
      .isString()
      .withMessage('Purpose must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await PinService.validatePin(
        req.body.pin,
        req.body.buildingId,
        { purpose: req.body.purpose }
      );

      if (result.valid) {
        logSecurity('PIN validated successfully', {
          pinId: result.id,
          buildingId: req.body.buildingId,
          validatedBy: req.user.id
        });
      } else {
        logSecurity('Invalid PIN validation attempt', {
          buildingId: req.body.buildingId,
          attemptBy: req.user.id
        });
      }

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
 * POST /api/pins/bulk-generate
 * Generate multiple PINs
 */
router.post('/bulk-generate',
  authenticate,
  authorize(['admin']),
  checkBuildingAccess,
  [
    body('count')
      .isInt({ min: 1, max: 100 })
      .withMessage('Count must be between 1 and 100'),
    body('buildingId')
      .notEmpty()
      .withMessage('Building ID is required'),
    body('purpose')
      .optional()
      .isIn(['access', 'temporary_access', 'delivery', 'visitor'])
      .withMessage('Invalid purpose'),
    body('expirationHours')
      .optional()
      .isFloat({ min: 1, max: 168 })
      .withMessage('Expiration must be between 1 and 168 hours')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { count, ...options } = req.body;
      const result = await PinService.bulkGeneratePins(count, {
        ...options,
        userId: req.user.id
      });

      logSecurity('Bulk PINs generated', {
        count: result.pins.length,
        buildingId: req.body.buildingId,
        generatedBy: req.user.id
      });

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
 * POST /api/pins/:pinId/revoke
 * Revoke a PIN
 */
router.post('/:pinId/revoke',
  authenticate,
  authorize(['admin', 'operator']),
  [
    param('pinId')
      .isUUID()
      .withMessage('Invalid PIN ID'),
    body('reason')
      .optional()
      .isString()
      .withMessage('Reason must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await PinService.revokePin(req.params.pinId, req.user.id);

      logSecurity('PIN revoked', {
        pinId: req.params.pinId,
        revokedBy: req.user.id,
        reason: req.body.reason
      });

      res.json({
        success: true,
        message: 'PIN revoked successfully'
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
 * GET /api/pins/stats/:buildingId
 * Get PIN statistics for a building
 */
router.get('/stats/:buildingId',
  authenticate,
  authorize(['admin', 'operator']),
  checkBuildingAccess,
  [
    param('buildingId')
      .notEmpty()
      .withMessage('Building ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const stats = await PinService.getPinStats(req.params.buildingId);

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
 * POST /api/pins/temporary-access
 * Generate temporary access PIN for visitors
 */
router.post('/temporary-access',
  authenticate,
  authorize(['admin', 'operator', 'security']),
  checkBuildingAccess,
  [
    body('buildingId')
      .notEmpty()
      .withMessage('Building ID is required'),
    body('visitorName')
      .notEmpty()
      .trim()
      .withMessage('Visitor name is required'),
    body('visitorDocument')
      .notEmpty()
      .trim()
      .withMessage('Visitor document is required'),
    body('validHours')
      .optional()
      .isFloat({ min: 0.5, max: 24 })
      .withMessage('Valid hours must be between 0.5 and 24'),
    body('accessAreas')
      .optional()
      .isArray()
      .withMessage('Access areas must be an array')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { buildingId, visitorName, visitorDocument, validHours, accessAreas } = req.body;
      
      const pinData = await PinService.generateTemporaryAccessPin(
        buildingId,
        {
          name: visitorName,
          document: visitorDocument,
          authorizedBy: req.user.id,
          accessAreas
        },
        validHours
      );

      logSecurity('Temporary access PIN generated', {
        pinId: pinData.id,
        buildingId,
        visitorName,
        authorizedBy: req.user.id
      });

      res.json({
        success: true,
        data: pinData
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
 * POST /api/pins/delivery
 * Generate PIN for delivery personnel
 */
router.post('/delivery',
  authenticate,
  authorize(['admin', 'operator', 'security']),
  checkBuildingAccess,
  [
    body('buildingId')
      .notEmpty()
      .withMessage('Building ID is required'),
    body('company')
      .notEmpty()
      .trim()
      .withMessage('Delivery company is required'),
    body('unit')
      .notEmpty()
      .trim()
      .withMessage('Recipient unit is required'),
    body('trackingNumber')
      .optional()
      .trim(),
    body('type')
      .optional()
      .isIn(['package', 'food', 'documents', 'other'])
      .withMessage('Invalid delivery type'),
    body('validHours')
      .optional()
      .isFloat({ min: 0.5, max: 8 })
      .withMessage('Valid hours must be between 0.5 and 8')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { buildingId, company, unit, trackingNumber, type, validHours } = req.body;
      
      const pinData = await PinService.generateDeliveryPin(
        buildingId,
        { company, unit, trackingNumber, type: type || 'package' },
        validHours
      );

      logSecurity('Delivery PIN generated', {
        pinId: pinData.id,
        buildingId,
        company,
        unit,
        generatedBy: req.user.id
      });

      res.json({
        success: true,
        data: pinData
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
 * POST /api/pins/emergency
 * Generate emergency access PIN
 */
router.post('/emergency',
  authenticate,
  authorize(['admin']),
  checkBuildingAccess,
  [
    body('buildingId')
      .notEmpty()
      .withMessage('Building ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const pinData = await PinService.generateEmergencyPin(
        req.body.buildingId,
        req.user.id
      );

      logSecurity('Emergency PIN generated', {
        pinId: pinData.id,
        buildingId: req.body.buildingId,
        generatedBy: req.user.id
      });

      res.json({
        success: true,
        data: pinData
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
 * DELETE /api/pins/cleanup
 * Clean up expired PINs
 */
router.delete('/cleanup',
  authenticate,
  authorize(['admin']),
  async (req, res) => {
    try {
      const result = await PinService.cleanExpiredPins();

      logSecurity('Expired PINs cleaned', {
        count: result.cleaned,
        cleanedBy: req.user.id
      });

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
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  logSecurity('PIN route error', {
    error: error.message,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;