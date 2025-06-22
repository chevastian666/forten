/**
 * Q-Box Resident Synchronization Service
 * Handles synchronization of residents between CRM and Q-Box devices
 */

import { QBOX_CONFIG } from './config';
import { qboxMqttService } from './mqtt.service';
import { qboxDeviceService } from './device.service';
import { qboxAccessService, AccessPermission } from './access.service';
import { api } from '@/lib/api';

export interface QBoxResident {
  id: string;
  buildingId: string;
  apartment: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  photo?: string;
  cardNumbers?: string[];
  facialData?: string; // Base64 encoded facial recognition data
  accessMethods: ('pin' | 'card' | 'qr' | 'facial')[];
  status: 'active' | 'inactive' | 'suspended';
  syncStatus: 'synced' | 'pending' | 'error';
  lastSync?: Date;
  syncErrors?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{
    residentId: string;
    error: string;
  }>;
  duration: number;
}

export interface SyncProgress {
  total: number;
  current: number;
  percentage: number;
  currentResident?: string;
  status: 'preparing' | 'syncing' | 'completed' | 'failed';
}

class QBoxResidentService {
  private static instance: QBoxResidentService;
  private syncInProgress = false;
  private syncCallbacks: Array<(progress: SyncProgress) => void> = [];
  private residentCache: Map<string, QBoxResident> = new Map();

  private constructor() {
    this.setupMqttListeners();
  }

  static getInstance(): QBoxResidentService {
    if (!QBoxResidentService.instance) {
      QBoxResidentService.instance = new QBoxResidentService();
    }
    return QBoxResidentService.instance;
  }

  /**
   * Setup MQTT listeners
   */
  private setupMqttListeners(): void {
    qboxMqttService.on('syncCompleted', this.handleSyncCompleted.bind(this));
    qboxMqttService.on('syncFailed', this.handleSyncFailed.bind(this));
  }

