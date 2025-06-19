const router = require('express').Router();
const { body } = require('express-validator');
const { authController } = require('../presentation/controllers/auth.controller');
const validate = require('../middleware/validate');

// This demonstrates how routes can be updated to use the new middleware system
// The middleware registry is accessed through the container in req.container

// Helper function to get middleware from registry
const getMiddleware = (req) => {
  if (req.container) {
    return req.container.get('middlewareRegistry');
  }
  // Fallback to old middleware if container not available
  const { authenticate } = require('../middleware/auth');
  return {
    getAuthMiddleware: () => ({ authenticate }),
    getSecurityMiddleware: () => ({ authRateLimit: () => (req, res, next) => next() })
  };
};

// Login route with auth rate limiting
router.post('/login', [
  (req, res, next) => {
    const middlewareRegistry = getMiddleware(req);
    const securityMiddleware = middlewareRegistry.getSecurityMiddleware();
    return securityMiddleware.authRateLimit()(req, res, next);
  },
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate
], authController.login);

// Refresh token route
router.post('/refresh', [
  (req, res, next) => {
    const middlewareRegistry = getMiddleware(req);
    const securityMiddleware = middlewareRegistry.getSecurityMiddleware();
    return securityMiddleware.authRateLimit()(req, res, next);
  },
  body('refreshToken').notEmpty(),
  validate
], authController.refreshToken);

// Logout route - requires authentication
router.post('/logout', 
  (req, res, next) => {
    const middlewareRegistry = getMiddleware(req);
    const authMiddleware = middlewareRegistry.getAuthMiddleware();
    return authMiddleware.authenticate(req, res, next);
  },
  authController.logout
);

// Profile route - requires authentication
router.get('/profile',
  (req, res, next) => {
    const middlewareRegistry = getMiddleware(req);
    const authMiddleware = middlewareRegistry.getAuthMiddleware();
    return authMiddleware.authenticate(req, res, next);
  },
  authController.profile
);

module.exports = router;