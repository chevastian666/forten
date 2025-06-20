/**
 * Building WebSocket Rooms Manager
 * Manages dynamic rooms per building for targeted notifications and events
 */

const { 
  verifyBuildingAccess, 
  getUserAccessibleBuildings,
  authorizeSocketAction 
} = require('./auth.middleware');

class BuildingRoomsManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> { building, users, metadata }
    this.userRooms = new Map(); // userId -> Set of roomIds
    this.heartbeatInterval = null;
    this.heartbeatFrequency = 30000; // 30 seconds
    this.connectionStats = {
      totalConnections: 0,
      activeRooms: 0,
      usersByBuilding: new Map()
    };
    
    this.initializeHeartbeat();
    console.log('🏢 Building Rooms Manager initialized');
  }

  /**
   * Initialize heartbeat system
   */
  initializeHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.cleanupInactiveConnections();
      this.updateConnectionStats();
    }, this.heartbeatFrequency);
    
    console.log(`💓 Heartbeat initialized (${this.heartbeatFrequency}ms interval)`);
  }

  /**
   * Handle new socket connection
   */
  async handleConnection(socket) {
    try {
      console.log(`🔌 New connection: ${socket.id} (User: ${socket.user.email})`);
      
      // Join user to appropriate building rooms
      await this.joinUserToBuildingRooms(socket);
      
      // Join global rooms based on role
      await this.joinRoleBasedRooms(socket);
      
      // Setup socket event handlers
      this.setupSocketHandlers(socket);
      
      // Update user's last activity
      this.updateUserActivity(socket);
      
      this.connectionStats.totalConnections++;
      
      // Send welcome message with room info
      socket.emit('connection_established', {
        message: 'Connected to FORTEN building monitoring system',
        userId: socket.user.id,
        rooms: Array.from(socket.rooms),
        buildings: socket.user.buildings,
        role: socket.user.role,
        heartbeatInterval: this.heartbeatFrequency,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ User ${socket.user.email} joined rooms: ${Array.from(socket.rooms).join(', ')}`);
      
    } catch (error) {
      console.error(`❌ Error handling connection for ${socket.id}:`, error);
      socket.emit('connection_error', { 
        message: 'Failed to establish connection',
        error: error.message 
      });
    }
  }

  /**
   * Join user to building-specific rooms
   */
  async joinUserToBuildingRooms(socket) {
    const userBuildings = getUserAccessibleBuildings(socket);
    
    // Handle admin access (all buildings)
    if (userBuildings.includes('all')) {
      await this.joinAdminToAllRooms(socket);
      return;
    }
    
    // Join specific building rooms
    for (const buildingId of userBuildings) {
      const roomId = `building_${buildingId}`;
      
      // Join the room
      socket.join(roomId);
      
      // Track room membership
      this.trackRoomMembership(socket.user.id, roomId, buildingId);
      
      console.log(`🏢 User ${socket.user.email} joined building room: ${roomId}`);
    }
  }

  /**
   * Join admin to all building rooms
   */
  async joinAdminToAllRooms(socket) {
    // Get all active building rooms
    const activeBuildingRooms = this.getAllBuildingRooms();
    
    for (const roomId of activeBuildingRooms) {
      socket.join(roomId);
    }
    
    // Join admin-specific rooms
    socket.join('admin_global');
    socket.join('all_buildings');
    
    console.log(`👑 Admin ${socket.user.email} joined all building rooms and admin rooms`);
  }

  /**
   * Join role-based global rooms
   */
  async joinRoleBasedRooms(socket) {
    const role = socket.user.role;
    
    // Role-specific rooms
    socket.join(`role_${role}`);
    
    // Function-based rooms
    switch (role) {
      case 'admin':
        socket.join('administrators');
        socket.join('security_team');
        socket.join('operators');
        break;
      case 'operator':
        socket.join('operators');
        socket.join('monitoring_team');
        break;
      case 'security':
        socket.join('security_team');
        socket.join('alerts_team');
        break;
      case 'viewer':
        socket.join('viewers');
        break;
    }
    
    // All authenticated users room
    socket.join('authenticated_users');
    
    console.log(`👤 User ${socket.user.email} (${role}) joined role-based rooms`);
  }

  /**
   * Setup socket event handlers
   */
  setupSocketHandlers(socket) {
    // Heartbeat response
    socket.on('heartbeat_response', (data) => {
      this.handleHeartbeatResponse(socket, data);
    });
    
    // Join specific building room
    socket.on('join_building', (data, callback) => {
      this.handleJoinBuilding(socket, data, callback);
    });
    
    // Leave building room
    socket.on('leave_building', (data, callback) => {
      this.handleLeaveBuilding(socket, data, callback);
    });
    
    // Get user's current rooms
    socket.on('get_rooms', (callback) => {
      this.handleGetRooms(socket, callback);
    });
    
    // Get building occupancy
    socket.on('get_building_occupancy', (data, callback) => {
      this.handleGetBuildingOccupancy(socket, data, callback);
    });
    
    // Send message to building
    socket.on('message_to_building', (data, callback) => {
      this.handleMessageToBuilding(socket, data, callback);
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });
    
    // Update user activity
    socket.on('user_activity', () => {
      this.updateUserActivity(socket);
    });
  }

  /**
   * Handle join building request
   */
  handleJoinBuilding(socket, data, callback) {
    try {
      const { buildingId } = data;
      
      if (!buildingId) {
        return callback({ error: 'Building ID is required' });
      }
      
      // Verify access
      if (!verifyBuildingAccess(socket, buildingId)) {
        return callback({ error: 'Access denied to building' });
      }
      
      const roomId = `building_${buildingId}`;
      socket.join(roomId);
      
      this.trackRoomMembership(socket.user.id, roomId, buildingId);
      
      callback({ 
        success: true, 
        message: `Joined building ${buildingId}`,
        roomId 
      });
      
      // Notify others in the building
      socket.to(roomId).emit('user_joined_building', {
        userId: socket.user.id,
        userName: `${socket.user.firstName} ${socket.user.lastName}`,
        buildingId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`❌ Error joining building:`, error);
      callback({ error: 'Failed to join building' });
    }
  }

  /**
   * Handle leave building request
   */
  handleLeaveBuilding(socket, data, callback) {
    try {
      const { buildingId } = data;
      
      if (!buildingId) {
        return callback({ error: 'Building ID is required' });
      }
      
      const roomId = `building_${buildingId}`;
      socket.leave(roomId);
      
      this.untrackRoomMembership(socket.user.id, roomId, buildingId);
      
      callback({ 
        success: true, 
        message: `Left building ${buildingId}`,
        roomId 
      });
      
      // Notify others in the building
      socket.to(roomId).emit('user_left_building', {
        userId: socket.user.id,
        userName: `${socket.user.firstName} ${socket.user.lastName}`,
        buildingId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`❌ Error leaving building:`, error);
      callback({ error: 'Failed to leave building' });
    }
  }

  /**
   * Handle get rooms request
   */
  handleGetRooms(socket, callback) {
    try {
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      const buildingRooms = rooms.filter(room => room.startsWith('building_'));
      const roleRooms = rooms.filter(room => room.startsWith('role_') || 
                                              ['administrators', 'operators', 'security_team', 'viewers'].includes(room));
      
      callback({
        success: true,
        data: {
          allRooms: rooms,
          buildingRooms,
          roleRooms,
          totalRooms: rooms.length
        }
      });
      
    } catch (error) {
      console.error(`❌ Error getting rooms:`, error);
      callback({ error: 'Failed to get rooms' });
    }
  }

  /**
   * Handle building occupancy request
   */
  async handleGetBuildingOccupancy(socket, data, callback) {
    try {
      const { buildingId } = data;
      
      if (!buildingId) {
        return callback({ error: 'Building ID is required' });
      }
      
      // Verify access
      if (!verifyBuildingAccess(socket, buildingId)) {
        return callback({ error: 'Access denied to building' });
      }
      
      const roomId = `building_${buildingId}`;
      const socketsInRoom = await this.io.in(roomId).fetchSockets();
      
      const occupancy = socketsInRoom.map(s => ({
        userId: s.user.id,
        userName: `${s.user.firstName} ${s.user.lastName}`,
        role: s.user.role,
        connectedAt: s.metadata.connectedAt,
        lastActive: s.user.lastActive
      }));
      
      callback({
        success: true,
        data: {
          buildingId,
          occupancy,
          totalUsers: occupancy.length
        }
      });
      
    } catch (error) {
      console.error(`❌ Error getting building occupancy:`, error);
      callback({ error: 'Failed to get building occupancy' });
    }
  }

  /**
   * Handle message to building
   */
  handleMessageToBuilding(socket, data, callback) {
    try {
      const { buildingId, message, type = 'info' } = data;
      
      if (!buildingId || !message) {
        return callback({ error: 'Building ID and message are required' });
      }
      
      // Verify access
      if (!verifyBuildingAccess(socket, buildingId)) {
        return callback({ error: 'Access denied to building' });
      }
      
      const roomId = `building_${buildingId}`;
      
      // Send message to building room
      this.io.to(roomId).emit('building_message', {
        from: {
          userId: socket.user.id,
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          role: socket.user.role
        },
        buildingId,
        message,
        type,
        timestamp: new Date().toISOString()
      });
      
      callback({ 
        success: true, 
        message: 'Message sent to building',
        recipients: roomId
      });
      
    } catch (error) {
      console.error(`❌ Error sending message to building:`, error);
      callback({ error: 'Failed to send message' });
    }
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(socket, reason) {
    try {
      console.log(`🔌 Socket disconnected: ${socket.id} (${socket.user.email}) - Reason: ${reason}`);
      
      // Clean up room memberships
      this.cleanupUserRooms(socket.user.id);
      
      // Notify building rooms about user leaving
      const userRooms = this.userRooms.get(socket.user.id) || new Set();
      userRooms.forEach(roomId => {
        if (roomId.startsWith('building_')) {
          const buildingId = roomId.replace('building_', '');
          socket.to(roomId).emit('user_left_building', {
            userId: socket.user.id,
            userName: `${socket.user.firstName} ${socket.user.lastName}`,
            buildingId,
            reason: 'disconnected',
            timestamp: new Date().toISOString()
          });
        }
      });
      
      this.connectionStats.totalConnections--;
      
    } catch (error) {
      console.error(`❌ Error handling disconnection:`, error);
    }
  }

  /**
   * Send heartbeat to all connected clients
   */
  sendHeartbeat() {
    const heartbeatData = {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      serverTime: Date.now(),
      stats: {
        totalConnections: this.connectionStats.totalConnections,
        activeRooms: this.connectionStats.activeRooms
      }
    };
    
    this.io.emit('heartbeat', heartbeatData);
  }

  /**
   * Handle heartbeat response
   */
  handleHeartbeatResponse(socket, data) {
    socket.user.lastActive = new Date();
    socket.metadata.lastHeartbeat = new Date();
    
    // Calculate latency if client sent timestamp
    if (data && data.clientTime) {
      const latency = Date.now() - data.clientTime;
      socket.metadata.latency = latency;
    }
  }

  /**
   * Clean up inactive connections
   */
  cleanupInactiveConnections() {
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    
    this.io.sockets.sockets.forEach(socket => {
      if (socket.user && socket.metadata) {
        const lastActive = socket.user.lastActive ? new Date(socket.user.lastActive).getTime() : 0;
        const lastHeartbeat = socket.metadata.lastHeartbeat ? new Date(socket.metadata.lastHeartbeat).getTime() : 0;
        
        const timeSinceActive = now - Math.max(lastActive, lastHeartbeat);
        
        if (timeSinceActive > inactiveThreshold) {
          console.log(`🧹 Disconnecting inactive socket: ${socket.id} (${socket.user.email})`);
          socket.emit('connection_timeout', { reason: 'Inactive for too long' });
          socket.disconnect(true);
        }
      }
    });
  }

  /**
   * Track room membership
   */
  trackRoomMembership(userId, roomId, buildingId) {
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId).add(roomId);
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        building: buildingId,
        users: new Set(),
        createdAt: new Date(),
        lastActivity: new Date()
      });
    }
    
    this.rooms.get(roomId).users.add(userId);
    this.rooms.get(roomId).lastActivity = new Date();
  }

  /**
   * Untrack room membership
   */
  untrackRoomMembership(userId, roomId, buildingId) {
    if (this.userRooms.has(userId)) {
      this.userRooms.get(userId).delete(roomId);
      if (this.userRooms.get(userId).size === 0) {
        this.userRooms.delete(userId);
      }
    }
    
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).users.delete(userId);
      if (this.rooms.get(roomId).users.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  /**
   * Clean up user rooms on disconnect
   */
  cleanupUserRooms(userId) {
    if (this.userRooms.has(userId)) {
      const userRooms = this.userRooms.get(userId);
      userRooms.forEach(roomId => {
        if (this.rooms.has(roomId)) {
          this.rooms.get(roomId).users.delete(userId);
          if (this.rooms.get(roomId).users.size === 0) {
            this.rooms.delete(roomId);
          }
        }
      });
      this.userRooms.delete(userId);
    }
  }

  /**
   * Update user activity
   */
  updateUserActivity(socket) {
    if (socket.user) {
      socket.user.lastActive = new Date();
    }
  }

  /**
   * Get all building rooms
   */
  getAllBuildingRooms() {
    return Array.from(this.rooms.keys()).filter(roomId => roomId.startsWith('building_'));
  }

  /**
   * Update connection statistics
   */
  updateConnectionStats() {
    this.connectionStats.activeRooms = this.rooms.size;
    
    // Update users by building
    this.connectionStats.usersByBuilding.clear();
    this.rooms.forEach((roomData, roomId) => {
      if (roomId.startsWith('building_')) {
        const buildingId = roomData.building;
        this.connectionStats.usersByBuilding.set(buildingId, roomData.users.size);
      }
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      ...this.connectionStats,
      usersByBuilding: Object.fromEntries(this.connectionStats.usersByBuilding),
      rooms: Object.fromEntries(
        Array.from(this.rooms.entries()).map(([roomId, data]) => [
          roomId,
          {
            building: data.building,
            userCount: data.users.size,
            createdAt: data.createdAt,
            lastActivity: data.lastActivity
          }
        ])
      ),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Send notification to building
   */
  async sendNotificationToBuilding(buildingId, notification) {
    const roomId = `building_${buildingId}`;
    
    this.io.to(roomId).emit('building_notification', {
      buildingId,
      notification,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📢 Notification sent to building ${buildingId}:`, notification.type);
  }

  /**
   * Broadcast to all buildings
   */
  async broadcastToAllBuildings(notification) {
    const buildingRooms = this.getAllBuildingRooms();
    
    buildingRooms.forEach(roomId => {
      this.io.to(roomId).emit('global_notification', {
        notification,
        timestamp: new Date().toISOString()
      });
    });
    
    console.log(`📡 Global notification broadcasted to ${buildingRooms.length} buildings:`, notification.type);
  }

  /**
   * Shutdown rooms manager
   */
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      console.log('💓 Heartbeat stopped');
    }
    
    console.log('🏢 Building Rooms Manager shutdown completed');
  }
}

module.exports = { BuildingRoomsManager };