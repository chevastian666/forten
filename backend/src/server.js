/**
 * FORTEN Backend Server
 * Express.js server with audit middleware and clean architecture
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { WebSocketManager } = require('./websocket');
const { logger, api: apiLogger } = require('./config/logger');

// Import Redis configuration
const { initializeRedis } = require('./config/redis');

// Import middleware
const { auditMiddleware } = require('./middleware/audit.middleware');
const { cacheInvalidationMiddleware } = require('./middleware/cache.middleware');
const { adaptiveRateLimit, globalRateLimit, authRateLimit, apiRateLimit, addRateLimitHeaders } = require('./middleware/rateLimiter.middleware');

// Import routes
const auditRoutes = require('./routes/audit.routes');
const cacheRoutes = require('./routes/cache.routes');
const metricsRoutes = require('./routes/metrics.routes');
const rateLimitRoutes = require('./routes/rateLimit.routes');
const notificationRoutes = require('./routes/notification.routes');
const websocketRoutes = require('./routes/websocket.routes');
const exportRoutes = require('./routes/export.routes');
const pinRoutes = require('./routes/pin.routes');
const eventRoutes = require('./routes/event.routes');
const accessRoutes = require('./routes/access.routes');
const webhookRoutes = require('./routes/webhook.routes');
const statisticsRoutes = require('./routes/statistics.routes');
const softDeleteRoutes = require('./routes/softDelete.routes');
const adminConfigRoutes = require('./routes/admin/config.routes');

// Import models to initialize database
const models = require('./models');

// Create Express app
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket Manager
let webSocketManager = null;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Request logging with Winston
app.use(morgan('combined', { stream: logger.stream }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || require('uuid').v4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Global rate limiting (very permissive)
app.use(globalRateLimit);

// Add rate limit headers
app.use(addRateLimitHeaders);

// Cache invalidation middleware - automatically invalidates cache on data changes
app.use(cacheInvalidationMiddleware());

// Audit middleware - logs all critical actions
app.use(auditMiddleware({
  excludePaths: ['/health', '/metrics', '/api/auth/refresh'],
  includeMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  captureChanges: true,
  maskSensitive: true,
  sensitiveFields: ['password', 'token', 'secret', 'pin', 'credit_card', 'cvv']
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    audit: 'enabled'
  });
});

// API Routes with rate limiting
app.use('/api/auth', authRateLimit); // Strict rate limiting for auth endpoints
app.use('/api', apiRateLimit); // General API rate limiting
app.use('/api', adaptiveRateLimit); // Adaptive rate limiting based on endpoint

app.use('/api', auditRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/rate-limit', rateLimitRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/websocket', websocketRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/pins', pinRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/soft-deletes', softDeleteRoutes);
app.use('/api/admin/config', adminConfigRoutes);

// Example protected routes to demonstrate audit functionality
app.use('/api/demo', (req, res, next) => {
  // Mock authentication - in real app, use proper auth middleware
  req.user = { 
    id: 'demo-user-123', 
    email: 'demo@forten.com',
    role: 'admin',
    first_name: 'Demo',
    last_name: 'User'
  };
  next();
});

// Demo routes for testing audit
app.post('/api/demo/users', (req, res) => {
  const { email, firstName, lastName } = req.body;
  
  // Simulate user creation
  const newUser = {
    id: require('uuid').v4(),
    email,
    firstName,
    lastName,
    role: 'viewer',
    createdAt: new Date()
  };
  
  res.status(201).json({
    success: true,
    data: newUser,
    message: 'User created successfully'
  });
});

app.put('/api/demo/users/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Store original data for audit comparison
  req.originalData = {
    id,
    email: 'old@example.com',
    firstName: 'Old',
    lastName: 'Name',
    role: 'viewer'
  };
  
  // Simulate user update
  const updatedUser = {
    ...req.originalData,
    ...updates,
    updatedAt: new Date()
  };
  
  res.json({
    success: true,
    data: updatedUser,
    message: 'User updated successfully'
  });
});

app.delete('/api/demo/users/:id', (req, res) => {
  const { id } = req.params;
  
  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  apiLogger.error('Server error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // Store error message for audit logging
  res.locals.errorMessage = error.message;
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Database and server initialization
const startServer = async () => {
  try {
    // Initialize Redis connection
    await initializeRedis();
    
    // Test database connection
    try {
      await models.sequelize.authenticate();
      logger.info('Database connection established successfully.');
      
      // Sync database models (in development)
      if (process.env.NODE_ENV === 'development') {
        await models.sequelize.sync({ alter: true });
        logger.info('Database models synchronized successfully.');
      }
    } catch (error) {
      logger.warn('Database not available, continuing without database...', {
        error: error.message
      });
    }
    
    // Initialize existing infrastructure if available
    try {
      const { initializeInfrastructure } = require('./infrastructure/initialization');
      await initializeInfrastructure(io);
      logger.info('Clean architecture infrastructure initialized.');
    } catch (error) {
      logger.debug('Clean architecture infrastructure not found, skipping...');
    }
    
    // Start metrics service
    try {
      const metricsService = require('./services/metrics.service');
      metricsService.startAutoUpdate();
      logger.info('Metrics service started');
    } catch (error) {
      logger.error('Failed to start metrics service:', {
        error: error.message
      });
    }
    
    // Initialize WebSocket Manager
    try {
      webSocketManager = new WebSocketManager(server);
      logger.info('WebSocket manager initialized with building rooms');
      
      // Make io accessible to routes
      app.set('io', webSocketManager.getIO());
      app.set('buildingRoomsManager', webSocketManager.getBuildingRoomsManager());
      
      // Generate test tokens in development
      if (process.env.NODE_ENV === 'development') {
        const testTokens = webSocketManager.generateTestTokens();
        if (testTokens) {
          app.set('testTokens', testTokens);
        }
      }
      
    } catch (error) {
      logger.error('Failed to initialize WebSocket manager:', {
        error: error.message
      });
    }
    
    // Initialize notification service
    try {
      const { notificationService } = require('./services/notification.service');
      const io = webSocketManager ? webSocketManager.getIO() : null;
      await notificationService.initialize(io);
      logger.info('Notification service initialized');
    } catch (error) {
      logger.error('Failed to initialize notification service:', {
        error: error.message
      });
    }
    
    // Initialize webhook service with Redis
    try {
      const webhookService = require('./services/webhook.service');
      const redis = require('./config/redis');
      const redisClient = redis.getClient();
      
      // Get models from the already initialized models
      const { Webhook, WebhookDelivery } = models;
      
      if (Webhook && WebhookDelivery && redisClient) {
        await webhookService.initialize(Webhook, WebhookDelivery, redisClient);
        logger.info('Webhook service initialized with Redis queue');
      } else {
        // Initialize without Redis if not available
        await webhookService.initialize(Webhook, WebhookDelivery);
        logger.info('Webhook service initialized (without Redis queue)');
      }
    } catch (error) {
      logger.error('Failed to initialize webhook service:', {
        error: error.message
      });
    }
    
    // Initialize aggregation service and start jobs
    try {
      const AggregationService = require('./services/aggregation.service');
      const AggregationJobs = require('./jobs/aggregation.jobs');
      
      // Initialize service with models
      AggregationService.initialize(models);
      
      // Start aggregation jobs
      AggregationJobs.start(models);
      logger.info('Aggregation service initialized and jobs scheduled');
    } catch (error) {
      logger.error('Failed to initialize aggregation service:', {
        error: error.message
      });
    }
    
    // Initialize soft delete service
    try {
      const SoftDeleteService = require('./services/softDelete.service');
      SoftDeleteService.initialize(models);
      logger.info('Soft delete service initialized');
    } catch (error) {
      logger.error('Failed to initialize soft delete service:', {
        error: error.message
      });
    }
    
    // Initialize dynamic configuration service
    try {
      const ConfigService = require('./services/config.service');
      const redis = require('./config/redis');
      const redisClient = redis.getClient();
      
      if (redisClient) {
        await ConfigService.initialize(redisClient);
        logger.info('Dynamic configuration service initialized');
        
        // Listen for configuration changes
        ConfigService.on('configChanged', (change) => {
          logger.info('Configuration changed', {
            key: change.key,
            oldValue: change.oldValue,
            newValue: change.newValue,
            requiresRestart: change.requiresRestart,
            timestamp: change.timestamp
          });
          
          // Emit WebSocket notification if available
          if (webSocketManager) {
            const io = webSocketManager.getIO();
            io.to('administrators').emit('configChanged', change);
          }
        });
      } else {
        logger.warn('Redis not available, configuration service will use defaults');
        await ConfigService.initialize();
      }
    } catch (error) {
      logger.error('Failed to initialize configuration service:', {
        error: error.message
      });
    }
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`FORTEN Backend Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        features: {
          audit: 'ENABLED',
          database: 'PostgreSQL',
          metrics: 'ENABLED',
          cache: 'Redis ENABLED',
          rateLimiting: 'ENABLED',
          websocket: 'ENABLED (with building rooms & auth)',
          notifications: 'ENABLED',
          logging: 'Winston ENABLED',
          webhooks: 'ENABLED (with HMAC-SHA256 signatures)',
          aggregation: 'ENABLED (with cron jobs)',
          softDeletes: 'ENABLED (paranoid mode)',
          dynamicConfig: 'ENABLED (Redis storage)'
        }
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('\n📋 Demo endpoints available:');
        console.log('  POST   /api/demo/users       - Create user (audited)');
        console.log('  PUT    /api/demo/users/:id   - Update user (audited)');
        console.log('  DELETE /api/demo/users/:id   - Delete user (audited)');
        console.log('\n🔍 Audit endpoints:');
        console.log('  GET    /api/audit-logs       - Get audit logs');
        console.log('  GET    /api/audit-logs/stats - Get audit statistics');
        console.log('  POST   /api/audit-logs/export - Export audit logs');
        console.log('\n📊 Metrics endpoints:');
        console.log('  GET    /api/metrics/dashboard - Dashboard metrics');
        console.log('  GET    /api/metrics/realtime  - Real-time metrics');
        console.log('  POST   /api/metrics/update    - Force metrics update');
        console.log('\n💾 Cache endpoints:');
        console.log('  GET    /api/cache/stats       - Cache statistics');
        console.log('  GET    /api/cache/health      - Cache health check');
        console.log('  DELETE /api/cache/all         - Clear all cache');
        console.log('\n🛡️  Rate limit endpoints:');
        console.log('  GET    /api/rate-limit/status - Rate limit status');
        console.log('  GET    /api/rate-limit/usage  - Current usage');
        console.log('  GET    /api/rate-limit/config - Configuration');
        console.log('  GET    /api/rate-limit/health - Health check');
        console.log('\n📢 Notification endpoints:');
        console.log('  GET    /api/notifications/health     - Health check');
        console.log('  GET    /api/notifications/stats      - Queue statistics');
        console.log('  GET    /api/notifications/dashboard  - Dashboard data');
        console.log('  POST   /api/notifications/send       - Send custom notification');
        console.log('  POST   /api/notifications/security-alert - Send security alert');
        console.log('  POST   /api/notifications/test       - Test notification system');
        console.log('\n🌐 WebSocket endpoints:');
        console.log('  Connect with JWT token in auth header or query parameter');
        console.log('  Building rooms: building_<buildingId>');
        console.log('  Role rooms: role_<role>, administrators, operators, security_team');
        console.log('  Heartbeat: Every 30 seconds');
        console.log('\n🌐 WebSocket testing endpoints:');
        console.log('  GET    /api/websocket/test-tokens   - Get JWT test tokens');
        console.log('  GET    /api/websocket/stats         - Connection statistics');
        console.log('  GET    /api/websocket/health        - System health check');
        console.log('  GET    /api/websocket/client-example - Connection examples');
        console.log('  POST   /api/websocket/test-notification - Send test notification');
        console.log('\n📊 Export endpoints:');
        console.log('  GET    /api/export/options          - Get export options');
        console.log('  GET    /api/export/:dataType/:format - Export data');
        console.log('  POST   /api/export/preview          - Preview export data');
        console.log('  GET    /api/export/history          - Export history');
        console.log('\n🔐 PIN endpoints:');
        console.log('  POST   /api/pins/generate           - Generate secure PIN');
        console.log('  POST   /api/pins/validate           - Validate PIN');
        console.log('  POST   /api/pins/bulk-generate      - Generate multiple PINs');
        console.log('  POST   /api/pins/:pinId/revoke      - Revoke a PIN');
        console.log('  GET    /api/pins/stats/:buildingId  - Get PIN statistics');
        console.log('  POST   /api/pins/temporary-access   - Generate visitor PIN');
        console.log('  POST   /api/pins/delivery           - Generate delivery PIN');
        console.log('  POST   /api/pins/emergency          - Generate emergency PIN');
        console.log('  DELETE /api/pins/cleanup            - Clean expired PINs');
        console.log('\n📊 Events endpoints (Cursor Pagination):');
        console.log('  GET    /api/events                  - Get paginated events');
        console.log('  GET    /api/events/building/:id     - Events by building');
        console.log('  GET    /api/events/critical         - Critical events');
        console.log('  GET    /api/events/stats            - Event statistics');
        console.log('  GET    /api/events/export           - Stream export');
        console.log('\n🚪 Access endpoints (Cursor Pagination):');
        console.log('  GET    /api/access                  - Get paginated access logs');
        console.log('  GET    /api/access/person/:doc      - Access by person');
        console.log('  GET    /api/access/failed/:building - Failed attempts');
        console.log('  GET    /api/access/frequency/:id    - Access frequency');
        console.log('  GET    /api/access/visitors/:id     - Top visitors');
        console.log('  GET    /api/access/stats            - Access statistics');
        console.log('  GET    /api/access/export           - Stream export');
        console.log('\n🔗 Webhook endpoints:');
        console.log('  POST   /api/webhooks                - Create webhook');
        console.log('  GET    /api/webhooks                - List webhooks');
        console.log('  GET    /api/webhooks/:id            - Get webhook details');
        console.log('  PUT    /api/webhooks/:id            - Update webhook');
        console.log('  DELETE /api/webhooks/:id            - Delete webhook');
        console.log('  POST   /api/webhooks/:id/test       - Test webhook');
        console.log('  GET    /api/webhooks/:id/stats      - Webhook statistics');
        console.log('  GET    /api/webhooks/:id/deliveries - Delivery history');
        console.log('  POST   /api/webhooks/trigger        - Trigger event');
        console.log('  GET    /api/webhooks/events         - Available events');
        console.log('\n📊 Statistics endpoints:');
        console.log('  GET    /api/statistics/daily/:buildingId   - Daily statistics');
        console.log('  GET    /api/statistics/weekly/:buildingId  - Weekly statistics');
        console.log('  GET    /api/statistics/monthly/:buildingId - Monthly statistics');
        console.log('  GET    /api/statistics/summary/:buildingId - Summary across periods');
        console.log('  GET    /api/statistics/comparison          - Compare buildings');
        console.log('  POST   /api/statistics/aggregate           - Manual aggregation');
        console.log('  GET    /api/statistics/jobs/status         - Job status');
        console.log('  GET    /api/statistics/export/:buildingId  - Export statistics');
        console.log('\n🗑️  Soft Delete endpoints:');
        console.log('  GET    /api/soft-deletes                   - Get deleted records');
        console.log('  POST   /api/soft-deletes/:model/:id/restore - Restore record');
        console.log('  DELETE /api/soft-deletes/:model/:id/permanent - Permanently delete');
        console.log('  POST   /api/soft-deletes/:model/bulk-restore - Bulk restore');
        console.log('  GET    /api/soft-deletes/statistics        - Delete statistics');
        console.log('  POST   /api/soft-deletes/cleanup           - Cleanup old records');
        console.log('  GET    /api/soft-deletes/search            - Search deleted records');
        console.log('  GET    /api/soft-deletes/models            - Supported models');
        console.log('\\n⚙️  Dynamic Configuration endpoints:');
        console.log('  GET    /api/admin/config                  - Get all configurations');
        console.log('  GET    /api/admin/config/:key             - Get specific configuration');
        console.log('  PUT    /api/admin/config/:key             - Update configuration');
        console.log('  POST   /api/admin/config/bulk-update      - Bulk update configurations');
        console.log('  POST   /api/admin/config/:key/reset       - Reset to default');
        console.log('  POST   /api/admin/config/reset-all        - Reset all to defaults');
        console.log('  POST   /api/admin/config/validate         - Validate configurations');
        console.log('  GET    /api/admin/config/export           - Export configuration');
        console.log('  POST   /api/admin/config/import           - Import configuration');
        console.log('  GET    /api/admin/config/stats            - Configuration statistics');
        console.log('  GET    /api/admin/config/categories       - Available categories');
        console.log('  GET    /api/admin/config/health           - Health check');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    logger.info('HTTP server closed');
    await models.sequelize.close();
    logger.info('Database connection closed');
    
    // Shutdown WebSocket manager
    try {
      if (webSocketManager) {
        await webSocketManager.shutdown();
      }
    } catch (error) {
      logger.error('Error shutting down WebSocket manager:', {
        error: error.message
      });
    }
    
    // Shutdown notification service
    try {
      const { notificationService } = require('./services/notification.service');
      await notificationService.shutdown();
    } catch (error) {
      logger.error('Error shutting down notification service:', {
        error: error.message
      });
    }
    
    // Stop aggregation jobs
    try {
      const AggregationJobs = require('./jobs/aggregation.jobs');
      AggregationJobs.stop();
      logger.info('Aggregation jobs stopped');
    } catch (error) {
      logger.error('Error stopping aggregation jobs:', {
        error: error.message
      });
    }
    
    // Shutdown configuration service
    try {
      const ConfigService = require('./services/config.service');
      await ConfigService.shutdown();
      logger.info('Configuration service shutdown');
    } catch (error) {
      logger.error('Error shutting down configuration service:', {
        error: error.message
      });
    }
    
    // Cleanup existing infrastructure if available
    try {
      const { cleanup } = require('./infrastructure/initialization');
      await cleanup();
    } catch (error) {
      // Infrastructure cleanup not available
    }
    
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    logger.info('HTTP server closed');
    await models.sequelize.close();
    logger.info('Database connection closed');
    
    // Shutdown WebSocket manager
    try {
      if (webSocketManager) {
        await webSocketManager.shutdown();
      }
    } catch (error) {
      logger.error('Error shutting down WebSocket manager:', {
        error: error.message
      });
    }
    
    // Shutdown notification service
    try {
      const { notificationService } = require('./services/notification.service');
      await notificationService.shutdown();
    } catch (error) {
      logger.error('Error shutting down notification service:', {
        error: error.message
      });
    }
    
    // Stop aggregation jobs
    try {
      const AggregationJobs = require('./jobs/aggregation.jobs');
      AggregationJobs.stop();
      logger.info('Aggregation jobs stopped');
    } catch (error) {
      logger.error('Error stopping aggregation jobs:', {
        error: error.message
      });
    }
    
    // Shutdown configuration service
    try {
      const ConfigService = require('./services/config.service');
      await ConfigService.shutdown();
      logger.info('Configuration service shutdown');
    } catch (error) {
      logger.error('Error shutting down configuration service:', {
        error: error.message
      });
    }
    
    process.exit(0);
  });
});

// Start the server
startServer();