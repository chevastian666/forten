const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('../../src/routes');
const errorHandler = require('../../src/middleware/errorHandler');
const { initializeContainer } = require('../../src/infrastructure/initialization');

// Create test app instance
const createTestApp = async () => {
  const app = express();
  
  // Security middleware
  app.use(helmet());
  app.use(cors());
  
  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Initialize container for dependency injection
  const container = await initializeContainer();
  
  // Make container available to routes
  app.use((req, res, next) => {
    req.container = container;
    next();
  });
  
  // API routes
  app.use('/api', routes);
  
  // Error handling
  app.use(errorHandler);
  
  return app;
};

module.exports = { createTestApp };