/**
 * Q-Box PIN Management Service
 * Handles PIN generation, validation, and management
 */

import { QBOX_CONFIG, QBOX_RESPONSE_CODES } from './config';
import { qboxMqttService } from './mqtt.service';
import { api } from '@/lib/api';

export interface QBoxPin {
  id: string;
  pin: string;
  type: 'permanent' | 'temporary' | 'one_time' | 'recurring';
  buildingId: string;
  residentId?: string;
  visitorId?: string;
  description: string;
  validFrom: Date;
  validUntil?: Date;
  usageCount: number;
  maxUsage?: number;
  devices: string[]; // Device IDs where PIN is valid
  weekDays?: number[]; // For recurring PINs (0-6, Sunday to Saturday)
  timeStart?: string; // HH:MM format
  timeEnd?: string; // HH:MM format
  createdBy: string;
  createdAt: Date;
  lastUsed?: Date;
  status: 'active' | 'expired' | 'revoked' | 'used';
}

export interface PinGenerateRequest {
  type: QBoxPin['type'];
  buildingId: string;
  residentId?: string;
  visitorId?: string;
  description: string;
  validFrom?: Date;
  validUntil?: Date;
  maxUsage?: number;
  devices?: string[];
  weekDays?: number[];
  timeStart?: string;
  timeEnd?: string;
}

export interface PinValidationResult {
  valid: boolean;
  pin?: QBoxPin;
  reason?: string;
  remainingUsage?: number;
}

export interface PinUsageLog {
  id: string;
  pinId: string;
  deviceId: string;
  timestamp: Date;
  success: boolean;
  reason?: string;
  userId?: string;
  location: string;
}

class QBoxPinService {
  private static instance: QBoxPinService;
  private pinCache: Map<string, QBoxPin> = new Map();
  private blockedAttempts: Map<string, { count: number; blockedUntil?: Date }> = new Map();

  private constructor() {
    this.setupMqttListeners();
  }

  static getInstance(): QBoxPinService {
    if (!QBoxPinService.instance) {
      QBoxPinService.instance = new QBoxPinService();
    }
    return QBoxPinService.instance;
  }

  /**
   * Setup MQTT listeners for PIN events
   */
  private setupMqttListeners(): void {
    qboxMqttService.on('pinEntered', this.handlePinEntered.bind(this));
    qboxMqttService.on('pinValidated', this.handlePinValidated.bind(this));
  }

  /**
   * Generate new PIN
   */
  async generatePin(request: PinGenerateRequest): Promise<QBoxPin> {
    try {
      // Generate unique PIN
      const pin = this.generateUniquePin();
      
      // Create PIN object
      const pinData = {
        ...request,
        pin,
        validFrom: request.validFrom || new Date(),
        usageCount: 0,
        createdAt: new Date(),
        status: 'active' as const
      };

      // Save to backend
      const response = await api.post(QBOX_CONFIG.ENDPOINTS.PIN_GENERATE, pinData);
      const createdPin = response.data;

      // Cache PIN
      this.pinCache.set(createdPin.id, createdPin);

      // If devices specified, sync PIN to devices
      if (request.devices && request.devices.length > 0) {
        await this.syncPinToDevices(createdPin);
      }

      return createdPin;
    } catch (error) {
      console.error('Failed to generate PIN:', error);
      throw error;
    }
  }

  /**
   * Generate batch of PINs
   */
  async generateBatchPins(
    baseRequest: PinGenerateRequest,
    count: number
  ): Promise<QBoxPin[]> {
    try {
      const pins: QBoxPin[] = [];
      
      // Generate PINs
      for (let i = 0; i < count; i++) {
        const pin = this.generateUniquePin();
        pins.push({
          ...baseRequest,
          pin,
          validFrom: baseRequest.validFrom || new Date(),
          usageCount: 0,
          createdAt: new Date(),
          status: 'active' as const,
          id: '', // Will be set by backend
          createdBy: '' // Will be set by backend
        } as QBoxPin);
      }

      // Save batch to backend
      const response = await api.post(QBOX_CONFIG.ENDPOINTS.PIN_BATCH, {
        pins,
        baseRequest
      });

      const createdPins = response.data;

      // Cache all PINs
      createdPins.forEach((pin: QBoxPin) => {
        this.pinCache.set(pin.id, pin);
      });

      // Sync to devices if specified
      if (baseRequest.devices && baseRequest.devices.length > 0) {
        await Promise.all(
          createdPins.map((pin: QBoxPin) => this.syncPinToDevices(pin))
        );
      }

      return createdPins;
    } catch (error) {
      console.error('Failed to generate batch PINs:', error);
      throw error;
    }
  }

