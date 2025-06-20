import { Server, Socket } from 'socket.io';
import { IRealtimeService, AccessLogUpdate, DoorStatusUpdate, OccupancyUpdate, SecurityAlert } from '../../application/services/IRealtimeService';
import { ILogger } from '../../application/services/ILogger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  buildingIds?: string[];
}

export class AccessMonitoringSocket implements IRealtimeService {
  private io: Server;
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();
  private buildingSubscriptions: Map<string, Set<string>> = new Map();

  constructor(
    io: Server,
    private readonly logger: ILogger
  ) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.logger.info('Client connected', { 
        socketId: socket.id, 
        userId: socket.userId 
      });

      this.connectedClients.set(socket.id, socket);

      // Join building rooms
      socket.on('subscribe:building', (buildingId: string) => {
        this.subscribeToBuilding(socket, buildingId);
      });

      socket.on('unsubscribe:building', (buildingId: string) => {
        this.unsubscribeFromBuilding(socket, buildingId);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Send initial connection acknowledgment
      socket.emit('connected', {
        socketId: socket.id,
        timestamp: new Date()
      });
    });
  }

  private async authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Validate token and extract user info
      // This would integrate with your auth service
      const userId = 'user-id'; // Replace with actual validation
      socket.userId = userId;

      next();
    } catch (error) {
      next(error as Error);
    }
  }

  private subscribeToBuilding(socket: AuthenticatedSocket, buildingId: string): void {
    socket.join(`building:${buildingId}`);
    
    if (!this.buildingSubscriptions.has(buildingId)) {
      this.buildingSubscriptions.set(buildingId, new Set());
    }
    this.buildingSubscriptions.get(buildingId)!.add(socket.id);

    this.logger.info('Client subscribed to building', {
      socketId: socket.id,
      buildingId
    });

    socket.emit('subscribed:building', { buildingId });
  }

  private unsubscribeFromBuilding(socket: AuthenticatedSocket, buildingId: string): void {
    socket.leave(`building:${buildingId}`);
    
    const subscribers = this.buildingSubscriptions.get(buildingId);
    if (subscribers) {
      subscribers.delete(socket.id);
      if (subscribers.size === 0) {
        this.buildingSubscriptions.delete(buildingId);
      }
    }

    socket.emit('unsubscribed:building', { buildingId });
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    this.logger.info('Client disconnected', { 
      socketId: socket.id, 
      userId: socket.userId 
    });

    this.connectedClients.delete(socket.id);

    // Remove from all building subscriptions
    this.buildingSubscriptions.forEach((subscribers, buildingId) => {
      if (subscribers.has(socket.id)) {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.buildingSubscriptions.delete(buildingId);
        }
      }
    });
  }

  // IRealtimeService implementation

  async sendAccessLog(update: AccessLogUpdate): Promise<void> {
    this.io.to(`building:${update.buildingId}`).emit('access:log', update);
    
    this.logger.debug('Access log sent', {
      buildingId: update.buildingId,
      doorId: update.doorId,
      result: update.accessResult
    });
  }

  subscribeToAccessLogs(buildingId: string, callback: (update: AccessLogUpdate) => void): void {
    // This is handled through socket subscriptions
    // The callback pattern is for alternative implementations
  }

  async sendDoorStatusUpdate(update: DoorStatusUpdate): Promise<void> {
    this.io.to(`building:${update.buildingId}`).emit('door:status', update);
    
    this.logger.debug('Door status update sent', {
      buildingId: update.buildingId,
      doorId: update.doorId,
      status: update.status
    });
  }

  subscribeToDoorStatus(buildingId: string, callback: (update: DoorStatusUpdate) => void): void {
    // Handled through socket subscriptions
  }

  async sendOccupancyUpdate(update: OccupancyUpdate): Promise<void> {
    this.io.to(`building:${update.buildingId}`).emit('occupancy:update', update);
    
    this.logger.debug('Occupancy update sent', {
      buildingId: update.buildingId,
      occupancyRate: update.occupancyRate
    });
  }

  subscribeToOccupancy(buildingId: string, callback: (update: OccupancyUpdate) => void): void {
    // Handled through socket subscriptions
  }

  async sendSecurityAlert(alert: SecurityAlert): Promise<void> {
    this.io.to(`building:${alert.buildingId}`).emit('security:alert', alert);
    
    // Also send to all admins
    this.io.to('security-admins').emit('security:alert', alert);
    
    this.logger.warn('Security alert sent', {
      alertId: alert.alertId,
      type: alert.type,
      severity: alert.severity,
      buildingId: alert.buildingId
    });
  }

  subscribeToSecurityAlerts(buildingId: string, callback: (alert: SecurityAlert) => void): void {
    // Handled through socket subscriptions
  }

  disconnect(clientId: string): void {
    const socket = this.connectedClients.get(clientId);
    if (socket) {
      socket.disconnect();
    }
  }

  async getConnectedClients(): Promise<string[]> {
    return Array.from(this.connectedClients.keys());
  }

  // Additional utility methods

  broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  sendToUser(userId: string, event: string, data: any): void {
    const userSockets = Array.from(this.connectedClients.values())
      .filter(socket => socket.userId === userId);
    
    userSockets.forEach(socket => {
      socket.emit(event, data);
    });
  }

  getSubscriberCount(buildingId: string): number {
    return this.buildingSubscriptions.get(buildingId)?.size || 0;
  }
}