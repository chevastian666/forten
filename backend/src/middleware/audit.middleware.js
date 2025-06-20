/**
 * Audit Middleware
 * Captures and logs all critical actions in the system
 */

const AuditService = require('../services/audit.service');
const { v4: uuidv4 } = require('uuid');
const { audit: auditLogger } = require('../config/logger');

/**
 * Audit middleware factory
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 */
function auditMiddleware(options = {}) {
  const {
    excludePaths = ['/health', '/metrics', '/api/auth/refresh'],
    includeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'],
    captureChanges = true,
    maskSensitive = true,
    sensitiveFields = ['password', 'token', 'secret', 'pin', 'credit_card', 'cvv']
  } = options;

  return async (req, res, next) => {
    // Skip if path is excluded
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Skip if method is not included
    if (!includeMethods.includes(req.method)) {
      return next();
    }

    // Add request ID if not present
    req.id = req.id || req.headers['x-request-id'] || uuidv4();
    
    // Record start time
    req.startTime = Date.now();

    // Store original body for comparison
    if (captureChanges && (req.method === 'PUT' || req.method === 'PATCH')) {
      req.originalBody = { ...req.body };
    }

    // Store original send function
    const originalSend = res.send;
    const originalJson = res.json;

    // Override response methods to capture response
    res.send = function(data) {
      res.locals.responseBody = data;
      originalSend.call(this, data);
    };

    res.json = function(data) {
      res.locals.responseBody = data;
      originalJson.call(this, data);
    };

    // Continue to next middleware
    next();

    // After response is sent, log the audit
    res.on('finish', async () => {
      try {
        await logAudit(req, res, {
          maskSensitive,
          sensitiveFields,
          captureChanges
        });
      } catch (error) {
        auditLogger.error('Audit middleware error:', {
          error: error.message,
          requestId: req.id,
          path: req.path
        });
      }
    });
  };
}

/**
 * Log audit entry based on request and response
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Object} options - Logging options
 */
async function logAudit(req, res, options) {
  const { maskSensitive, sensitiveFields, captureChanges } = options;

  // Determine action based on method and path
  const action = determineAction(req);
  const entity = determineEntity(req);
  const entityId = determineEntityId(req);

  // Prepare audit data
  const auditData = {
    userId: req.user?.id || null,
    action,
    entity,
    entityId,
    request: req,
    metadata: {
      headers: sanitizeHeaders(req.headers),
      body_size: JSON.stringify(req.body || {}).length,
      response_status: res.statusCode,
      response_size: res.get('content-length') || 0
    }
  };

  // Handle success or failure based on status code
  if (res.statusCode >= 200 && res.statusCode < 400) {
    // Success case
    let changes = null;

    // Detect changes for PUT/PATCH requests
    if (captureChanges && req.originalBody && res.locals.responseBody) {
      const original = maskSensitive ? 
        AuditService.maskSensitiveData(req.originalBody, sensitiveFields) : 
        req.originalBody;
        
      const updated = maskSensitive ? 
        AuditService.maskSensitiveData(res.locals.responseBody, sensitiveFields) : 
        res.locals.responseBody;

      changes = AuditService.detectChanges(original, updated);
    }

    // Add request body for POST requests
    if (req.method === 'POST' && req.body) {
      changes = {
        before: {},
        after: maskSensitive ? 
          AuditService.maskSensitiveData(req.body, sensitiveFields) : 
          req.body
      };
    }

    await AuditService.logSuccess({
      ...auditData,
      changes
    });
  } else {
    // Failure case
    const errorMessage = res.locals.errorMessage || 
                        res.locals.responseBody?.message || 
                        `Request failed with status ${res.statusCode}`;

    await AuditService.logFailure({
      ...auditData,
      error: errorMessage
    });
  }
}

/**
 * Determine action from request
 * @param {Object} req - Express request
 * @returns {string} Action name
 */
