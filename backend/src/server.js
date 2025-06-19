require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config/config');
const { sequelize } = require('./models');
const { connectRedis } = require('./config/redis');

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.security.corsOrigin,
    credentials: true
  }
});

// Socket.IO middleware for authentication
io.use((socket, next) => {
  // TODO: Implement JWT validation for WebSocket connections
  next();
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribe', (buildingId) => {
    socket.join(`building:${buildingId}`);
    console.log(`Socket ${socket.id} subscribed to building ${buildingId}`);
  });
  
  socket.on('unsubscribe', (buildingId) => {
    socket.leave(`building:${buildingId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
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
    process.exit(0);
  });
});

startServer();