  /**
   * Validate PIN
   */
  async validatePin(
    pin: string,
    deviceId: string
  ): Promise<PinValidationResult> {
    try {
      // Check if device is blocked
      const deviceBlock = this.blockedAttempts.get(deviceId);
      if (deviceBlock?.blockedUntil && deviceBlock.blockedUntil > new Date()) {
        return {
          valid: false,
          reason: 'Device temporarily blocked due to multiple failed attempts'
        };
      }

      // Validate with backend
      const response = await api.post(QBOX_CONFIG.ENDPOINTS.PIN_VALIDATE, {
        pin,
        deviceId
      });

      const result = response.data;

      if (!result.valid) {
        // Track failed attempt
        this.trackFailedAttempt(deviceId);
      } else {
        // Clear failed attempts on success
        this.blockedAttempts.delete(deviceId);
        
        // Update cache if PIN data returned
        if (result.pin) {
          this.pinCache.set(result.pin.id, result.pin);
        }
      }

      return result;
    } catch (error) {
      console.error('PIN validation error:', error);
      return {
        valid: false,
        reason: 'Validation service error'
      };
    }
  }

  /**
   * Revoke PIN
   */
  async revokePin(pinId: string, reason?: string): Promise<void> {
    try {
      await api.post(QBOX_CONFIG.ENDPOINTS.PIN_REVOKE, {
        pinId,
        reason
      });

      // Update cache
      const pin = this.pinCache.get(pinId);
      if (pin) {
        pin.status = 'revoked';
        this.pinCache.set(pinId, pin);
      }

      // Remove from devices
      await this.removeFromDevices(pinId);
    } catch (error) {
      console.error('Failed to revoke PIN:', error);
      throw error;
    }
  }

  /**
   * Get PINs by building
   */
  async getPinsByBuilding(
    buildingId: string,
    filters?: {
      status?: QBoxPin['status'];
      type?: QBoxPin['type'];
      residentId?: string;
      visitorId?: string;
    }
  ): Promise<QBoxPin[]> {
    try {
      const response = await api.get(QBOX_CONFIG.ENDPOINTS.PIN_LIST, {
        params: {
          buildingId,
          ...filters
        }
      });

      const pins = response.data;

      // Update cache
      pins.forEach((pin: QBoxPin) => {
        this.pinCache.set(pin.id, pin);
      });

      return pins;
    } catch (error) {
      console.error('Failed to get PINs:', error);
      return [];
    }
  }

