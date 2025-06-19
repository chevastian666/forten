# Middleware and Configuration Migration Guide

## Overview
This guide explains how to migrate from the current middleware and configuration setup to the new Clean Architecture-based system.

## New Structure

### 1. Configuration Service
Located at: `/src/infrastructure/config/`

- **ConfigService**: Centralized configuration management with validation
- **Type-safe**: Provides typed configuration objects
- **Environment validation**: Validates required environment variables at startup

### 2. Middleware Infrastructure
Located at: `/src/infrastructure/middleware/`

#### Core Middleware Classes:
- **AuthenticationMiddleware**: Container-aware authentication using JwtAuthService
- **ErrorHandlingMiddleware**: Enhanced error handling with environment-specific responses
- **SecurityMiddleware**: Wraps helmet, CORS, and rate limiting with clean interfaces
- **LoggingMiddleware**: Environment-specific logging with performance tracking
- **MiddlewareRegistry**: Centralized middleware management

## Migration Steps

### Step 1: Using the New Configuration
```javascript
// Old way
const config = require('./config/config');
const jwtSecret = config.jwt.secret;

// New way
const { configService } = require('./infrastructure/config');
const jwtConfig = configService.getJwtConfig();
const jwtSecret = jwtConfig.secret;
```

### Step 2: Using the Config Adapter (Temporary)
To maintain backward compatibility during migration:
```javascript
// Use the adapter for gradual migration
const config = require('./config/config-adapter');
// Works exactly like the old config
```

### Step 3: Updating Middleware in Routes

#### Authentication Middleware
```javascript
// Old way
const { authenticate, authorize } = require('../middleware/auth');
router.get('/protected', authenticate, handler);

// New way (when container is available)
router.get('/protected', 
  (req, res, next) => {
    const authMiddleware = req.container.get('middlewareRegistry').getAuthMiddleware();
    return authMiddleware.authenticate(req, res, next);
  },
  handler
);
```

#### Using the Migration Helper
For easier migration:
```javascript
const migrationHelper = createMigrationHelper(middlewareRegistry);

// Works with both old and new patterns
router.get('/protected', 
  migrationHelper.authenticate(),
  handler
);

router.get('/admin', 
  migrationHelper.authenticateAndAuthorize('admin'),
  handler
);
```

### Step 4: Updating app.js

Replace the current app.js with the new structure:
```javascript
// Old app.js uses individual middleware imports
// New app.js uses the middleware registry

const middlewareRegistry = container.get('middlewareRegistry');

// Register all pre-route middleware
middlewareRegistry.registerPreRouteMiddleware(app);

// Routes go here

// Register all post-route middleware (error handlers)
middlewareRegistry.registerPostRouteMiddleware(app);
```

## Benefits of the New System

1. **Dependency Injection**: Middleware can access services through the container
2. **Testability**: Easy to mock middleware for testing
3. **Configuration Validation**: Catches configuration errors at startup
4. **Type Safety**: TypeScript interfaces ensure correct usage
5. **Centralized Management**: All middleware configured in one place
6. **Environment-Specific Behavior**: Different behavior for dev/test/prod

## Example: Complete Route Migration

### Before:
```javascript
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.get('/users', authenticate, authorize('admin'), handler);
```

### After:
```javascript
const router = require('express').Router();

router.get('/users', (req, res, next) => {
  const registry = req.container.get('middlewareRegistry');
  const middlewares = registry.authenticateAndAuthorize('admin');
  
  // Execute middleware chain
  const runMiddlewares = (index) => {
    if (index >= middlewares.length) return next();
    middlewares[index](req, res, () => runMiddlewares(index + 1));
  };
  
  runMiddlewares(0);
}, handler);
```

## Testing the Migration

1. **Start with app.new.js**: Test the new app structure alongside the old one
2. **Migrate one route at a time**: Use the migration helper for gradual updates
3. **Verify configuration**: Check that all environment variables are properly loaded
4. **Test error handling**: Ensure errors are handled correctly in all environments
5. **Monitor performance**: Use the new logging middleware to track response times

## Rollback Plan

If issues arise:
1. The old configuration and middleware files remain unchanged
2. Simply revert to using the original app.js
3. Remove references to the new middleware registry from routes
4. The system is designed for gradual migration, allowing partial rollback

## Next Steps

1. Test the new configuration service with your environment variables
2. Try the new app.js with a subset of routes
3. Gradually migrate routes using the migration helper
4. Once stable, remove the old middleware files and config adapter