// Export all middleware classes and factories
const { AuthenticationMiddleware, createAuthenticationMiddleware } = require('./AuthenticationMiddleware');
const { ErrorHandlingMiddleware, createErrorHandlingMiddleware } = require('./ErrorHandlingMiddleware');
const { SecurityMiddleware, createSecurityMiddleware } = require('./SecurityMiddleware');
const { LoggingMiddleware, createLoggingMiddleware } = require('./LoggingMiddleware');
const { MiddlewareRegistry, createMiddlewareRegistry } = require('./MiddlewareRegistry');

module.exports = {
  // Classes
  AuthenticationMiddleware,
  ErrorHandlingMiddleware,
  SecurityMiddleware,
  LoggingMiddleware,
  MiddlewareRegistry,
  
  // Factory functions
  createAuthenticationMiddleware,
  createErrorHandlingMiddleware,
  createSecurityMiddleware,
  createLoggingMiddleware,
  createMiddlewareRegistry
};