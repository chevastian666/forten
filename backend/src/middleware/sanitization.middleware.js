/**
 * Sanitization Middleware
 * Automatically cleans dangerous inputs using DOMPurify and validator.js
 * Prevents SQL injection, XSS, and other input-based attacks
 */

const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');
const { logger } = require('../config/logger');

class SanitizationService {
  constructor() {
    this.config = {
      // HTML sanitization options
      html: {
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'span'],
        ALLOWED_ATTR: ['href', 'title', 'target'],
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'textarea'],
        FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'],
        KEEP_CONTENT: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        RETURN_TRUSTED_TYPE: false
      },
      
      // Fields to sanitize by type
      fieldTypes: {
        email: ['email', 'user_email', 'contact_email', 'notification_email'],
        url: ['website', 'url', 'link', 'callback_url', 'webhook_url', 'redirect_url'],
        html: ['description', 'content', 'message', 'comment', 'notes', 'bio'],
        phone: ['phone', 'mobile', 'telephone', 'contact_phone'],
        name: ['name', 'first_name', 'last_name', 'full_name', 'username', 'title'],
        numeric: ['id', 'count', 'age', 'price', 'amount', 'quantity', 'weight', 'height'],
        alphanumeric: ['code', 'reference', 'token', 'key', 'identifier'],
        json: ['metadata', 'config', 'settings', 'data', 'payload', 'options']
      },
      
