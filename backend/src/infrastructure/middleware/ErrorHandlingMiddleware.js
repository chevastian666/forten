// JavaScript wrapper for ErrorHandlingMiddleware
const { ConfigService } = require('../config/ConfigService');

class ErrorHandlingMiddleware {
  constructor() {
    this.configService = ConfigService.getInstance();
  }

  handle = (err, req, res, next) => {
    // Log the error
    console.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      status: err.status,
      details: err.details,
      path: req.path,
      method: req.method
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: err.details || err.message
      });
    }

    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: err.errors?.map(e => ({ 
          field: e.path, 
          message: e.message 
        })) || err.message
      });
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Duplicate Entry',
        details: err.errors?.map(e => ({ 
          field: e.path, 
          message: e.message 
        })) || err.message
      });
    }

    if (err.name === 'UnauthorizedError' || err.status === 401) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: err.message || 'Authentication required'
      });
    }

    if (err.name === 'ForbiddenError' || err.status === 403) {
      return res.status(403).json({
        error: 'Forbidden',
        message: err.message || 'Access denied'
      });
    }

    if (err.name === 'NotFoundError' || err.status === 404) {
      return res.status(404).json({
        error: 'Not Found',
        message: err.message || 'Resource not found'
      });
    }

    // Default error response
    const status = err.status || 500;
    const response = {
      error: status === 500 ? 'Internal Server Error' : err.name || 'Error',
      message: err.message || 'An unexpected error occurred'
    };

    // Include stack trace in development
    if (this.configService.isDevelopment()) {
      response.stack = err.stack;
      response.details = err.details;
    }

    res.status(status).json(response);
  };

  // Wrapper for async route handlers
  asyncHandler = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  // Not found handler
  notFound = (req, res, next) => {
    const error = new Error(`Not found - ${req.originalUrl}`);
    error.status = 404;
    error.name = 'NotFoundError';
    next(error);
  };
}

// Factory function
function createErrorHandlingMiddleware() {
  return new ErrorHandlingMiddleware();
}

module.exports = {
  ErrorHandlingMiddleware,
  createErrorHandlingMiddleware
};