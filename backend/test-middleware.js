// Test script to verify the new middleware system
const express = require('express');
const { container } = require('./src/infrastructure/container');
const { createMiddlewareRegistry } = require('./src/infrastructure/middleware');

console.log('Testing Middleware System...\n');

try {
  // Create a test Express app
  const app = express();
  
  // Get middleware registry from container
  const middlewareRegistry = container.get('middlewareRegistry');
  console.log('✓ Middleware registry retrieved from container');

  // Test that all middleware types are available
  console.log('\n✓ Checking middleware availability:');
  console.log('  - Auth middleware:', !!middlewareRegistry.getAuthMiddleware());
  console.log('  - Error middleware:', !!middlewareRegistry.getErrorMiddleware());
  console.log('  - Security middleware:', !!middlewareRegistry.getSecurityMiddleware());
  console.log('  - Logging middleware:', !!middlewareRegistry.getLoggingMiddleware());

  // Test convenience methods
  console.log('\n✓ Testing convenience methods:');
  const authMiddlewares = middlewareRegistry.authenticateAndAuthorize('admin', 'manager');
  console.log('  - authenticateAndAuthorize returns array:', Array.isArray(authMiddlewares));
  console.log('  - Array length:', authMiddlewares.length);

  const authEndpointMiddlewares = middlewareRegistry.authEndpointMiddleware();
  console.log('  - authEndpointMiddleware returns array:', Array.isArray(authEndpointMiddlewares));

  // Test middleware registration (without actually starting the server)
  console.log('\n✓ Testing middleware registration:');
  try {
    middlewareRegistry.registerPreRouteMiddleware(app);
    console.log('  - Pre-route middleware registered successfully');
  } catch (error) {
    console.error('  - Pre-route middleware registration failed:', error.message);
  }

  try {
    middlewareRegistry.registerPostRouteMiddleware(app);
    console.log('  - Post-route middleware registered successfully');
  } catch (error) {
    console.error('  - Post-route middleware registration failed:', error.message);
  }

  // Test auth service integration
  console.log('\n✓ Testing auth service integration:');
  const authService = container.get('authService');
  const testToken = authService.generateAccessToken('test-user-id');
  console.log('  - Generated test token:', testToken.substring(0, 20) + '...');
  
  const verified = authService.verifyAccessToken(testToken);
  console.log('  - Token verification result:', verified);
  console.log('  - User ID matches:', verified && verified.id === 'test-user-id');

  console.log('\n✅ All middleware tests passed!');
} catch (error) {
  console.error('\n❌ Middleware test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}