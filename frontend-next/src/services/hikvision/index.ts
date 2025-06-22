/**
 * HikCentral Services Export
 * Main entry point for all HikCentral integration services
 */

// Export configuration
export * from './config';

// Export authentication service
export { hikCentralAuth } from './auth';

// Export camera service
export { hikCentralCameraService } from './camera.service';
export type { HikCamera, CameraPreviewUrl, PTZPosition, RecordingSegment } from './camera.service';

// Export WebSocket service
export { hikCentralWebSocket } from './websocket';

// Export streaming service
export { createHikCentralStream, HikCentralStreaming } from './streaming';
export type { StreamingOptions } from './streaming';

// Initialize services (to be called on app startup)
export async function initializeHikCentralServices() {
  try {
    // Authenticate with HikCentral
    await hikCentralAuth.authenticate();
    console.log('HikCentral authentication successful');
    
    // Connect WebSocket for real-time events
    await hikCentralWebSocket.connect();
    console.log('HikCentral WebSocket connected');
    
    return true;
  } catch (error) {
    console.error('Failed to initialize HikCentral services:', error);
    return false;
  }
}

// Cleanup services (to be called on app shutdown)
export function cleanupHikCentralServices() {
  hikCentralAuth.logout();
  hikCentralWebSocket.disconnect();
  hikCentralCameraService.cleanupStreamingSessions();
  console.log('HikCentral services cleaned up');
}