/**
 * Audit Service
 * Handles audit logging logic and change detection
 */

const AuditLog = require('../models/AuditLog');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

class AuditService {
  /**
   * Log an audit event
   * @param {Object} auditData - Audit event data
   * @returns {Promise<AuditLog>} Created audit log
   */
  static async log(auditData) {
    try {
      const logEntry = await AuditLog.create({
        ...auditData,
        request_id: auditData.request_id || uuidv4(),
        created_at: new Date()
      });
      
      return logEntry;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw error to prevent disrupting the main flow
      return null;
    }
  }

  /**
   * Log a successful action
   * @param {Object} params - Action parameters
   * @returns {Promise<AuditLog>} Created audit log
   */
  static async logSuccess({
    userId,
    action,
    entity,
    entityId,
    changes,
    metadata,
    request
  }) {
    const auditData = this.buildAuditData({
      userId,
      action,
      entity,
      entityId,
      changes,
      metadata,
      request,
      status: 'SUCCESS'
    });

    return await this.log(auditData);
  }

  /**
   * Log a failed action
   * @param {Object} params - Action parameters
   * @returns {Promise<AuditLog>} Created audit log
   */
  static async logFailure({
    userId,
    action,
    entity,
    entityId,
    error,
    metadata,
    request
  }) {
    const auditData = this.buildAuditData({
      userId,
      action,
      entity,
      entityId,
      metadata,
      request,
      status: 'FAILED',
      error_message: error.message || error
    });

    return await this.log(auditData);
  }

  /**
   * Build audit data from request and parameters
   * @param {Object} params - Parameters
   * @returns {Object} Audit data object
   */
  static buildAuditData({
    userId,
    action,
    entity,
    entityId,
    changes,
    metadata = {},
    request,
    status = 'SUCCESS',
    error_message = null
  }) {
    const auditData = {
      user_id: userId,
      action,
      entity,
      entity_id: entityId,
      changes,
      metadata,
      status,
      error_message
    };

    // Extract request information if available
    if (request) {
      auditData.ip_address = this.getClientIp(request);
      auditData.user_agent = request.get('user-agent');
      auditData.method = request.method;
      auditData.path = request.originalUrl || request.url;
      auditData.query_params = request.query || {};
      auditData.session_id = request.session?.id;
      auditData.request_id = request.id || request.headers['x-request-id'];
      
      // Add request timing if available
      if (request.startTime) {
        auditData.duration_ms = Date.now() - request.startTime;
      }
    }

    return auditData;
  }

  /**
   * Compare objects and detect changes
   * @param {Object} original - Original object
   * @param {Object} updated - Updated object
   * @param {Array} fieldsToTrack - Specific fields to track (optional)
   * @returns {Object} Changes object with before and after values
   */
  static detectChanges(original, updated, fieldsToTrack = null) {
    const changes = {
      before: {},
      after: {}
    };

    if (!original || !updated) {
      return changes;
    }

    // Get fields to compare
    const fields = fieldsToTrack || [
      ...new Set([
        ...Object.keys(original),
        ...Object.keys(updated)
      ])
    ];

    // Compare each field
    fields.forEach(field => {
      const originalValue = original[field];
      const updatedValue = updated[field];

      // Skip if values are the same
      if (this.areEqual(originalValue, updatedValue)) {
        return;
      }

      // Record the change
      changes.before[field] = originalValue;
      changes.after[field] = updatedValue;
    });

    // Return null if no changes detected
    return Object.keys(changes.before).length > 0 ? changes : null;
  }

  /**
   * Check if two values are equal
   * @param {*} value1 - First value
   * @param {*} value2 - Second value
   * @returns {boolean} True if values are equal
   */
  static areEqual(value1, value2) {
    // Handle null/undefined
    if (value1 === value2) return true;
    if (value1 == null || value2 == null) return false;

    // Handle dates
    if (value1 instanceof Date && value2 instanceof Date) {
      return value1.getTime() === value2.getTime();
    }

    // Handle arrays
    if (Array.isArray(value1) && Array.isArray(value2)) {
      if (value1.length !== value2.length) return false;
      return value1.every((val, index) => this.areEqual(val, value2[index]));
    }

    // Handle objects
    if (typeof value1 === 'object' && typeof value2 === 'object') {
      const keys1 = Object.keys(value1);
      const keys2 = Object.keys(value2);
      
      if (keys1.length !== keys2.length) return false;
      
      return keys1.every(key => this.areEqual(value1[key], value2[key]));
    }

    // Handle primitives
    return value1 === value2;
  }

  /**
   * Get client IP address from request
   * @param {Object} req - Express request object
   * @returns {string} Client IP address
   */
  static getClientIp(req) {
    // Check for various headers that might contain the real IP
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip;
  }

  /**
   * Mask sensitive data in audit logs
   * @param {Object} data - Data to mask
   * @param {Array} sensitiveFields - Fields to mask
   * @returns {Object} Masked data
   */
  static maskSensitiveData(data, sensitiveFields = ['password', 'token', 'secret', 'credit_card']) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const masked = Array.isArray(data) ? [...data] : { ...data };

    const maskValue = (obj, fields) => {
      fields.forEach(field => {
        if (field in obj) {
          obj[field] = '***MASKED***';
        }
      });

      // Recursively mask nested objects
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          obj[key] = maskValue(obj[key], fields);
        }
      });

      return obj;
    };

    return maskValue(masked, sensitiveFields);
  }

  /**
   * Get audit summary for a user
   * @param {string} userId - User ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} Audit summary
   */
  static async getUserAuditSummary(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await AuditLog.findAll({
      where: {
        user_id: userId,
        created_at: {
          [Op.gte]: startDate
        }
      }
    });

    const summary = {
      total_actions: logs.length,
      actions_by_type: {},
      actions_by_entity: {},
      failed_actions: 0,
      last_activity: null
    };

    logs.forEach(log => {
      // Count by action type
      summary.actions_by_type[log.action] = (summary.actions_by_type[log.action] || 0) + 1;
      
      // Count by entity
      summary.actions_by_entity[log.entity] = (summary.actions_by_entity[log.entity] || 0) + 1;
      
      // Count failures
      if (log.status === 'FAILED') {
        summary.failed_actions++;
      }
      
      // Track last activity
      if (!summary.last_activity || log.created_at > summary.last_activity) {
        summary.last_activity = log.created_at;
      }
    });

    return summary;
  }

  /**
   * Clean old audit logs
   * @param {number} retentionDays - Number of days to retain logs
   * @returns {Promise<number>} Number of deleted records
   */
  static async cleanOldLogs(retentionDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await AuditLog.destroy({
      where: {
        created_at: {
          [Op.lt]: cutoffDate
        }
      }
    });

    console.log(`Cleaned ${result} old audit logs older than ${retentionDays} days`);
    return result;
  }
}

module.exports = AuditService;