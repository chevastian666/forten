/**
 * Q-Box Access Control Service
 * Manages access permissions and control for Q-Box devices
 */

import { QBOX_CONFIG, QBOX_ACCESS_TYPES } from './config';
import { qboxMqttService } from './mqtt.service';
import { qboxDeviceService } from './device.service';
import { api } from '@/lib/api';

export interface AccessPermission {
  id: string;
  userId: string;
  userType: 'resident' | 'visitor' | 'staff' | 'admin';
  buildingId: string;
  devices: string[]; // Device IDs where access is granted
  accessType: string; // From QBOX_ACCESS_TYPES
  validFrom: Date;
  validUntil?: Date;
  weekDays?: number[]; // 0-6, Sunday to Saturday
  timeStart?: string; // HH:MM format
  timeEnd?: string; // HH:MM format
  methods: ('pin' | 'card' | 'qr' | 'facial' | 'remote')[];
  status: 'active' | 'suspended' | 'expired' | 'revoked';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    apartment?: string;
    company?: string;
    reason?: string;
    contactPhone?: string;
  };
}

export interface AccessLog {
  id: string;
  timestamp: Date;
  deviceId: string;
  deviceName: string;
  userId?: string;
  userName?: string;
  method: 'pin' | 'card' | 'qr' | 'facial' | 'remote' | 'manual';
  accessType: string;
  granted: boolean;
  reason?: string;
  duration?: number; // seconds
  photo?: string; // URL to snapshot
  location: string;
  buildingId: string;
}

export interface AccessRequest {
  deviceId: string;
  userId?: string;
  method: AccessLog['method'];
  credential?: string; // PIN, card number, QR code, etc.
  requestedBy?: string;
  reason?: string;
}

export interface AccessStats {
  totalAccess: number;
  grantedAccess: number;
  deniedAccess: number;
  byMethod: Record<string, number>;
  byHour: Record<number, number>;
  byDevice: Record<string, number>;
  peakHours: number[];
  averageAccessPerDay: number;
}

class QBoxAccessService {
  private static instance: QBoxAccessService;
  private permissionsCache: Map<string, AccessPermission> = new Map();
  private activeRequests: Map<string, AccessRequest> = new Map();

  private constructor() {
    this.setupMqttListeners();
  }

  static getInstance(): QBoxAccessService {
    if (!QBoxAccessService.instance) {
      QBoxAccessService.instance = new QBoxAccessService();
    }
    return QBoxAccessService.instance;
  }

  /**
   * Setup MQTT listeners
   */
  private setupMqttListeners(): void {
    qboxMqttService.on('accessRequest', this.handleAccessRequest.bind(this));
    qboxMqttService.on('accessGranted', this.handleAccessGranted.bind(this));
    qboxMqttService.on('accessDenied', this.handleAccessDenied.bind(this));
  }

