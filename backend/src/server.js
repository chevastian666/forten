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
const { Server } = require('socket.io');

// Import middleware
const { auditMiddleware } = require('./middleware/audit.middleware');

// Import routes
const auditRoutes = require('./routes/audit.routes');

// Import models to initialize database
const models = require('./models');

// Create Express app
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Request logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || require('uuid').v4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

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

// API Routes
app.use('/api', auditRoutes);

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
  console.error('Server error:', error);
  
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
    // Test database connection
    await models.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync database models (in development)
    if (process.env.NODE_ENV === 'development') {
      await models.sequelize.sync({ alter: true });
      console.log('📊 Database models synchronized successfully.');
    }
    
    // Initialize existing infrastructure if available
    try {
      const { initializeInfrastructure } = require('./infrastructure/initialization');
      await initializeInfrastructure(io);
      console.log('🏗️ Clean architecture infrastructure initialized.');
    } catch (error) {
      console.log('ℹ️ Clean architecture infrastructure not found, skipping...');
    }
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 FORTEN Backend Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔍 Audit system: ENABLED`);
      console.log(`🔐 Database: PostgreSQL`);
      console.log(`🌐 WebSocket: ENABLED`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('\n📋 Demo endpoints available:');
        console.log('  POST   /api/demo/users       - Create user (audited)');
        console.log('  PUT    /api/demo/users/:id   - Update user (audited)');
        console.log('  DELETE /api/demo/users/:id   - Delete user (audited)');
        console.log('\n🔍 Audit endpoints:');
        console.log('  GET    /api/audit-logs       - Get audit logs');
        console.log('  GET    /api/audit-logs/stats - Get audit statistics');
        console.log('  POST   /api/audit-logs/export - Export audit logs');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    console.log('🔌 HTTP server closed');
    await models.sequelize.close();
    console.log('🗄️ Database connection closed');
    
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
  console.log('📴 SIGINT received, shutting down gracefully...');
  server.close(async () => {
    console.log('🔌 HTTP server closed');
    await models.sequelize.close();
    console.log('🗄️ Database connection closed');
    process.exit(0);
  });
});

// Start the server
startServer();