import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Logger } from '../../utils/Logger';

export interface WebSocketConfig {
  cors: {
    origin: string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
}

export interface SocketUser {
  id: string;
  buildingIds: string[];
  role: string;
  permissions: string[];
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private socketUsers: Map<string, SocketUser> = new Map(); // socketId -> user
  private buildingSubscriptions: Map<string, Set<string>> = new Map(); // buildingId -> socketIds

  constructor(
    server: HttpServer,
    private config: WebSocketConfig,
    private jwtSecret: string,
    private logger: Logger
  ) {
    this.io = new SocketIOServer(server, {
      cors: config.cors,
      pingTimeout: config.pingTimeout,
      pingInterval: config.pingInterval
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          throw new Error('No authentication token provided');
        }

        const decoded = jwt.verify(token, this.jwtSecret) as any;
        const user: SocketUser = {
          id: decoded.userId,
          buildingIds: decoded.buildingIds || [],
          role: decoded.role,
          permissions: decoded.permissions || []
        };

        socket.data.user = user;
        this.logger.info(`WebSocket authentication successful for user: ${user.id}`);
        next();
      } catch (error) {
        this.logger.warn(`WebSocket authentication failed: ${error.message}`);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const user = socket.data.user as SocketUser;
      this.logger.info(`User connected via WebSocket: ${user.id} (${socket.id})`);

      // Track connected users
      if (!this.connectedUsers.has(user.id)) {
        this.connectedUsers.set(user.id, new Set());
      }
      this.connectedUsers.get(user.id)!.add(socket.id);
      this.socketUsers.set(socket.id, user);

      // Subscribe to buildings user has access to
      user.buildingIds.forEach(buildingId => {
        this.subscribeToBuilding(socket.id, buildingId);
        socket.join(`building:${buildingId}`);
      });

      // Handle building subscription
      socket.on('subscribe:building', (buildingId: string) => {
        if (this.hasAccessToBuilding(user, buildingId)) {
          this.subscribeToBuilding(socket.id, buildingId);
          socket.join(`building:${buildingId}`);
          this.logger.info(`User ${user.id} subscribed to building: ${buildingId}`);
        } else {
          socket.emit('error', { message: 'Access denied to building' });
        }
      });

      // Handle building unsubscription
      socket.on('unsubscribe:building', (buildingId: string) => {
        this.unsubscribeFromBuilding(socket.id, buildingId);
        socket.leave(`building:${buildingId}`);
        this.logger.info(`User ${user.id} unsubscribed from building: ${buildingId}`);
      });

      // Handle camera stream requests
      socket.on('camera:stream:start', (data: { cameraId: string; quality?: string }) => {
        if (this.hasPermission(user, 'camera:stream')) {
          socket.emit('camera:stream:starting', { cameraId: data.cameraId });
          this.logger.info(`Stream requested for camera ${data.cameraId} by user ${user.id}`);
        } else {
          socket.emit('error', { message: 'Access denied to camera streaming' });
        }
      });

      // Handle camera control requests
      socket.on('camera:control', (data: { cameraId: string; command: any }) => {
        if (this.hasPermission(user, 'camera:control')) {
          socket.emit('camera:control:acknowledged', { cameraId: data.cameraId });
          this.logger.info(`Camera control requested for ${data.cameraId} by user ${user.id}`);
        } else {
          socket.emit('error', { message: 'Access denied to camera control' });
        }
      });

      // Handle door control requests
      socket.on('door:control', (data: { doorId: string; action: string }) => {
        if (this.hasPermission(user, 'door:control')) {
          socket.emit('door:control:acknowledged', { doorId: data.doorId });
          this.logger.info(`Door control requested for ${data.doorId} by user ${user.id}`);
        } else {
          socket.emit('error', { message: 'Access denied to door control' });
        }
      });

      // Handle alert acknowledgment
      socket.on('alert:acknowledge', (alertId: string) => {
        if (this.hasPermission(user, 'alert:acknowledge')) {
          socket.emit('alert:acknowledged', { alertId });
          this.logger.info(`Alert ${alertId} acknowledged by user ${user.id}`);
        } else {
          socket.emit('error', { message: 'Access denied to alert acknowledgment' });
        }
      });

      // Handle event acknowledgment
      socket.on('event:acknowledge', (eventId: string) => {
        if (this.hasPermission(user, 'event:acknowledge')) {
          socket.emit('event:acknowledged', { eventId });
          this.logger.info(`Event ${eventId} acknowledged by user ${user.id}`);
        } else {
          socket.emit('error', { message: 'Access denied to event acknowledgment' });
        }
      });

      // Handle heartbeat
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.logger.info(`User disconnected: ${user.id} (${socket.id}) - ${reason}`);
        this.handleDisconnection(socket.id, user.id);
      });

