/**
 * PIN Controller
 * Business logic for PIN management endpoints
 */

const PinService = require('../services/pin.service');
const { logger } = require('../config/logger');

class PinController {
  /**
   * Generate a new PIN
   */
  async generatePin(req, res) {
    try {
      const { buildingId, purpose, length, expirationHours, metadata } = req.body;
      const userId = req.user.id;

      const pinData = await PinService.generatePin({
        buildingId,
        userId,
        purpose,
        length,
        expirationHours,
        metadata
      });

      logger.info('PIN generated via controller', {
        pinId: pinData.id,
        buildingId,
        purpose
      });

      return res.status(201).json({
        success: true,
        data: pinData,
        message: 'PIN generated successfully'
      });
    } catch (error) {
      logger.error('PIN generation error in controller', {
        error: error.message,
        buildingId: req.body.buildingId
      });

      return res.status(error.message.includes('required') ? 400 : 500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Validate a PIN
   */
  async validatePin(req, res) {
    try {
      const { pin, buildingId, purpose } = req.body;

      const result = await PinService.validatePin(pin, buildingId, { purpose });

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('PIN validation error in controller', {
        error: error.message,
        buildingId: req.body.buildingId
      });

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get PIN statistics
   */
  async getPinStats(req, res) {
    try {
      const { buildingId } = req.params;

      const stats = await PinService.getPinStats(buildingId);

      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting PIN stats in controller', {
        error: error.message,
        buildingId: req.params.buildingId
      });

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Revoke a PIN
   */
  async revokePin(req, res) {
    try {
      const { pinId } = req.params;
      const { reason } = req.body;
      const revokedBy = req.user.id;

      await PinService.revokePin(pinId, revokedBy, reason);

      return res.json({
        success: true,
        message: 'PIN revoked successfully'
      });
    } catch (error) {
      logger.error('PIN revocation error in controller', {
        error: error.message,
        pinId: req.params.pinId
      });

      return res.status(error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Bulk generate PINs
   */
  async bulkGeneratePins(req, res) {
    try {
      const { count, ...options } = req.body;
      options.userId = req.user.id;

      const result = await PinService.bulkGeneratePins(count, options);

      return res.json({
        success: true,
        data: result,
        message: `Generated ${result.pins.length} PINs successfully`
      });
    } catch (error) {
      logger.error('Bulk PIN generation error in controller', {
        error: error.message,
        count: req.body.count
      });

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Generate temporary access PIN
   */
  async generateTemporaryAccess(req, res) {
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

      return res.status(201).json({
        success: true,
        data: pinData,
        message: 'Temporary access PIN generated successfully'
      });
    } catch (error) {
      logger.error('Temporary access PIN generation error', {
        error: error.message,
        buildingId: req.body.buildingId
      });

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Generate delivery PIN
   */
  async generateDeliveryPin(req, res) {
    try {
      const { buildingId, company, unit, trackingNumber, type, validHours } = req.body;
      
      const pinData = await PinService.generateDeliveryPin(
        buildingId,
        { company, unit, trackingNumber, type: type || 'package' },
        validHours
      );

      return res.status(201).json({
        success: true,
        data: pinData,
        message: 'Delivery PIN generated successfully'
      });
    } catch (error) {
      logger.error('Delivery PIN generation error', {
        error: error.message,
        buildingId: req.body.buildingId
      });

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Generate emergency PIN
   */
  async generateEmergencyPin(req, res) {
    try {
      const { buildingId } = req.body;
      
      const pinData = await PinService.generateEmergencyPin(
        buildingId,
        req.user.id
      );

      return res.status(201).json({
        success: true,
        data: pinData,
        message: 'Emergency PIN generated successfully'
      });
    } catch (error) {
      logger.error('Emergency PIN generation error', {
        error: error.message,
        buildingId: req.body.buildingId
      });

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Clean expired PINs
   */
  async cleanExpiredPins(req, res) {
    try {
      const result = await PinService.cleanExpiredPins();

      return res.json({
        success: true,
        data: result,
        message: `Cleaned ${result.cleaned} expired PINs`
      });
    } catch (error) {
      logger.error('PIN cleanup error', {
        error: error.message
      });

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new PinController();