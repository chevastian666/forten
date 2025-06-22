/**
 * Bulk Operations Validator
 * Validation logic for bulk operations with security and performance checks
 */

const { body, query, validationResult } = require('express-validator');
const { logger } = require('../config/logger');

class BulkValidator {
  constructor() {
    this.maxBatchSize = 1000;
    this.supportedOperations = ['create', 'update', 'delete'];
    this.supportedResources = ['events', 'audit_logs', 'pins', 'users', 'notifications'];
    
    // Field validation rules for each resource
    this.resourceRules = {
      events: {
        required: ['title', 'event_type'],
        optional: ['description', 'location', 'metadata', 'priority'],
        immutable: ['id', 'created_at', 'updated_at']
      },
      audit_logs: {
        required: ['action', 'resource'],
        optional: ['user_id', 'ip_address', 'user_agent', 'changes'],
        immutable: ['id', 'created_at']
      },
      pins: {
        required: ['pin_code', 'user_id'],
        optional: ['expires_at', 'is_temporary', 'description'],
        immutable: ['id', 'created_at', 'updated_at']
      },
      users: {
        required: ['username', 'email'],
        optional: ['first_name', 'last_name', 'role', 'is_active'],
        immutable: ['id', 'created_at', 'updated_at']
      },
      notifications: {
        required: ['title', 'message', 'type'],
        optional: ['user_id', 'metadata', 'priority', 'scheduled_at'],
        immutable: ['id', 'created_at', 'sent_at']
      }
    };
  }

  /**
   * Validate bulk operation request
   */
  validateBulkRequest() {
    return [
      // Validate operation type
      body('operation')
        .isIn(this.supportedOperations)
        .withMessage(`Operation must be one of: ${this.supportedOperations.join(', ')}`),

      // Validate resource type
      body('resource')
        .isIn(this.supportedResources)
        .withMessage(`Resource must be one of: ${this.supportedResources.join(', ')}`),

      // Validate data array
      body('data')
        .isArray({ min: 1, max: this.maxBatchSize })
        .withMessage(`Data must be an array with 1-${this.maxBatchSize} items`),

      // Validate transaction options
      body('options.transaction')
        .optional()
        .isBoolean()
        .withMessage('Transaction option must be boolean'),

      // Validate dry run option
      body('options.dryRun')
        .optional()
        .isBoolean()
        .withMessage('Dry run option must be boolean'),

      // Validate continue on error option
      body('options.continueOnError')
        .optional()
        .isBoolean()
        .withMessage('Continue on error option must be boolean'),

      // Validate batch size
      body('options.batchSize')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Batch size must be between 1 and 100'),

      // Custom validation middleware
      this.validateRequestData.bind(this)
    ];
  }

  /**
   * Validate query parameters for bulk operations
   */
  validateBulkQuery() {
    return [
      query('operation')
        .optional()
        .isIn(this.supportedOperations),
      
      query('resource')
        .optional()
        .isIn(this.supportedResources),
      
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
        .isIn(['pending', 'processing', 'completed', 'failed'])
        .withMessage('Invalid status filter')
    ];
  }

