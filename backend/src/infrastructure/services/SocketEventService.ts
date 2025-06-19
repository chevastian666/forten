import { IEventService } from '../../domain/services/IEventService';
import { Event } from '../../domain/entities/Event';
import { Server as SocketIOServer, Socket } from 'socket.io';

export class SocketEventService implements IEventService {
  private io: SocketIOServer | null = null;
  private buildingSubscriptions: Map<string, Set<Socket>> = new Map();
  private eventCallbacks: Map<string, (event: Event) => void> = new Map();

  constructor() {}

  /**
   * Initialize the service with a Socket.IO server instance
   * @param io - Socket.IO server instance
   */
  initialize(io: SocketIOServer): void {
    this.io = io;

    // Set up Socket.IO connection handling
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle building room subscription
      socket.on('join-building', (buildingId: string) => {
        socket.join(`building-${buildingId}`);
        console.log(`Socket ${socket.id} joined building-${buildingId}`);
        
        // Track subscription for internal use
        if (!this.buildingSubscriptions.has(buildingId)) {
          this.buildingSubscriptions.set(buildingId, new Set());
        }
        this.buildingSubscriptions.get(buildingId)!.add(socket);
      });

      // Handle building room unsubscription
      socket.on('leave-building', (buildingId: string) => {
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
   * @param event - Event to publish
   */
  async publish(event: Event): Promise<void> {
    if (!this.io) {
      throw new Error('SocketEventService not initialized. Call initialize() with Socket.IO server first.');
    }

    try {
      // Emit to Socket.IO room for the building
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

      // Also trigger any local callbacks
      const callback = this.eventCallbacks.get(event.buildingId);
      if (callback) {
        callback(event);
      }

      console.log(`Event published to building-${event.buildingId}:`, event.type);
    } catch (error) {
      throw new Error(`Failed to publish event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Subscribe to events for a specific building (for internal use)
   * @param buildingId - Building ID to subscribe to
   * @param callback - Callback function to execute when an event is received
   */
  subscribe(buildingId: string, callback: (event: Event) => void): void {
    this.eventCallbacks.set(buildingId, callback);
    console.log(`Internal subscription added for building-${buildingId}`);
  }

  /**
   * Unsubscribe from events for a specific building (for internal use)
   * @param buildingId - Building ID to unsubscribe from
   */
  unsubscribe(buildingId: string): void {
    this.eventCallbacks.delete(buildingId);
    console.log(`Internal subscription removed for building-${buildingId}`);
  }

  /**
   * Get the number of active connections for a building
   * @param buildingId - Building ID
   * @returns Number of active connections
   */
  getActiveConnections(buildingId: string): number {
    const subscribers = this.buildingSubscriptions.get(buildingId);
    return subscribers ? subscribers.size : 0;
  }

  /**
   * Broadcast a system-wide event to all connected clients
   * @param event - Event to broadcast
   */
  async broadcastSystemEvent(event: Event): Promise<void> {
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
      throw new Error(`Failed to broadcast system event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}