  /**
   * Sync all residents for a building
   */
  async syncBuilding(buildingId: string): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
      duration: 0
    };

    try {
      // Get all residents for building
      const residents = await this.getResidents(buildingId);
      const total = residents.length;

      this.emitProgress({
        total,
        current: 0,
        percentage: 0,
        status: 'preparing'
      });

      // Get devices for building
      const devices = qboxDeviceService.getDevicesByBuilding(buildingId);
      
      // Sync each resident
      for (let i = 0; i < residents.length; i++) {
        const resident = residents[i];
        
        this.emitProgress({
          total,
          current: i + 1,
          percentage: Math.round(((i + 1) / total) * 100),
          currentResident: `${resident.firstName} ${resident.lastName}`,
          status: 'syncing'
        });

        try {
          await this.syncResident(resident, devices.map(d => d.id));
          resident.syncStatus = 'synced';
          resident.lastSync = new Date();
          result.synced++;
        } catch (error: any) {
          resident.syncStatus = 'error';
          resident.syncErrors = [error.message];
          result.failed++;
          result.errors.push({
            residentId: resident.id,
            error: error.message
          });
        }

        // Update resident status
        await this.updateResidentSync(resident);
      }

      result.duration = Date.now() - startTime;
      
      this.emitProgress({
        total,
        current: total,
        percentage: 100,
        status: 'completed'
      });

      return result;
    } catch (error) {
      console.error('Building sync failed:', error);
      result.success = false;
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync single resident
   */
  async syncResident(resident: QBoxResident, deviceIds: string[]): Promise<void> {
    try {
      // Create or update access permissions
      const permission: Omit<AccessPermission, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: resident.id,
        userType: 'resident',
        buildingId: resident.buildingId,
        devices: deviceIds,
        accessType: QBOX_CONFIG.ACCESS_TYPES.RESIDENT,
        validFrom: new Date(),
        methods: resident.accessMethods,
        status: resident.status === 'active' ? 'active' : 'suspended',
        createdBy: 'system',
        metadata: {
          apartment: resident.apartment
        }
      };

      await qboxAccessService.grantAccess(permission);

      // Sync additional data to devices
      const syncPromises = deviceIds.map(deviceId => 
        this.syncResidentToDevice(resident, deviceId)
      );

      await Promise.all(syncPromises);
    } catch (error) {
      console.error(`Failed to sync resident ${resident.id}:`, error);
      throw error;
    }
  }

  /**
   * Get residents for building
   */
  async getResidents(buildingId: string): Promise<QBoxResident[]> {
    try {
      const response = await api.get('/residents', {
        params: { buildingId }
      });

      const residents = response.data.map((r: any) => ({
        ...r,
        syncStatus: 'pending',
        accessMethods: this.determineAccessMethods(r)
      }));

      // Update cache
      residents.forEach((resident: QBoxResident) => {
        this.residentCache.set(resident.id, resident);
      });

      return residents;
    } catch (error) {
      console.error('Failed to get residents:', error);
      return [];
    }
  }

  /**
   * Update resident
   */
  async updateResident(residentId: string, updates: Partial<QBoxResident>): Promise<void> {
    try {
      // Update in backend
      await api.put(
        QBOX_CONFIG.ENDPOINTS.RESIDENTS_UPDATE,
        { residentId, ...updates }
      );

      // Update cache
      const resident = this.residentCache.get(residentId);
      if (resident) {
        Object.assign(resident, updates);
        this.residentCache.set(residentId, resident);
        
        // Trigger re-sync if needed
        if (updates.status || updates.accessMethods || updates.cardNumbers || updates.facialData) {
          const devices = qboxDeviceService.getDevicesByBuilding(resident.buildingId);
          await this.syncResident(resident, devices.map(d => d.id));
        }
      }
    } catch (error) {
      console.error('Failed to update resident:', error);
      throw error;
    }
  }

  /**
   * Remove resident
   */
  async removeResident(residentId: string): Promise<void> {
    try {
      const resident = this.residentCache.get(residentId);
      if (!resident) return;

      // Remove from backend
      await api.delete(QBOX_CONFIG.ENDPOINTS.RESIDENTS_DELETE, {
        data: { residentId }
      });

      // Remove access permissions
      const permissions = await qboxAccessService.getAccessPermissions(
        resident.buildingId,
        { userId: residentId }
      );

      for (const permission of permissions) {
        await qboxAccessService.revokeAccess(permission.id, 'Resident removed');
      }

      // Remove from cache
      this.residentCache.delete(residentId);
    } catch (error) {
      console.error('Failed to remove resident:', error);
      throw error;
    }
  }

  /**
   * Batch update residents
   */
  async batchUpdateResidents(
    buildingId: string,
    updates: Array<{ residentId: string; updates: Partial<QBoxResident> }>
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
      duration: 0
    };

    const startTime = Date.now();

    try {
      for (const update of updates) {
        try {
          await this.updateResident(update.residentId, update.updates);
          result.synced++;
        } catch (error: any) {
          result.failed++;
          result.errors.push({
            residentId: update.residentId,
            error: error.message
          });
        }
      }

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      console.error('Batch update failed:', error);
      result.success = false;
      throw error;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(buildingId: string): Promise<{
    totalResidents: number;
    synced: number;
    pending: number;
    errors: number;
    lastSync?: Date;
  }> {
    const residents = await this.getResidents(buildingId);
    
    const status = {
      totalResidents: residents.length,
      synced: residents.filter(r => r.syncStatus === 'synced').length,
      pending: residents.filter(r => r.syncStatus === 'pending').length,
      errors: residents.filter(r => r.syncStatus === 'error').length,
      lastSync: undefined as Date | undefined
    };

    // Find most recent sync
    const syncedResidents = residents.filter(r => r.lastSync);
    if (syncedResidents.length > 0) {
      status.lastSync = syncedResidents
        .map(r => r.lastSync!)
        .sort((a, b) => b.getTime() - a.getTime())[0];
    }

    return status;
  }

  /**
   * Subscribe to sync progress
   */
  onSyncProgress(callback: (progress: SyncProgress) => void): () => void {
    this.syncCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.syncCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Sync resident to specific device
   */
  private async syncResidentToDevice(resident: QBoxResident, deviceId: string): Promise<void> {
    const syncData: any = {
      userId: resident.id,
      firstName: resident.firstName,
      lastName: resident.lastName,
      apartment: resident.apartment,
      status: resident.status
    };

    // Add card numbers if available
    if (resident.cardNumbers && resident.cardNumbers.length > 0) {
      syncData.cardNumbers = resident.cardNumbers;
    }

    // Add facial data if available
    if (resident.facialData && resident.accessMethods.includes('facial')) {
      syncData.facialData = resident.facialData;
    }

    // Send sync command
    await qboxMqttService.sendCommand(deviceId, 'SYNC_USERS', {
      users: [syncData]
    });
  }

  /**
   * Update resident sync status
   */
  private async updateResidentSync(resident: QBoxResident): Promise<void> {
    try {
      await api.put('/residents/sync-status', {
        residentId: resident.id,
        syncStatus: resident.syncStatus,
        lastSync: resident.lastSync,
        syncErrors: resident.syncErrors
      });
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }

  /**
   * Determine access methods for resident
   */
  private determineAccessMethods(resident: any): ('pin' | 'card' | 'qr' | 'facial')[] {
    const methods: ('pin' | 'card' | 'qr' | 'facial')[] = ['pin']; // PIN always available
    
    if (resident.cardNumbers && resident.cardNumbers.length > 0) {
      methods.push('card');
    }
    
    if (resident.facialData) {
      methods.push('facial');
    }
    
    // QR code can be generated on demand
    methods.push('qr');
    
    return methods;
  }

  /**
   * Emit sync progress
   */
  private emitProgress(progress: SyncProgress): void {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Sync progress callback error:', error);
      }
    });
  }

  /**
   * Handle sync completed event
   */
  private handleSyncCompleted(event: any): void {
    console.log('Sync completed:', event);
  }

  /**
   * Handle sync failed event
   */
  private handleSyncFailed(event: any): void {
    console.error('Sync failed:', event);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.residentCache.clear();
  }

  /**
   * Check if sync is in progress
   */
  isSyncing(): boolean {
    return this.syncInProgress;
  }
}

export const qboxResidentService = QBoxResidentService.getInstance();