  /**
   * Grant access permission
   */
  async grantAccess(permission: Omit<AccessPermission, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccessPermission> {
    try {
      // Validate permission
      if (!this.validatePermission(permission)) {
        throw new Error('Invalid permission configuration');
      }

      // Create permission in backend
      const response = await api.post(QBOX_CONFIG.ENDPOINTS.ACCESS_GRANT, permission);
      const createdPermission = response.data;

      // Cache permission
      this.permissionsCache.set(createdPermission.id, createdPermission);

      // Sync to devices
      await this.syncPermissionToDevices(createdPermission);

      return createdPermission;
    } catch (error) {
      console.error('Failed to grant access:', error);
      throw error;
    }
  }

  /**
   * Revoke access permission
   */
  async revokeAccess(permissionId: string, reason?: string): Promise<void> {
    try {
      await api.post(QBOX_CONFIG.ENDPOINTS.ACCESS_REVOKE, {
        permissionId,
        reason
      });

      // Update cache
      const permission = this.permissionsCache.get(permissionId);
      if (permission) {
        permission.status = 'revoked';
        this.permissionsCache.set(permissionId, permission);
        
        // Remove from devices
        await this.removePermissionFromDevices(permission);
      }
    } catch (error) {
      console.error('Failed to revoke access:', error);
      throw error;
    }
  }

  /**
   * Update access permission
   */
  async updateAccess(
    permissionId: string,
    updates: Partial<AccessPermission>
  ): Promise<AccessPermission> {
    try {
      const response = await api.put(
        `${QBOX_CONFIG.ENDPOINTS.ACCESS_LIST}/${permissionId}`,
        updates
      );

      const updatedPermission = response.data;

      // Update cache
      this.permissionsCache.set(permissionId, updatedPermission);

      // Re-sync to devices
      await this.syncPermissionToDevices(updatedPermission);

      return updatedPermission;
    } catch (error) {
      console.error('Failed to update access:', error);
      throw error;
    }
  }

  /**
   * Get access permissions for building
   */
  async getAccessPermissions(
    buildingId: string,
    filters?: {
      userId?: string;
      userType?: string;
      status?: string;
      deviceId?: string;
    }
  ): Promise<AccessPermission[]> {
    try {
      const response = await api.get(QBOX_CONFIG.ENDPOINTS.ACCESS_LIST, {
        params: {
          buildingId,
          ...filters
        }
      });

      const permissions = response.data;

      // Update cache
      permissions.forEach((permission: AccessPermission) => {
        this.permissionsCache.set(permission.id, permission);
      });

      return permissions;
    } catch (error) {
      console.error('Failed to get access permissions:', error);
      return [];
    }
  }

  /**
   * Get access logs
   */
  async getAccessLogs(
    buildingId: string,
    filters?: {
      deviceId?: string;
      userId?: string;
      method?: string;
      granted?: boolean;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<AccessLog[]> {
    try {
      const response = await api.get(QBOX_CONFIG.ENDPOINTS.ACCESS_LOGS, {
        params: {
          buildingId,
          ...filters,
          startDate: filters?.startDate?.toISOString(),
          endDate: filters?.endDate?.toISOString()
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get access logs:', error);
      return [];
    }
  }

  /**
   * Request remote access
   */
  async requestRemoteAccess(request: {
    deviceId: string;
    userId: string;
    reason?: string;
    duration?: number;
  }): Promise<boolean> {
    try {
      const response = await qboxDeviceService.grantAccess({
        deviceId: request.deviceId,
        userId: request.userId,
        accessType: QBOX_ACCESS_TYPES.RESIDENT,
        method: 'remote',
        duration: request.duration || 5,
        reason: request.reason || 'Remote access requested'
      });

      return response.success;
    } catch (error) {
      console.error('Remote access request failed:', error);
      return false;
    }
  }

  /**
   * Emergency access (open all doors)
   */
  async emergencyAccess(buildingId: string, reason: string): Promise<void> {
    try {
      // Log emergency access
      await api.post(`${QBOX_CONFIG.ENDPOINTS.ACCESS_GRANT}/emergency`, {
        buildingId,
        reason
      });

      // Open all doors
      await qboxDeviceService.emergencyOpenAll(buildingId);
    } catch (error) {
      console.error('Emergency access failed:', error);
      throw error;
    }
  }

  /**
   * Get access statistics
   */
  async getAccessStats(
    buildingId: string,
    period: { startDate: Date; endDate: Date }
  ): Promise<AccessStats> {
    try {
      const logs = await this.getAccessLogs(buildingId, {
        startDate: period.startDate,
        endDate: period.endDate
      });

      const stats: AccessStats = {
        totalAccess: logs.length,
        grantedAccess: logs.filter(log => log.granted).length,
        deniedAccess: logs.filter(log => !log.granted).length,
        byMethod: {},
        byHour: {},
        byDevice: {},
        peakHours: [],
        averageAccessPerDay: 0
      };

      // Calculate statistics
      logs.forEach(log => {
        // By method
        stats.byMethod[log.method] = (stats.byMethod[log.method] || 0) + 1;

        // By hour
        const hour = new Date(log.timestamp).getHours();
        stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;

        // By device
        stats.byDevice[log.deviceId] = (stats.byDevice[log.deviceId] || 0) + 1;
      });

      // Calculate peak hours (top 3)
      const hourCounts = Object.entries(stats.byHour)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));
      stats.peakHours = hourCounts;

      // Calculate average per day
      const days = Math.ceil(
        (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      stats.averageAccessPerDay = Math.round(stats.totalAccess / days);

      return stats;
    } catch (error) {
      console.error('Failed to get access statistics:', error);
      throw error;
    }
  }

  /**
   * Check if user has access
   */
  async checkAccess(
    userId: string,
    deviceId: string,
    method: AccessLog['method']
  ): Promise<boolean> {
    try {
      const device = qboxDeviceService.getDevice(deviceId);
      if (!device) return false;

      const permissions = await this.getAccessPermissions(device.buildingId, {
        userId,
        status: 'active'
      });

      const now = new Date();
      
      return permissions.some(permission => 
        permission.devices.includes(deviceId) &&
        permission.methods.includes(method) &&
        this.isPermissionValidForTime(permission, now)
      );
    } catch (error) {
      console.error('Access check failed:', error);
      return false;
    }
  }

  /**
   * Validate permission configuration
   */
  private validatePermission(permission: Partial<AccessPermission>): boolean {
    if (!permission.userId || !permission.buildingId || !permission.devices?.length) {
      return false;
    }

    if (!permission.methods?.length) {
      return false;
    }

    if (permission.validUntil && permission.validFrom && 
        permission.validUntil < permission.validFrom) {
      return false;
    }

    return true;
  }

  /**
   * Check if permission is valid for current time
   */
  private isPermissionValidForTime(
    permission: AccessPermission,
    date: Date = new Date()
  ): boolean {
    // Check date range
    if (permission.validFrom > date) return false;
    if (permission.validUntil && permission.validUntil < date) return false;

    // Check week days and time
    if (permission.weekDays && permission.timeStart && permission.timeEnd) {
      const dayOfWeek = date.getDay();
      if (!permission.weekDays.includes(dayOfWeek)) return false;

      const currentTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      if (currentTime < permission.timeStart || currentTime > permission.timeEnd) return false;
    }

    return true;
  }

  /**
   * Sync permission to devices
   */
  private async syncPermissionToDevices(permission: AccessPermission): Promise<void> {
    const promises = permission.devices.map(deviceId =>
      qboxMqttService.sendCommand(deviceId, 'ADD_USER', {
        userId: permission.userId,
        accessType: permission.accessType,
        methods: permission.methods,
        validFrom: permission.validFrom,
        validUntil: permission.validUntil,
        weekDays: permission.weekDays,
        timeStart: permission.timeStart,
        timeEnd: permission.timeEnd
      })
    );

    await Promise.all(promises);
  }

  /**
   * Remove permission from devices
   */
  private async removePermissionFromDevices(permission: AccessPermission): Promise<void> {
    const promises = permission.devices.map(deviceId =>
      qboxMqttService.sendCommand(deviceId, 'REMOVE_USER', {
        userId: permission.userId
      })
    );

    await Promise.all(promises);
  }

  /**
   * Handle access request event
   */
  private async handleAccessRequest(event: any): Promise<void> {
    const { deviceId, userId, method, credential } = event;
    
    // Store active request
    const requestId = `${deviceId}_${Date.now()}`;
    this.activeRequests.set(requestId, {
      deviceId,
      userId,
      method,
      credential
    });

    // Auto-cleanup after timeout
    setTimeout(() => {
      this.activeRequests.delete(requestId);
    }, 30000);
  }

  /**
   * Handle access granted event
   */
  private handleAccessGranted(event: any): void {
    console.log('Access granted:', event);
    // Could trigger notifications or analytics
  }

  /**
   * Handle access denied event
   */
  private handleAccessDenied(event: any): void {
    console.log('Access denied:', event);
    // Could trigger security alerts
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.permissionsCache.clear();
    this.activeRequests.clear();
  }
}

export const qboxAccessService = QBoxAccessService.getInstance();