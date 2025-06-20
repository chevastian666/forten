import axios, { AxiosInstance } from 'axios';
import { Logger } from '../../utils/Logger';

export interface QBoxConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

export interface DoorControlCommand {
  doorId: string;
  action: 'open' | 'close' | 'lock' | 'unlock';
  duration?: number; // for temporary actions
}

export interface AccessRequest {
  userId: string;
  doorId: string;
  accessType: 'card' | 'pin' | 'biometric' | 'remote';
  timestamp: Date;
}

export interface DoorStatus {
  id: string;
  name: string;
  status: 'open' | 'closed' | 'locked' | 'unlocked' | 'error';
  lastAccess?: Date;
  accessCount: number;
  batteryLevel?: number;
  signalStrength?: number;
  online: boolean;
}

export class QBoxService {
  private client: AxiosInstance;

  constructor(
    private config: QBoxConfig,
    private logger: Logger
  ) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(`Q-Box API error: ${error.response?.status} ${error.response?.statusText}`);
        return Promise.reject(error);
      }
    );
  }

  async getDoorStatus(doorId: string): Promise<DoorStatus> {
    try {
      const response = await this.client.get(`/api/v1/doors/${doorId}/status`);
      return {
        id: response.data.id,
        name: response.data.name,
        status: response.data.status,
        lastAccess: response.data.lastAccess ? new Date(response.data.lastAccess) : undefined,
        accessCount: response.data.accessCount,
        batteryLevel: response.data.batteryLevel,
        signalStrength: response.data.signalStrength,
        online: response.data.online
      };
    } catch (error) {
      this.logger.error(`Failed to get door status: ${error.message}`);
      throw error;
    }
  }

  async getAllDoorsStatus(): Promise<DoorStatus[]> {
    try {
      const response = await this.client.get('/api/v1/doors/status');
      return response.data.doors.map((door: any) => ({
        id: door.id,
        name: door.name,
        status: door.status,
        lastAccess: door.lastAccess ? new Date(door.lastAccess) : undefined,
        accessCount: door.accessCount,
        batteryLevel: door.batteryLevel,
        signalStrength: door.signalStrength,
        online: door.online
      }));
    } catch (error) {
      this.logger.error(`Failed to get all doors status: ${error.message}`);
      throw error;
    }
  }

  async controlDoor(command: DoorControlCommand): Promise<void> {
    try {
      await this.client.post(`/api/v1/doors/${command.doorId}/control`, {
        action: command.action,
        duration: command.duration
      });

      this.logger.info(`Door control command sent: ${command.action} for door ${command.doorId}`);
    } catch (error) {
      this.logger.error(`Failed to control door: ${error.message}`);
      throw error;
    }
  }

  async grantAccess(request: AccessRequest): Promise<boolean> {
    try {
      const response = await this.client.post('/api/v1/access/grant', {
        userId: request.userId,
        doorId: request.doorId,
        accessType: request.accessType,
        timestamp: request.timestamp.toISOString()
      });

      this.logger.info(`Access granted for user ${request.userId} to door ${request.doorId}`);
      return response.data.success;
    } catch (error) {
      this.logger.error(`Failed to grant access: ${error.message}`);
      return false;
    }
  }

  async getAccessLogs(doorId?: string, startTime?: Date, endTime?: Date): Promise<AccessLog[]> {
    try {
      const params: any = {};
      if (doorId) params.doorId = doorId;
      if (startTime) params.startTime = startTime.toISOString();
      if (endTime) params.endTime = endTime.toISOString();

      const response = await this.client.get('/api/v1/access/logs', { params });
      
      return response.data.logs.map((log: any) => ({
        id: log.id,
        userId: log.userId,
        doorId: log.doorId,
        accessType: log.accessType,
        result: log.result,
        timestamp: new Date(log.timestamp),
        reason: log.reason,
        metadata: log.metadata
      }));
    } catch (error) {
      this.logger.error(`Failed to get access logs: ${error.message}`);
      throw error;
    }
  }

  async createUser(userData: UserData): Promise<string> {
    try {
      const response = await this.client.post('/api/v1/users', {
        name: userData.name,
        email: userData.email,
        cardId: userData.cardId,
        pin: userData.pin,
        biometricData: userData.biometricData,
        permissions: userData.permissions,
        validFrom: userData.validFrom?.toISOString(),
        validTo: userData.validTo?.toISOString()
      });

      this.logger.info(`User created in Q-Box: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      this.logger.error(`Failed to create user in Q-Box: ${error.message}`);
      throw error;
    }
  }

  async updateUser(userId: string, updates: Partial<UserData>): Promise<void> {
    try {
      const payload: any = { ...updates };
      if (updates.validFrom) payload.validFrom = updates.validFrom.toISOString();
      if (updates.validTo) payload.validTo = updates.validTo.toISOString();

      await this.client.put(`/api/v1/users/${userId}`, payload);
      this.logger.info(`User updated in Q-Box: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update user in Q-Box: ${error.message}`);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/users/${userId}`);
      this.logger.info(`User deleted from Q-Box: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete user from Q-Box: ${error.message}`);
      throw error;
    }
  }

  async setSchedule(scheduleData: ScheduleData): Promise<string> {
    try {
      const response = await this.client.post('/api/v1/schedules', {
        name: scheduleData.name,
        doorIds: scheduleData.doorIds,
        userIds: scheduleData.userIds,
        timeSlots: scheduleData.timeSlots.map(slot => ({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime
        })),
        validFrom: scheduleData.validFrom.toISOString(),
        validTo: scheduleData.validTo.toISOString(),
        enabled: scheduleData.enabled
      });

      this.logger.info(`Schedule created in Q-Box: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      this.logger.error(`Failed to create schedule in Q-Box: ${error.message}`);
      throw error;
    }
  }

  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const response = await this.client.get('/api/v1/system/status');
      return {
        online: response.data.online,
        version: response.data.version,
        uptime: response.data.uptime,
        connectedDevices: response.data.connectedDevices,
        totalUsers: response.data.totalUsers,
        lastBackup: response.data.lastBackup ? new Date(response.data.lastBackup) : undefined,
        diskUsage: response.data.diskUsage,
        memoryUsage: response.data.memoryUsage,
        cpuUsage: response.data.cpuUsage
      };
    } catch (error) {
      this.logger.error(`Failed to get Q-Box system status: ${error.message}`);
      throw error;
    }
  }

  async getEvents(startTime?: Date, endTime?: Date): Promise<QBoxEvent[]> {
    try {
      const params: any = {};
      if (startTime) params.startTime = startTime.toISOString();
      if (endTime) params.endTime = endTime.toISOString();

      const response = await this.client.get('/api/v1/events', { params });
      
      return response.data.events.map((event: any) => ({
        id: event.id,
        type: event.type,
        deviceId: event.deviceId,
        userId: event.userId,
        description: event.description,
        severity: event.severity,
        timestamp: new Date(event.timestamp),
        metadata: event.metadata
      }));
    } catch (error) {
      this.logger.error(`Failed to get Q-Box events: ${error.message}`);
      throw error;
    }
  }
}

export interface UserData {
  name: string;
  email: string;
  cardId?: string;
  pin?: string;
  biometricData?: string;
  permissions: string[];
  validFrom?: Date;
  validTo?: Date;
}

export interface ScheduleData {
  name: string;
  doorIds: string[];
  userIds: string[];
  timeSlots: TimeSlot[];
  validFrom: Date;
  validTo: Date;
  enabled: boolean;
}

export interface TimeSlot {
  dayOfWeek: number; // 0-6, Sunday = 0
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export interface AccessLog {
  id: string;
  userId: string;
  doorId: string;
  accessType: 'card' | 'pin' | 'biometric' | 'remote';
  result: 'granted' | 'denied';
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface SystemStatus {
  online: boolean;
  version: string;
  uptime: number;
  connectedDevices: number;
  totalUsers: number;
  lastBackup?: Date;
  diskUsage: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface QBoxEvent {
  id: string;
  type: string;
  deviceId: string;
  userId?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  metadata?: Record<string, any>;
}