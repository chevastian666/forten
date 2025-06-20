/**
 * WebSocket Integration Hub
 * Main file for Socket.IO configuration with authentication and building rooms
 */

const { Server } = require('socket.io');
const { 
  authenticateSocket, 
  logConnection, 
  rateLimitSocketEvents,
  generateMockToken 
} = require('./auth.middleware');
const { BuildingRoomsManager } = require('./building.rooms');

class WebSocketManager {
  constructor(server) {
    this.server = server;
    this.io = null;
    this.buildingRoomsManager = null;
    this.connectedUsers = new Map(); // userId -> socket info
    this.connectionStats = {
      totalConnections: 0,
      authenticatedConnections: 0,
      buildingConnections: new Map()
    };
    
    this.initialize();
  }

  /**
   * Initialize Socket.IO server with authentication and rooms
   */
  initialize() {
    console.log('🚀 Initializing WebSocket server...');
    
    // Create Socket.IO server
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true
    });

    // Initialize building rooms manager
    this.buildingRoomsManager = new BuildingRoomsManager(this.io);
    
    // Make io and rooms manager globally accessible
    global.io = this.io;
    global.buildingRoomsManager = this.buildingRoomsManager;
    
    // Setup authentication middleware
    this.io.use(authenticateSocket);
    this.io.use(logConnection);
    this.io.use(rateLimitSocketEvents(100, 60000)); // 100 events per minute
    
    // Setup connection handler
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
    
    // Setup global error handler
    this.io.engine.on('connection_error', (err) => {
      console.error('❌ Socket.IO connection error:', err);
    });
    
    console.log('✅ WebSocket server initialized with authentication and building rooms');
  }

  /**
   * Handle new socket connection
   */
  async handleConnection(socket) {
    try {
      console.log(`🔌 New authenticated connection: ${socket.id} (${socket.user.email})`);
      
      // Update connection stats
      this.connectionStats.totalConnections++;
      this.connectionStats.authenticatedConnections++;
      
      // Track connected user
      this.connectedUsers.set(socket.user.id, {
        socketId: socket.id,
        email: socket.user.email,
        role: socket.user.role,
        buildings: socket.user.buildings,
        connectedAt: new Date(),
        lastActivity: new Date()
      });
      
      // Handle connection with building rooms manager
      await this.buildingRoomsManager.handleConnection(socket);
      
      // Setup connection event handlers
      this.setupConnectionHandlers(socket);
      
      // Send initial data
      this.sendInitialData(socket);
      
    } catch (error) {
      console.error(`❌ Error handling WebSocket connection:`, error);
      socket.emit('connection_error', { 
        message: 'Failed to establish connection',
        error: error.message 
      });
      socket.disconnect(true);
    }
  }

  /**
   * Setup connection-specific event handlers
   */
  setupConnectionHandlers(socket) {
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });
    
    // Handle ping/pong for connection health
    socket.on('ping', (callback) => {
      if (callback) callback('pong');
    });
    
    // Handle user status updates
    socket.on('update_status', (data) => {
      this.handleStatusUpdate(socket, data);
    });
    
    // Handle test events
    socket.on('test_connection', (callback) => {
      callback({
        success: true,
        message: 'Connection test successful',
        socketId: socket.id,
        userId: socket.user.id,
        timestamp: new Date().toISOString()
      });
    });
    
    // Handle admin commands
    if (socket.user.role === 'admin') {
      this.setupAdminHandlers(socket);
    }
  }

  /**
   * Setup admin-specific handlers
   */
  setupAdminHandlers(socket) {
    // Get connection statistics
    socket.on('get_connection_stats', (callback) => {
      callback({
        success: true,
        data: this.getConnectionStatistics()
      });
    });
    
    // Get connected users
    socket.on('get_connected_users', (callback) => {
      const users = Array.from(this.connectedUsers.values()).map(user => ({
        ...user,
        socketId: undefined // Don't expose socket IDs
      }));
      
      callback({
        success: true,
        data: users,
        count: users.length
      });
    });
    
    // Broadcast admin message
    socket.on('admin_broadcast', (data, callback) => {
      try {
        const { message, type = 'info', target = 'all' } = data;
        
        const broadcastData = {
          type: 'admin_message',
          message,
          messageType: type,
          from: {
            userId: socket.user.id,
            name: `${socket.user.firstName} ${socket.user.lastName}`
          },
          timestamp: new Date().toISOString()
        };
        
        if (target === 'all') {
          this.io.emit('admin_broadcast', broadcastData);
        } else if (target.startsWith('building_')) {
          this.io.to(target).emit('admin_broadcast', broadcastData);
        } else {
          this.io.to(target).emit('admin_broadcast', broadcastData);
        }
        
        callback({ success: true, message: 'Broadcast sent' });
        
      } catch (error) {
        console.error('❌ Admin broadcast error:', error);
        callback({ error: 'Failed to send broadcast' });
      }
    });
    
    // Force disconnect user
    socket.on('force_disconnect_user', (data, callback) => {
      try {
        const { userId, reason = 'Admin disconnect' } = data;
        
        if (this.connectedUsers.has(userId)) {
          const userInfo = this.connectedUsers.get(userId);
          const targetSocket = this.io.sockets.sockets.get(userInfo.socketId);
          
          if (targetSocket) {
            targetSocket.emit('force_disconnect', { reason });
            targetSocket.disconnect(true);
            
            callback({ 
              success: true, 
              message: `User ${userInfo.email} disconnected` 
            });
          } else {
            callback({ error: 'Socket not found' });
          }
        } else {
          callback({ error: 'User not connected' });
        }
        
      } catch (error) {
        console.error('❌ Force disconnect error:', error);
        callback({ error: 'Failed to disconnect user' });
      }
    });
  }

  /**
   * Send initial data to newly connected client
   */
  sendInitialData(socket) {
    // Send building rooms info
    const buildingRoomsStats = this.buildingRoomsManager.getConnectionStats();
    
    socket.emit('initial_data', {
      user: {
        id: socket.user.id,
        email: socket.user.email,
        role: socket.user.role,
        buildings: socket.user.buildings
      },
      rooms: Array.from(socket.rooms),
      buildingStats: buildingRoomsStats,
      serverInfo: {
        heartbeatInterval: 30000,
        maxEventRate: 100,
        connectionTime: socket.metadata.connectedAt
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle status update
   */
  handleStatusUpdate(socket, data) {
    try {
      const { status, location } = data;
      
      // Update user info
      if (this.connectedUsers.has(socket.user.id)) {
        const userInfo = this.connectedUsers.get(socket.user.id);
        userInfo.status = status;
        userInfo.location = location;
        userInfo.lastActivity = new Date();
      }
      
      // Broadcast status to relevant rooms
      socket.user.buildings.forEach(buildingId => {
        socket.to(`building_${buildingId}`).emit('user_status_update', {
          userId: socket.user.id,
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          status,
          location,
          timestamp: new Date().toISOString()
        });
      });
      
    } catch (error) {
      console.error('❌ Status update error:', error);
    }
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(socket, reason) {
    console.log(`🔌 Socket disconnected: ${socket.id} (${socket.user.email}) - ${reason}`);
    
    // Update stats
    this.connectionStats.totalConnections--;
    this.connectionStats.authenticatedConnections--;
    
    // Remove from connected users
    this.connectedUsers.delete(socket.user.id);
    
    console.log(`📊 Active connections: ${this.connectionStats.authenticatedConnections}`);
  }

  /**
   * Get connection statistics
   */
  getConnectionStatistics() {
    const buildingStats = this.buildingRoomsManager.getConnectionStats();
    
    return {
      ...this.connectionStats,
      buildingRooms: buildingStats,
      connectedUsers: this.connectedUsers.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Send notification to specific building
   */
  async sendBuildingNotification(buildingId, notification) {
    if (this.buildingRoomsManager) {
      await this.buildingRoomsManager.sendNotificationToBuilding(buildingId, notification);
    }
  }

  /**
   * Broadcast notification to all buildings
   */
  async broadcastNotification(notification) {
    if (this.buildingRoomsManager) {
      await this.buildingRoomsManager.broadcastToAllBuildings(notification);
    }
  }

  /**
   * Generate test tokens for development
   */
  generateTestTokens() {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('⚠️  Test tokens only available in development mode');
      return null;
    }
    
    const tokens = {
      admin: generateMockToken('admin-123', 'admin', []),
      operator: generateMockToken('operator-456', 'operator', ['building-1', 'building-2']),
      security: generateMockToken('security-789', 'security', ['building-1', 'building-3']),
      viewer: generateMockToken('viewer-101', 'viewer', ['building-2'])
    };
    
    console.log('🔑 Test tokens generated for development:');
    Object.entries(tokens).forEach(([role, token]) => {
      console.log(`  ${role}: ${token.substring(0, 20)}...`);
    });
    
    return tokens;
  }

  /**
   * Shutdown WebSocket server
   */
  async shutdown() {
    console.log('🛑 Shutting down WebSocket server...');
    
    // Notify all clients about shutdown
    this.io.emit('server_shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    });
    
    // Shutdown building rooms manager
    if (this.buildingRoomsManager) {
      this.buildingRoomsManager.shutdown();
    }
    
    // Close all connections
    this.io.close();
    
    console.log('✅ WebSocket server shutdown completed');
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Get building rooms manager
   */
  getBuildingRoomsManager() {
    return this.buildingRoomsManager;
  }
}

module.exports = { WebSocketManager };