const express = require('express');
const { getContainer } = require('./infrastructure/initialization');
const { configService } = require('./infrastructure/config');
const routes = require('./routes');

const app = express();

// Initialize container
const container = getContainer();

// Get middleware registry from container
const middlewareRegistry = container.get('middlewareRegistry');

// Register pre-route middleware
middlewareRegistry.registerPreRouteMiddleware(app);

// Make container available to routes
app.use((req, res, next) => {
  req.container = container;
  next();
});

// API routes
app.use('/api', routes);

// Register post-route middleware (error handlers)
middlewareRegistry.registerPostRouteMiddleware(app);

module.exports = app;