function determineAction(req) {
  const { method, path } = req;

  // Custom action mappings
  const actionMappings = {
    'POST /api/auth/login': 'LOGIN',
    'POST /api/auth/logout': 'LOGOUT',
    'POST /api/auth/register': 'REGISTER',
    'POST /api/auth/forgot-password': 'PASSWORD_RESET_REQUEST',
    'POST /api/auth/reset-password': 'PASSWORD_RESET',
    'PUT /api/users/:id/role': 'ROLE_CHANGE',
    'PUT /api/users/:id/permissions': 'PERMISSION_CHANGE',
    'DELETE /api/users/:id': 'USER_DELETE',
    'POST /api/access/pin': 'PIN_GENERATE',
    'POST /api/access/authorize': 'ACCESS_AUTHORIZE',
    'POST /api/export': 'DATA_EXPORT'
  };

  // Check for exact match
  for (const [pattern, action] of Object.entries(actionMappings)) {
    const [patternMethod, patternPath] = pattern.split(' ');
    if (method === patternMethod && pathMatches(path, patternPath)) {
      return action;
    }
  }

  // Default action based on method
  const methodActions = {
    'GET': 'VIEW',
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };

  return methodActions[method] || method;
}

/**
 * Determine entity from request path
 * @param {Object} req - Express request
 * @returns {string} Entity name
 */
function determineEntity(req) {
  const { path } = req;
  
  // Extract entity from path (e.g., /api/users/123 -> users)
  const pathParts = path.split('/').filter(Boolean);
  
  // Skip 'api' prefix if present
  if (pathParts[0] === 'api') {
    pathParts.shift();
  }
  
  // Return the first path segment as entity
  return pathParts[0]?.toUpperCase() || 'UNKNOWN';
}

/**
 * Determine entity ID from request
 * @param {Object} req - Express request
 * @returns {string|null} Entity ID
 */
function determineEntityId(req) {
  // Try to get ID from params
  if (req.params.id) {
    return req.params.id;
  }

  // Try to get ID from response for POST requests
  if (req.method === 'POST' && req.res?.locals?.responseBody?.id) {
    return req.res.locals.responseBody.id;
  }

  // Try to extract ID from path
  const pathParts = req.path.split('/').filter(Boolean);
  
  // Look for UUID pattern in path
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuid = pathParts.find(part => uuidPattern.test(part));
  if (uuid) return uuid;

  // Look for numeric ID in path
  const numericId = pathParts.find(part => /^\d+$/.test(part));
  if (numericId) return numericId;

  return null;
}

/**
 * Check if path matches pattern
 * @param {string} path - Request path
 * @param {string} pattern - Path pattern
 * @returns {boolean} True if matches
 */
function pathMatches(path, pattern) {
  // Convert pattern to regex (e.g., /api/users/:id -> /api/users/.+)
  const regexPattern = pattern
    .replace(/:[^/]+/g, '[^/]+')
    .replace(/\*/g, '.*');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Sanitize headers for logging
 * @param {Object} headers - Request headers
 * @returns {Object} Sanitized headers
 */
function sanitizeHeaders(headers) {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token'
  ];

  const sanitized = { ...headers };
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '***REDACTED***';
    }
  });

  return sanitized;
}

/**
 * Audit specific action
 * @param {string} action - Action to audit
 * @param {string} entity - Entity type
 * @returns {Function} Express middleware
 */
function auditAction(action, entity) {
  return async (req, res, next) => {
    const startTime = Date.now();

    // Override response methods to capture result
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      
      // Log audit
      AuditService.logSuccess({
        userId: req.user?.id,
        action,
        entity,
        entityId: data?.id || req.params.id,
        changes: {
          before: req.originalData || {},
          after: data || {}
        },
        metadata: {
          duration_ms: duration,
          response_status: res.statusCode
        },
        request: req
      }).catch(err => auditLogger.error('Audit error:', {
        error: err.message,
        requestId: req.id,
        path: req.path
      }));

      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Audit critical action
 * @param {string} action - Critical action name
 * @returns {Function} Express middleware
 */
function auditCritical(action) {
  return async (req, res, next) => {
    // Log the attempt immediately
    await AuditService.log({
      user_id: req.user?.id,
      action: `${action}_ATTEMPT`,
      entity: determineEntity(req),
      entity_id: determineEntityId(req),
      status: 'PENDING',
      ip_address: AuditService.getClientIp(req),
      user_agent: req.get('user-agent'),
      method: req.method,
      path: req.path,
      metadata: {
        critical: true,
        body: AuditService.maskSensitiveData(req.body)
      }
    });

    next();
  };
}

module.exports = {
  auditMiddleware,
  auditAction,
  auditCritical
};