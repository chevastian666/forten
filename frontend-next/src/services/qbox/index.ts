/**
 * Q-Box Services Export
 * Central export point for all Q-Box related services
 */

export * from './config';
export * from './mqtt.service';
export * from './device.service';
export * from './pin.service';
export * from './access.service';
export * from './resident.service';

// Re-export singleton instances
export { qboxMqttService } from './mqtt.service';
export { qboxDeviceService } from './device.service';
export { qboxPinService } from './pin.service';
export { qboxAccessService } from './access.service';
export { qboxResidentService } from './resident.service';

// Initialize all services
export async function initializeQBoxServices(): Promise<void> {
  const { qboxDeviceService } = await import('./device.service');
  
  try {
    // Device service initializes MQTT connection
    await qboxDeviceService.initialize();
    
    console.log('Q-Box services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Q-Box services:', error);
    throw error;
  }
}

// Cleanup all services
export async function cleanupQBoxServices(): Promise<void> {
  const { qboxMqttService } = await import('./mqtt.service');
  const { qboxDeviceService } = await import('./device.service');
  const { qboxPinService } = await import('./pin.service');
  const { qboxAccessService } = await import('./access.service');
  const { qboxResidentService } = await import('./resident.service');
  
  qboxDeviceService.cleanup();
  qboxPinService.clearCache();
  qboxAccessService.clearCache();
  qboxResidentService.clearCache();
  qboxMqttService.disconnect();
  
  console.log('Q-Box services cleaned up');
}