      // SQL injection patterns
      sqlPatterns: [
        /('|(\\')|(;)|(\/\*)|(\/\*!)|(\/\*\*)|(\*\/)|(\-\-)|(;)|(\|)|(\*)/gi,
        /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(;)|(\|))/gi,
        /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
        /(exec(\s|\+)+(s|x)p\w+)/gi,
        /union[\s\w\(\)]*select/gi,
        /select[\s\w\*\(\),]*from/gi,
        /insert[\s\w\(\)]*into/gi,
        /delete[\s\w\(\)]*from/gi,
        /update[\s\w\(\)]*set/gi,
        /drop[\s\w]*table/gi,
        /create[\s\w]*table/gi,
        /alter[\s\w]*table/gi,
        /truncate[\s\w]*table/gi
      ],
      
      // XSS patterns
      xssPatterns: [
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
        /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
        /<embed[\s\S]*?>/gi,
        /<link[\s\S]*?>/gi,
        /<meta[\s\S]*?>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /onload=/gi,
        /onerror=/gi,
        /onclick=/gi,
        /onmouseover=/gi,
        /onfocus=/gi,
        /onblur=/gi,
        /onkeydown=/gi,
        /onkeyup=/gi,
        /onkeypress=/gi
      ],
      
      // Skip sanitization for certain routes
      skipRoutes: [
        '/api/webhooks', // Webhook payloads need raw data
        '/api/export', // Export might need specific formatting
        '/health' // Health checks don't need sanitization
      ],
      
      // Skip certain content types
      skipContentTypes: [
        'application/octet-stream',
        'multipart/form-data',
        'image/',
        'video/',
        'audio/'
      ]
    };
  }

  /**
   * Main sanitization middleware
   */
  sanitizeMiddleware() {
    return (req, res, next) => {
      try {
        // Skip certain routes
        if (this.shouldSkipRoute(req.path)) {
          return next();
        }

        // Skip certain content types
        if (this.shouldSkipContentType(req.headers['content-type'])) {
          return next();
        }

        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body, 'body');
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = this.sanitizeObject(req.query, 'query');
        }

        // Sanitize route parameters
        if (req.params && typeof req.params === 'object') {
          req.params = this.sanitizeObject(req.params, 'params');
        }

        // Log sanitization if any occurred
        if (req.sanitizationLog && req.sanitizationLog.length > 0) {
          logger.warn('Input sanitization performed', {
            path: req.path,
            method: req.method,
            sanitized: req.sanitizationLog,
            userAgent: req.headers['user-agent'],
            ip: req.ip
          });
        }

        next();
      } catch (error) {
        logger.error('Sanitization middleware error', {
          error: error.message,
          path: req.path,
          method: req.method
        });
        
        // Continue even if sanitization fails, but log the error
        next();
      }
    };
  }

  /**
   * Check if route should be skipped
   */
  shouldSkipRoute(path) {
    return this.config.skipRoutes.some(route => path.startsWith(route));
  }

  /**
   * Check if content type should be skipped
   */
  shouldSkipContentType(contentType) {
    if (!contentType) return false;
    
    return this.config.skipContentTypes.some(type => 
      contentType.toLowerCase().startsWith(type.toLowerCase())
    );
  }

  /**
   * Sanitize an object recursively
   */
  sanitizeObject(obj, context = 'unknown', depth = 0) {
    // Prevent infinite recursion
    if (depth > 10) {
      return obj;
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      try {
        if (value === null || value === undefined) {
          sanitized[key] = value;
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map(item => 
            typeof item === 'object' 
              ? this.sanitizeObject(item, context, depth + 1)
              : this.sanitizeValue(item, key, context)
          );
        } else if (typeof value === 'object') {
          sanitized[key] = this.sanitizeObject(value, context, depth + 1);
        } else {
          sanitized[key] = this.sanitizeValue(value, key, context);
        }
      } catch (error) {
        logger.warn('Error sanitizing field', {
          key,
          error: error.message,
          context
        });
        sanitized[key] = value; // Keep original value if sanitization fails
      }
    }

    return sanitized;
  }

  /**
   * Sanitize a single value based on field name and type
   */
  sanitizeValue(value, fieldName, context) {
    if (typeof value !== 'string') {
      return value;
    }

    const originalValue = value;
    let sanitizedValue = value;
    const fieldLower = fieldName.toLowerCase();

    // Detect and sanitize based on field type
    if (this.isEmailField(fieldLower)) {
      sanitizedValue = this.sanitizeEmail(sanitizedValue);
    } else if (this.isUrlField(fieldLower)) {
      sanitizedValue = this.sanitizeUrl(sanitizedValue);
    } else if (this.isHtmlField(fieldLower)) {
      sanitizedValue = this.sanitizeHtml(sanitizedValue);
    } else if (this.isPhoneField(fieldLower)) {
      sanitizedValue = this.sanitizePhone(sanitizedValue);
    } else if (this.isNameField(fieldLower)) {
      sanitizedValue = this.sanitizeName(sanitizedValue);
    } else if (this.isNumericField(fieldLower)) {
      sanitizedValue = this.sanitizeNumeric(sanitizedValue);
    } else if (this.isAlphanumericField(fieldLower)) {
      sanitizedValue = this.sanitizeAlphanumeric(sanitizedValue);
    } else if (this.isJsonField(fieldLower)) {
      sanitizedValue = this.sanitizeJson(sanitizedValue);
    } else {
      // Default sanitization for unknown fields
      sanitizedValue = this.sanitizeDefault(sanitizedValue);
    }

    // Log if value was changed
    if (sanitizedValue !== originalValue) {
      this.logSanitization(fieldName, originalValue, sanitizedValue, context);
    }

    return sanitizedValue;
  }

  /**
   * Field type detection methods
   */
  isEmailField(fieldName) {
    return this.config.fieldTypes.email.some(type => fieldName.includes(type));
  }

  isUrlField(fieldName) {
    return this.config.fieldTypes.url.some(type => fieldName.includes(type));
  }

  isHtmlField(fieldName) {
    return this.config.fieldTypes.html.some(type => fieldName.includes(type));
  }

  isPhoneField(fieldName) {
    return this.config.fieldTypes.phone.some(type => fieldName.includes(type));
  }

  isNameField(fieldName) {
    return this.config.fieldTypes.name.some(type => fieldName.includes(type));
  }

  isNumericField(fieldName) {
    return this.config.fieldTypes.numeric.some(type => fieldName.includes(type));
  }

  isAlphanumericField(fieldName) {
    return this.config.fieldTypes.alphanumeric.some(type => fieldName.includes(type));
  }

  isJsonField(fieldName) {
    return this.config.fieldTypes.json.some(type => fieldName.includes(type));
  }

  /**
   * Sanitization methods by type
   */
  sanitizeEmail(value) {
    // Basic email sanitization
    return validator.normalizeEmail(value, {
      gmail_lowercase: true,
      gmail_remove_dots: false,
      outlookdotcom_lowercase: true,
      yahoo_lowercase: true,
      icloud_lowercase: true
    }) || value;
  }

  sanitizeUrl(value) {
    try {
      // Check if it's a valid URL
      if (validator.isURL(value, { require_protocol: false })) {
        // Add protocol if missing
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          value = 'https://' + value;
        }
        return validator.escape(value);
      }
    } catch (error) {
      // If URL validation fails, treat as regular string
    }
    
    return this.sanitizeDefault(value);
  }

  sanitizeHtml(value) {
    return DOMPurify.sanitize(value, this.config.html);
  }

  sanitizePhone(value) {
    // Remove non-numeric characters except + and spaces
    return value.replace(/[^\d\s\+\-\(\)]/g, '').trim();
  }

  sanitizeName(value) {
    // Allow letters, spaces, hyphens, apostrophes
    return validator.escape(value.replace(/[^a-zA-ZÀ-ÿ\s\-'\.]/g, '').trim());
  }

  sanitizeNumeric(value) {
    // Extract only numbers
    const numeric = value.replace(/[^\d\.\-]/g, '');
    return validator.isNumeric(numeric, { no_symbols: true }) ? numeric : '';
  }

  sanitizeAlphanumeric(value) {
    // Allow only letters, numbers, and common safe characters
    return value.replace(/[^a-zA-Z0-9\-_]/g, '').trim();
  }

  sanitizeJson(value) {
    try {
      // Try to parse and stringify to validate JSON
      const parsed = JSON.parse(value);
      return JSON.stringify(this.sanitizeObject(parsed, 'json'));
    } catch (error) {
      // If not valid JSON, treat as string
      return this.sanitizeDefault(value);
    }
  }

  sanitizeDefault(value) {
    let sanitized = value;
    
    // Check for SQL injection patterns
    for (const pattern of this.config.sqlPatterns) {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, '');
      }
    }
    
    // Check for XSS patterns
    for (const pattern of this.config.xssPatterns) {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, '');
      }
    }
    
    // HTML encode dangerous characters
    sanitized = validator.escape(sanitized);
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    return sanitized;
  }

  /**
   * Log sanitization events
   */
  logSanitization(fieldName, originalValue, sanitizedValue, context) {
    // Add to request sanitization log if available
    if (global.currentRequest) {
      if (!global.currentRequest.sanitizationLog) {
        global.currentRequest.sanitizationLog = [];
      }
      
      global.currentRequest.sanitizationLog.push({
        field: fieldName,
        context,
        originalLength: originalValue.length,
        sanitizedLength: sanitizedValue.length,
        changed: originalValue !== sanitizedValue
      });
    }
  }

  /**
   * Get sanitization statistics
   */
  getStats() {
    return {
      config: {
        allowedHtmlTags: this.config.html.ALLOWED_TAGS,
        fieldTypes: Object.keys(this.config.fieldTypes),
        sqlPatternsCount: this.config.sqlPatterns.length,
        xssPatternsCount: this.config.xssPatterns.length,
        skipRoutes: this.config.skipRoutes
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Sanitization configuration updated', {
      changes: Object.keys(newConfig)
    });
  }

  /**
   * Manual sanitization method for use outside middleware
   */
  sanitize(data, options = {}) {
    const { type = 'default', fieldName = 'unknown' } = options;
    
    if (typeof data === 'object') {
      return this.sanitizeObject(data, type);
    } else if (typeof data === 'string') {
      return this.sanitizeValue(data, fieldName, type);
    }
    
    return data;
  }
}

// Export singleton
const sanitizationService = new SanitizationService();

// Middleware function
const sanitizationMiddleware = sanitizationService.sanitizeMiddleware();

// Add service reference to middleware for external access
sanitizationMiddleware.service = sanitizationService;

module.exports = {
  sanitizationMiddleware,
  sanitizationService
};