      // Send initial connection success
      socket.emit('connected', {
        userId: user.id,
        buildings: user.buildingIds,
        permissions: user.permissions
      });
    });
  }

  private subscribeToBuilding(socketId: string, buildingId: string): void {
    if (!this.buildingSubscriptions.has(buildingId)) {
      this.buildingSubscriptions.set(buildingId, new Set());
    }
    this.buildingSubscriptions.get(buildingId)!.add(socketId);
  }

  private unsubscribeFromBuilding(socketId: string, buildingId: string): void {
    const subscribers = this.buildingSubscriptions.get(buildingId);
    if (subscribers) {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.buildingSubscriptions.delete(buildingId);
      }
    }
  }

  private handleDisconnection(socketId: string, userId: string): void {
    // Remove from connected users
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    // Remove from socket users
    this.socketUsers.delete(socketId);

    // Remove from building subscriptions
    this.buildingSubscriptions.forEach((subscribers, buildingId) => {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.buildingSubscriptions.delete(buildingId);
      }
    });
  }

  private hasAccessToBuilding(user: SocketUser, buildingId: string): boolean {
    return user.buildingIds.includes(buildingId) || user.role === 'admin';
  }

  private hasPermission(user: SocketUser, permission: string): boolean {
    return user.permissions.includes(permission) || user.role === 'admin';
  }

  // Public methods for emitting events

  emit(event: string, data: any): void {
    this.io.emit(event, data);
  }

  emitToUser(userId: string, event: string, data: any): void {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  emitToBuilding(buildingId: string, event: string, data: any): void {
    this.io.to(`building:${buildingId}`).emit(event, data);
  }

  emitToRole(role: string, event: string, data: any): void {
    this.socketUsers.forEach((user, socketId) => {
      if (user.role === role) {
        this.io.to(socketId).emit(event, data);
      }
    });
  }

  // Specific event emitters for monitoring events

  emitCameraStatusChange(buildingId: string, cameraId: string, status: string, previousStatus: string): void {
    this.emitToBuilding(buildingId, 'camera:status_changed', {
      cameraId,
      status,
      previousStatus,
      timestamp: new Date()
    });
  }

  emitDeviceStatusChange(buildingId: string, deviceId: string, status: string, previousStatus: string): void {
    this.emitToBuilding(buildingId, 'device:status_changed', {
      deviceId,
      status,
      previousStatus,
      timestamp: new Date()
    });
  }

  emitMotionDetected(buildingId: string, cameraId: string, location: string, imageUrl?: string): void {
    this.emitToBuilding(buildingId, 'motion:detected', {
      cameraId,
      location,
      imageUrl,
      timestamp: new Date()
    });
  }

  emitDoorEvent(buildingId: string, doorId: string, event: string, userId?: string): void {
    this.emitToBuilding(buildingId, 'door:event', {
      doorId,
      event,
      userId,
      timestamp: new Date()
    });
  }

  emitAlert(buildingId: string, alert: any): void {
    this.emitToBuilding(buildingId, 'alert:new', {
      alert,
      timestamp: new Date()
    });
  }

  emitEvent(buildingId: string, event: any): void {
    this.emitToBuilding(buildingId, 'event:new', {
      event,
      timestamp: new Date()
    });
  }

  emitSystemStatus(status: any): void {
    this.emit('system:status', {
      status,
      timestamp: new Date()
    });
  }

  // Utility methods

  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  getBuildingSubscribersCount(buildingId: string): number {
    return this.buildingSubscriptions.get(buildingId)?.size || 0;
  }

  getUsersInBuilding(buildingId: string): string[] {
    const subscribers = this.buildingSubscriptions.get(buildingId);
    if (!subscribers) return [];

    const users: string[] = [];
    subscribers.forEach(socketId => {
      const user = this.socketUsers.get(socketId);
      if (user && !users.includes(user.id)) {
        users.push(user.id);
      }
    });

    return users;
  }

  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  getConnectionStats(): {
    totalConnections: number;
    uniqueUsers: number;
    buildingSubscriptions: number;
  } {
    return {
      totalConnections: this.socketUsers.size,
      uniqueUsers: this.connectedUsers.size,
      buildingSubscriptions: this.buildingSubscriptions.size
    };
  }
}