// Migration helper to gradually transition from old middleware to new middleware
const { authenticate, authorize } = require('../../middleware/auth');

/**
 * Creates a wrapper that allows using both old and new middleware
 * This enables gradual migration without breaking existing code
 */
class MiddlewareMigrationHelper {
  constructor(middlewareRegistry) {
    this.middlewareRegistry = middlewareRegistry;
    this.authMiddleware = middlewareRegistry.getAuthMiddleware();
  }

  /**
   * Returns middleware that can work with both old and new auth patterns
   * Prefers new container-based auth if available
   */
  authenticate() {
    return (req, res, next) => {
      // If container is available, use new middleware
      if (req.container) {
        return this.authMiddleware.authenticate(req, res, next);
      }
      // Otherwise fall back to old middleware
      return authenticate(req, res, next);
    };
  }

  /**
   * Returns authorization middleware that works with both patterns
   */
  authorize(...roles) {
    return (req, res, next) => {
      // If container is available, use new middleware
      if (req.container) {
        return this.authMiddleware.authorize(...roles)(req, res, next);
      }
      // Otherwise fall back to old middleware
      return authorize(...roles)(req, res, next);
    };
  }

  /**
   * Convenience method to get both authenticate and authorize
   */
  authenticateAndAuthorize(...roles) {
    return [
      this.authenticate(),
      this.authorize(...roles)
    ];
  }
}

// Export factory function
function createMigrationHelper(middlewareRegistry) {
  return new MiddlewareMigrationHelper(middlewareRegistry);
}

module.exports = {
  MiddlewareMigrationHelper,
  createMigrationHelper
};