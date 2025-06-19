// JavaScript wrapper for SocketEventService
// This allows us to use the TypeScript service from JavaScript code
// with full Socket.io integration

const { redisClient } = require('../../../config/redis');

class SocketEventService {
  constructor() {
    this.io = null;
    this.buildingSubscriptions = new Map();
    this.eventCallbacks = new Map();
  }

  /**
   * Initialize the service with a Socket.IO server instance
   * @param {Object} io - Socket.IO server instance
   */
  initialize(io) {
    this.io = io;

    // Set up Socket.IO connection handling
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle building room subscription
      socket.on('join-building', (buildingId) => {
        socket.join(`building-${buildingId}`);
        console.log(`Socket ${socket.id} joined building-${buildingId}`);
        
        // Track subscription for internal use
        if (!this.buildingSubscriptions.has(buildingId)) {
          this.buildingSubscriptions.set(buildingId, new Set());
        }
        this.buildingSubscriptions.get(buildingId).add(socket);
      });

      // Handle building room unsubscription
      socket.on('leave-building', (buildingId) => {
        socket.leave(`building-${buildingId}`);
        console.log(`Socket ${socket.id} left building-${buildingId}`);
        
        // Remove from tracking
        const subscribers = this.buildingSubscriptions.get(buildingId);
        if (subscribers) {
          subscribers.delete(socket);
          if (subscribers.size === 0) {
            this.buildingSubscriptions.delete(buildingId);
          }
        }
      });

      // Backward compatibility for old event names
      socket.on('subscribe', (buildingId) => {
        socket.join(`building-${buildingId}`);
        console.log(`Socket ${socket.id} subscribed to building ${buildingId}`);
      });
      
      socket.on('unsubscribe', (buildingId) => {
        socket.leave(`building-${buildingId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        
        // Remove socket from all building subscriptions
        this.buildingSubscriptions.forEach((sockets, buildingId) => {
          if (sockets.has(socket)) {
            sockets.delete(socket);
            if (sockets.size === 0) {
              this.buildingSubscriptions.delete(buildingId);
            }
          }
        });
      });
    });
  }

  /**
   * Publish an event to all subscribers of a building
   * @param {Object} event - Event to publish
   */
  async publish(event) {
    if (!this.io) {
      console.warn('SocketEventService not initialized. Publishing to Redis only.');
    }

    try {
      // Emit to Socket.IO room for the building if initialized
      if (this.io) {
        const room = `building-${event.buildingId}`;
        this.io.to(room).emit('event', {
          id: event.id,
          buildingId: event.buildingId,
          userId: event.userId,
          type: event.type,
          description: event.description,
          metadata: event.metadata,
          severity: event.severity,
          resolved: event.resolved,
          resolvedAt: event.resolvedAt,
          resolvedBy: event.resolvedBy,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt
        });
        console.log(`Event published to building-${event.buildingId}:`, event.type);
      }

      // Also publish to Redis for other services
      if (redisClient && redisClient.isOpen) {
        await redisClient.publish('events', JSON.stringify(event));
      }

      // Trigger any local callbacks
      const callback = this.eventCallbacks.get(event.buildingId);
      if (callback) {
        callback(event);
      }
    } catch (error) {
      console.error('Error publishing event:', error);
      // Don't throw - event publishing should not break the main flow
    }
  }

  /**
   * Subscribe to events for a specific building (for internal use)
   * @param {string} buildingId - Building ID to subscribe to
   * @param {Function} callback - Callback function to execute when an event is received
   */
  subscribe(buildingId, callback) {
    this.eventCallbacks.set(buildingId, callback);
    console.log(`Internal subscription added for building-${buildingId}`);
  }

  /**
   * Unsubscribe from events for a specific building (for internal use)
   * @param {string} buildingId - Building ID to unsubscribe from
   */
  unsubscribe(buildingId) {
    this.eventCallbacks.delete(buildingId);
    console.log(`Internal subscription removed for building-${buildingId}`);
  }

  /**
   * Get the number of active connections for a building
   * @param {string} buildingId - Building ID
   * @returns {number} Number of active connections
   */
  getActiveConnections(buildingId) {
    const subscribers = this.buildingSubscriptions.get(buildingId);
    return subscribers ? subscribers.size : 0;
  }

  /**
   * Broadcast a system-wide event to all connected clients
   * @param {Object} event - Event to broadcast
   */
  async broadcastSystemEvent(event) {
    if (!this.io) {
      throw new Error('SocketEventService not initialized. Call initialize() with Socket.IO server first.');
    }

    try {
      this.io.emit('system-event', {
        id: event.id,
        type: event.type,
        description: event.description,
        metadata: event.metadata,
        severity: event.severity,
        createdAt: event.createdAt
      });

      console.log('System event broadcasted:', event.type);
    } catch (error) {
      throw new Error(`Failed to broadcast system event: ${error.message || 'Unknown error'}`);
    }
  }
}

module.exports = { SocketEventService };