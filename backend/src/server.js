require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config/config');
const { sequelize } = require('./models');
const { connectRedis } = require('./config/redis');
const { initializeInfrastructure, cleanup } = require('./infrastructure/initialization');

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.security.corsOrigin,
    credentials: true
  }
});

// Make io accessible to routes before initialization
app.set('io', io);

// Database and server initialization
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Sync database models
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized');
    
    // Connect to Redis
    await connectRedis();
    
    // Initialize clean architecture infrastructure with Socket.io
    await initializeInfrastructure(io);
    
    // Start server
    server.listen(config.app.port, () => {
      console.log(`FORTEN Backend running on port ${config.app.port}`);
      console.log(`Environment: ${config.app.env}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await sequelize.close();
    console.log('Database connection closed');
    await cleanup();
    process.exit(0);
  });
});

startServer();