  /**
   * Get PIN usage logs
   */
  async getPinUsageLogs(
    pinId: string,
    limit: number = 50
  ): Promise<PinUsageLog[]> {
    try {
      const response = await api.get(
        `${QBOX_CONFIG.ENDPOINTS.PIN_LIST}/${pinId}/logs`,
        { params: { limit } }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get PIN logs:', error);
      return [];
    }
  }

  /**
   * Update PIN
   */
  async updatePin(
    pinId: string,
    updates: Partial<PinGenerateRequest>
  ): Promise<QBoxPin> {
    try {
      const response = await api.put(
        `${QBOX_CONFIG.ENDPOINTS.PIN_LIST}/${pinId}`,
        updates
      );

      const updatedPin = response.data;

      // Update cache
      this.pinCache.set(pinId, updatedPin);

      // Sync to devices if needed
      if (updates.devices) {
        await this.syncPinToDevices(updatedPin);
      }

      return updatedPin;
    } catch (error) {
      console.error('Failed to update PIN:', error);
      throw error;
    }
  }

  /**
   * Clean expired PINs
   */
  async cleanExpiredPins(): Promise<number> {
    try {
      const response = await api.post(`${QBOX_CONFIG.ENDPOINTS.PIN_LIST}/clean`);
      const { count } = response.data;

      // Remove from cache
      this.pinCache.forEach((pin, id) => {
        if (pin.status === 'expired' || 
            (pin.validUntil && pin.validUntil < new Date())) {
          this.pinCache.delete(id);
        }
      });

      return count;
    } catch (error) {
      console.error('Failed to clean expired PINs:', error);
      return 0;
    }
  }

  /**
   * Generate unique PIN
   */
  private generateUniquePin(): string {
    const length = QBOX_CONFIG.PIN.LENGTH;
    let pin = '';
    
    for (let i = 0; i < length; i++) {
      pin += Math.floor(Math.random() * 10).toString();
    }
    
    return pin;
  }

  /**
   * Sync PIN to devices
   */
  private async syncPinToDevices(pin: QBoxPin): Promise<void> {
    const devices = pin.devices || [];
    
    const promises = devices.map(deviceId =>
      qboxMqttService.sendCommand(deviceId, 'ADD_PIN', {
        pinId: pin.id,
        pin: pin.pin,
        type: pin.type,
        validFrom: pin.validFrom,
        validUntil: pin.validUntil,
        maxUsage: pin.maxUsage,
        weekDays: pin.weekDays,
        timeStart: pin.timeStart,
        timeEnd: pin.timeEnd
      })
    );

    await Promise.all(promises);
  }

  /**
   * Remove PIN from devices
   */
  private async removeFromDevices(pinId: string): Promise<void> {
    const pin = this.pinCache.get(pinId);
    if (!pin || !pin.devices) return;

    const promises = pin.devices.map(deviceId =>
      qboxMqttService.sendCommand(deviceId, 'REMOVE_PIN', {
        pinId: pin.id
      })
    );

    await Promise.all(promises);
  }

  /**
   * Track failed attempt
   */
  private trackFailedAttempt(deviceId: string): void {
    const current = this.blockedAttempts.get(deviceId) || { count: 0 };
    current.count++;

    if (current.count >= QBOX_CONFIG.PIN.MAX_ATTEMPTS) {
      current.blockedUntil = new Date(
        Date.now() + QBOX_CONFIG.PIN.BLOCK_DURATION
      );
    }

    this.blockedAttempts.set(deviceId, current);
  }

  /**
   * Handle PIN entered event
   */
  private handlePinEntered(event: any): void {
    console.log('PIN entered:', event);
    // Could be used for real-time monitoring
  }

  /**
   * Handle PIN validated event
   */
  private handlePinValidated(event: any): void {
    const { pinId, valid, deviceId, userId } = event;
    
    if (valid && pinId) {
      // Update usage count in cache
      const pin = this.pinCache.get(pinId);
      if (pin) {
        pin.usageCount++;
        pin.lastUsed = new Date();
        
        // Check if PIN should be marked as used (one-time)
        if (pin.type === 'one_time' || 
            (pin.maxUsage && pin.usageCount >= pin.maxUsage)) {
          pin.status = 'used';
        }
        
        this.pinCache.set(pinId, pin);
      }
    }
  }

  /**
   * Check if PIN is valid for current time
   */
  isValidForTime(pin: QBoxPin, date: Date = new Date()): boolean {
    // Check date range
    if (pin.validFrom > date) return false;
    if (pin.validUntil && pin.validUntil < date) return false;

    // Check recurring schedule
    if (pin.type === 'recurring' && pin.weekDays && pin.timeStart && pin.timeEnd) {
      const dayOfWeek = date.getDay();
      if (!pin.weekDays.includes(dayOfWeek)) return false;

      const currentTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      if (currentTime < pin.timeStart || currentTime > pin.timeEnd) return false;
    }

    return true;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.pinCache.clear();
    this.blockedAttempts.clear();
  }
}

export const qboxPinService = QBoxPinService.getInstance();