  /**
   * Custom validation for request data
   */
  async validateRequestData(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors.array()
          }
        });
      }

      const { operation, resource, data, options = {} } = req.body;

      // Validate each data item
      const validationErrors = [];
      const resourceRules = this.resourceRules[resource];

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const itemErrors = [];

        // Validate required fields for create operations
        if (operation === 'create') {
          for (const field of resourceRules.required) {
            if (!item.hasOwnProperty(field) || item[field] === null || item[field] === undefined || item[field] === '') {
              itemErrors.push({
                field,
                message: `Required field '${field}' is missing or empty`,
                index: i
              });
            }
          }
        }

        // Validate ID field for update/delete operations
        if ((operation === 'update' || operation === 'delete') && !item.id) {
          itemErrors.push({
            field: 'id',
            message: 'ID is required for update/delete operations',
            index: i
          });
        }

        // Check for immutable fields in updates
        if (operation === 'update') {
          for (const field of resourceRules.immutable) {
            if (item.hasOwnProperty(field) && field !== 'id') {
              itemErrors.push({
                field,
                message: `Field '${field}' is immutable and cannot be updated`,
                index: i
              });
            }
          }
        }

        // Validate field types and formats
        const fieldValidationErrors = this.validateItemFields(item, resource, operation);
        itemErrors.push(...fieldValidationErrors.map(error => ({ ...error, index: i })));

        if (itemErrors.length > 0) {
          validationErrors.push(...itemErrors);
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DATA_VALIDATION_ERROR',
            message: 'Data validation failed',
            details: validationErrors
          }
        });
      }

      // Validate business rules
      const businessErrors = await this.validateBusinessRules(operation, resource, data, options);
      if (businessErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BUSINESS_RULE_ERROR',
            message: 'Business rule validation failed',
            details: businessErrors
          }
        });
      }

      // Add validated flag to request
      req.validated = true;
      next();

    } catch (error) {
      logger.error('Bulk validation error', {
        error: error.message,
        operation: req.body?.operation,
        resource: req.body?.resource
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_INTERNAL_ERROR',
          message: 'Internal validation error'
        }
      });
    }
  }

  /**
   * Validate individual item fields
   */
  validateItemFields(item, resource, operation) {
    const errors = [];

    switch (resource) {
      case 'events':
        errors.push(...this.validateEventFields(item, operation));
        break;
      case 'audit_logs':
        errors.push(...this.validateAuditLogFields(item, operation));
        break;
      case 'pins':
        errors.push(...this.validatePinFields(item, operation));
        break;
      case 'users':
        errors.push(...this.validateUserFields(item, operation));
        break;
      case 'notifications':
        errors.push(...this.validateNotificationFields(item, operation));
        break;
    }

    return errors;
  }

  /**
   * Validate event fields
   */
  validateEventFields(item, operation) {
    const errors = [];

    if (item.title && typeof item.title !== 'string') {
      errors.push({ field: 'title', message: 'Title must be a string' });
    }

    if (item.title && (item.title.length < 1 || item.title.length > 200)) {
      errors.push({ field: 'title', message: 'Title must be between 1 and 200 characters' });
    }

    if (item.event_type && !['access', 'security', 'system', 'maintenance', 'user'].includes(item.event_type)) {
      errors.push({ field: 'event_type', message: 'Invalid event type' });
    }

    if (item.priority && !['low', 'medium', 'high', 'critical'].includes(item.priority)) {
      errors.push({ field: 'priority', message: 'Invalid priority level' });
    }

    if (item.metadata && typeof item.metadata !== 'object') {
      errors.push({ field: 'metadata', message: 'Metadata must be an object' });
    }

    return errors;
  }

  /**
   * Validate audit log fields
   */
  validateAuditLogFields(item, operation) {
    const errors = [];

    if (item.action && !['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'].includes(item.action)) {
      errors.push({ field: 'action', message: 'Invalid action type' });
    }

    if (item.resource && typeof item.resource !== 'string') {
      errors.push({ field: 'resource', message: 'Resource must be a string' });
    }

    if (item.ip_address && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(item.ip_address)) {
      errors.push({ field: 'ip_address', message: 'Invalid IP address format' });
    }

    if (item.user_id && !Number.isInteger(item.user_id)) {
      errors.push({ field: 'user_id', message: 'User ID must be an integer' });
    }

    return errors;
  }

  /**
   * Validate PIN fields
   */
  validatePinFields(item, operation) {
    const errors = [];

    if (item.pin_code && !/^\d{4,8}$/.test(item.pin_code)) {
      errors.push({ field: 'pin_code', message: 'PIN code must be 4-8 digits' });
    }

    if (item.user_id && !Number.isInteger(item.user_id)) {
      errors.push({ field: 'user_id', message: 'User ID must be an integer' });
    }

    if (item.expires_at && !Date.parse(item.expires_at)) {
      errors.push({ field: 'expires_at', message: 'Invalid expiration date format' });
    }

    if (item.is_temporary && typeof item.is_temporary !== 'boolean') {
      errors.push({ field: 'is_temporary', message: 'is_temporary must be boolean' });
    }

    return errors;
  }

  /**
   * Validate user fields
   */
  validateUserFields(item, operation) {
    const errors = [];

    if (item.username && (typeof item.username !== 'string' || item.username.length < 3 || item.username.length > 50)) {
      errors.push({ field: 'username', message: 'Username must be 3-50 characters' });
    }

    if (item.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (item.role && !['admin', 'user', 'security', 'maintenance'].includes(item.role)) {
      errors.push({ field: 'role', message: 'Invalid role' });
    }

    if (item.is_active && typeof item.is_active !== 'boolean') {
      errors.push({ field: 'is_active', message: 'is_active must be boolean' });
    }

    return errors;
  }

  /**
   * Validate notification fields
   */
  validateNotificationFields(item, operation) {
    const errors = [];

    if (item.title && (typeof item.title !== 'string' || item.title.length < 1 || item.title.length > 200)) {
      errors.push({ field: 'title', message: 'Title must be 1-200 characters' });
    }

    if (item.message && (typeof item.message !== 'string' || item.message.length < 1 || item.message.length > 1000)) {
      errors.push({ field: 'message', message: 'Message must be 1-1000 characters' });
    }

    if (item.type && !['info', 'warning', 'error', 'success'].includes(item.type)) {
      errors.push({ field: 'type', message: 'Invalid notification type' });
    }

    if (item.priority && !['low', 'medium', 'high', 'urgent'].includes(item.priority)) {
      errors.push({ field: 'priority', message: 'Invalid priority level' });
    }

    if (item.scheduled_at && !Date.parse(item.scheduled_at)) {
      errors.push({ field: 'scheduled_at', message: 'Invalid scheduled date format' });
    }

    return errors;
  }

  /**
   * Validate business rules
   */
  async validateBusinessRules(operation, resource, data, options) {
    const errors = [];

    try {
      // Check for duplicate entries in the same batch
      if (operation === 'create') {
        const duplicates = this.findDuplicatesInBatch(data, resource);
        if (duplicates.length > 0) {
          errors.push({
            rule: 'NO_DUPLICATES_IN_BATCH',
            message: 'Duplicate entries found in batch',
            details: duplicates
          });
        }
      }

      // Validate batch size doesn't exceed resource limits
      if (data.length > this.getResourceMaxBatchSize(resource)) {
        errors.push({
          rule: 'BATCH_SIZE_EXCEEDED',
          message: `Batch size exceeds maximum allowed for ${resource}`,
          maxSize: this.getResourceMaxBatchSize(resource)
        });
      }

      // Check for rate limiting
      const rateLimitError = await this.checkRateLimit(operation, resource, data.length);
      if (rateLimitError) {
        errors.push(rateLimitError);
      }

    } catch (error) {
      logger.error('Business rule validation error', {
        error: error.message,
        operation,
        resource
      });
      
      errors.push({
        rule: 'VALIDATION_ERROR',
        message: 'Failed to validate business rules'
      });
    }

    return errors;
  }

  /**
   * Find duplicates in batch
   */
  findDuplicatesInBatch(data, resource) {
    const duplicates = [];
    const seen = new Set();

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      let key;

      // Define unique key based on resource type
      switch (resource) {
        case 'events':
          key = `${item.title}-${item.event_type}-${item.location}`;
          break;
        case 'users':
          key = item.username || item.email;
          break;
        case 'pins':
          key = `${item.pin_code}-${item.user_id}`;
          break;
        default:
          key = JSON.stringify(item);
      }

      if (seen.has(key)) {
        duplicates.push({ index: i, key });
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  }

  /**
   * Get resource-specific maximum batch size
   */
  getResourceMaxBatchSize(resource) {
    const limits = {
      events: 500,
      audit_logs: 1000,
      pins: 200,
      users: 100,
      notifications: 300
    };

    return limits[resource] || this.maxBatchSize;
  }

  /**
   * Check rate limiting
   */
  async checkRateLimit(operation, resource, batchSize) {
    try {
      // Implement rate limiting logic here
      // This is a placeholder for actual rate limiting implementation
      
      const rateLimit = {
        'create': { perMinute: 100, perHour: 1000 },
        'update': { perMinute: 200, perHour: 2000 },
        'delete': { perMinute: 50, perHour: 500 }
      };

      const limit = rateLimit[operation];
      if (!limit) return null;

      // For now, just check if batch size exceeds per-minute limit
      if (batchSize > limit.perMinute) {
        return {
          rule: 'RATE_LIMIT_EXCEEDED',
          message: `Operation rate limit exceeded`,
          limit: limit.perMinute,
          requested: batchSize
        };
      }

      return null;

    } catch (error) {
      logger.error('Rate limit check error', {
        error: error.message,
        operation,
        resource
      });
      return null;
    }
  }

  /**
   * Validation error handler
   */
  handleValidationError(req, res, next) {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors.array()
        }
      });
    }
    
    next();
  }
}

module.exports = new BulkValidator();