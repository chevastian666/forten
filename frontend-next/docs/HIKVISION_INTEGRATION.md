# HikCentral Integration Guide

## Overview

This document describes the HikCentral integration implementation for the FORTEN CRM system. The integration provides real-time camera streaming, PTZ control, event notifications, and recording management.

## Architecture

### Services Structure

```
src/services/hikvision/
├── config.ts          # Configuration and constants
├── auth.ts            # Authentication service with signature generation
├── camera.service.ts  # Camera operations and management
├── websocket.ts       # Real-time event subscription
├── streaming.ts       # HLS/RTSP streaming handler
└── index.ts          # Service exports and initialization
```

### Key Components

1. **Authentication Service** (`auth.ts`)
   - HMAC-SHA256 signature generation
   - Token management with auto-refresh
   - Request header preparation

2. **Camera Service** (`camera.service.ts`)
   - Camera listing and search
   - Preview URL generation
   - PTZ control commands
   - Recording management
   - Snapshot capture

3. **WebSocket Service** (`websocket.ts`)
   - Real-time event subscription
   - Motion detection alerts
   - Device status monitoring
   - Access control events

4. **Streaming Service** (`streaming.ts`)
   - HLS.js integration
   - Adaptive quality streaming
   - Network error recovery
   - Playback controls

## Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# HikCentral API Configuration
NEXT_PUBLIC_HIKVISION_API_URL=https://your-hikcentral-server.com/api
NEXT_PUBLIC_HIKVISION_APP_KEY=your-app-key
HIKVISION_APP_SECRET=your-app-secret
NEXT_PUBLIC_HIKVISION_WS_URL=wss://your-hikcentral-server.com/ws
```

### API Endpoints

The integration uses the following HikCentral API endpoints:

- `/api/v1/oauth/token` - Authentication
- `/api/resource/v2/camera/advance/cameraList` - Camera listing
- `/api/video/v2/cameras/previewURLs` - Stream URLs
- `/api/video/v1/ptzs/controlling` - PTZ control
- `/api/eventService/v1/eventLogs/searches` - Event search
- `/api/video/v2/records/searches` - Recording search

## Usage

### Initialize Services

```typescript
import { initializeHikCentralServices } from '@/services/hikvision';

// On app startup
await initializeHikCentralServices();
```

### Using the Camera Hook

```typescript
import { useHikCentralCameras } from '@/hooks/useHikCentralCamera';

function CameraList() {
  const { cameras, isLoadingCameras, wsStatus } = useHikCentralCameras();
  
  return (
    <div>
      {cameras.map(camera => (
        <HikCentralVideoPlayer
          key={camera.cameraIndexCode}
          cameraIndexCode={camera.cameraIndexCode}
          showPTZ={camera.ptz === 1}
        />
      ))}
    </div>
  );
}
```

### Camera Control

```typescript
import { useHikCentralCamera } from '@/hooks/useHikCentralCamera';

function CameraControl({ cameraId }) {
  const { 
    controlPTZ, 
    takeSnapshot,
    startRecording 
  } = useHikCentralCamera(cameraId);
  
  // PTZ control
  const handlePTZMove = (direction) => {
    controlPTZ.mutate({ 
      command: direction, 
      speed: 50 
    });
  };
  
  // Take snapshot
  const handleSnapshot = async () => {
    const blob = await takeSnapshot.mutateAsync();
    // Handle snapshot blob
  };
}
```

### Event Subscription

```typescript
import { hikCentralWebSocket } from '@/services/hikvision';

// Subscribe to motion detection
const subscriptionId = hikCentralWebSocket.subscribeToMotionDetection(
  ['camera-index-code-1', 'camera-index-code-2'],
  (event) => {
    console.log('Motion detected:', event);
  }
);

// Unsubscribe
hikCentralWebSocket.unsubscribeFromEvents(subscriptionId);
```

## Security Considerations

1. **API Keys**: Store `HIKVISION_APP_SECRET` only on the server side
2. **HTTPS**: Always use HTTPS for API communication
3. **CORS**: Configure proper CORS headers on HikCentral server
4. **Token Security**: Tokens are stored in memory, not localStorage
5. **Rate Limiting**: Implement rate limiting for API calls

## Stream Quality Profiles

The system supports multiple quality profiles:

- **HIGH**: 1920x1080, 30fps, 4096kbps
- **MEDIUM**: 1280x720, 25fps, 2048kbps
- **LOW**: 640x480, 15fps, 512kbps
- **MOBILE**: 320x240, 10fps, 256kbps

## PTZ Commands

Available PTZ commands:

- Directional: UP, DOWN, LEFT, RIGHT, LEFT_UP, LEFT_DOWN, RIGHT_UP, RIGHT_DOWN
- Zoom: ZOOM_IN, ZOOM_OUT
- Focus: FOCUS_NEAR, FOCUS_FAR
- Iris: IRIS_ENLARGE, IRIS_REDUCE
- Control: STOP, AUTO
- Presets: GOTO_PRESET, SET_PRESET

## Event Types

Supported event types:

- Motion Detection (131073)
- Video Loss (131074)
- Door Open/Close (196609/196610)
- Device Online/Offline (327681/327682)
- Line Crossing (393217)
- Intrusion Detection (393218)

## Error Handling

The integration includes comprehensive error handling:

1. **Network Errors**: Automatic retry with exponential backoff
2. **Authentication Errors**: Auto-refresh token mechanism
3. **Stream Errors**: Fallback to lower quality profiles
4. **WebSocket Errors**: Automatic reconnection

## Performance Optimization

1. **Lazy Loading**: Components use dynamic imports
2. **Stream Buffering**: Optimized HLS configuration
3. **Event Debouncing**: PTZ commands are debounced
4. **Resource Cleanup**: Proper cleanup on unmount

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure HikCentral server allows your domain
   - Check API URL configuration

2. **Authentication Failures**
   - Verify APP_KEY and APP_SECRET
   - Check signature generation

3. **Stream Not Loading**
   - Verify camera is online
   - Check network connectivity
   - Try different quality profile

4. **PTZ Not Working**
   - Confirm camera supports PTZ
   - Check user permissions

### Debug Mode

Enable debug logging:

```typescript
// In streaming.ts
this.hls = new Hls({
  debug: true, // Enable HLS.js debug logs
  // ... other config
});
```

## Future Enhancements

1. **WebRTC Support**: Direct peer-to-peer streaming
2. **AI Analytics**: Integration with HikCentral AI features
3. **Cloud Recording**: Upload recordings to cloud storage
4. **Multi-view**: Synchronized multi-camera views
5. **Timeline Playback**: Synchronized playback across cameras

## References

- [HikCentral OpenAPI Documentation](https://www.hikvision.com/en/support/download/sdk/)
- [HLS.js Documentation](https://github.com/video-dev/hls.js/)
- [Next.js Streaming Guide](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)