// JavaScript wrapper for MiddlewareRegistry
const { createAuthenticationMiddleware } = require('./AuthenticationMiddleware');
const { createErrorHandlingMiddleware } = require('./ErrorHandlingMiddleware');
const { createSecurityMiddleware } = require('./SecurityMiddleware');
const { createLoggingMiddleware } = require('./LoggingMiddleware');
const express = require('express');

class MiddlewareRegistry {
  constructor(container) {
    this.authMiddleware = createAuthenticationMiddleware(container);
    this.errorMiddleware = createErrorHandlingMiddleware();
    this.securityMiddleware = createSecurityMiddleware();
    this.loggingMiddleware = createLoggingMiddleware();
  }

  // Register all pre-route middleware
  registerPreRouteMiddleware(app) {
    // Security middleware
    app.use(this.securityMiddleware.helmet());
    app.use(this.securityMiddleware.cors());
    
    // Logging middleware
    app.use(this.loggingMiddleware.responseTime());
    app.use(this.loggingMiddleware.morgan());
    app.use(this.loggingMiddleware.requestLogger());
    
    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // General rate limiting for API routes
    app.use('/api/', this.securityMiddleware.rateLimit());
  }

  // Register all post-route middleware
  registerPostRouteMiddleware(app) {
    // 404 handler
    app.use(this.errorMiddleware.notFound);
    
    // Error handling (must be last)
    app.use(this.errorMiddleware.handle);
  }

  // Get authentication middleware
  getAuthMiddleware() {
    return this.authMiddleware;
  }

  // Get error handling middleware
  getErrorMiddleware() {
    return this.errorMiddleware;
  }

  // Get security middleware
  getSecurityMiddleware() {
    return this.securityMiddleware;
  }

  // Get logging middleware
  getLoggingMiddleware() {
    return this.loggingMiddleware;
  }

  // Convenience methods for common middleware combinations
  authenticateAndAuthorize(...roles) {
    return [
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize(...roles)
    ];
  }

  // Auth endpoints specific middleware
  authEndpointMiddleware() {
    return [
      this.securityMiddleware.authRateLimit()
    ];
  }

  // API endpoint middleware
  apiEndpointMiddleware() {
    return [
      this.securityMiddleware.apiRateLimit()
    ];
  }
}

// Factory function
function createMiddlewareRegistry(container) {
  return new MiddlewareRegistry(container);
}

module.exports = {
  MiddlewareRegistry,
  createMiddlewareRegistry
};