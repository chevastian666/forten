# Clean Architecture Setup

This document describes the clean architecture initialization setup for the FORTEN CRM backend.

## Overview

The backend now properly initializes clean architecture components through a dedicated initialization module that:
- Sets up the dependency injection container
- Initializes the SocketEventService with Socket.io
- Provides a centralized place for infrastructure setup

## Key Components

### 1. Initialization Module
- **Location**: `/src/infrastructure/initialization/index.js`
- **Purpose**: Centralizes all infrastructure initialization
- **Functions**:
  - `initializeInfrastructure(io)`: Initializes all services with Socket.io
  - `getContainer()`: Returns the dependency container instance
  - `cleanup()`: Handles graceful shutdown

### 2. Updated SocketEventService
- **Location**: `/src/infrastructure/services/js-wrappers/SocketEventService.js`
- **Changes**: Now supports full Socket.io integration
- **Features**:
  - WebSocket event handling for real-time updates
  - Building-specific room management
  - Backward compatibility with legacy event names
  - Redis integration for distributed systems

### 3. Application Integration
- **app.js**: Exposes the container to routes via middleware
- **server.js**: Initializes infrastructure after database connection
- **Routes**: Use clean architecture controllers via the container

## WebSocket Events

The system supports the following Socket.io events:

### Client to Server:
- `join-building`: Join a building's event room
- `leave-building`: Leave a building's event room
- `subscribe`: Legacy event for joining (backward compatibility)
- `unsubscribe`: Legacy event for leaving (backward compatibility)

### Server to Client:
- `event`: Building-specific events (access, alarms, etc.)
- `system-event`: System-wide broadcasts

## Usage Example

```javascript
// In a controller or use case
const eventService = container.get('eventService');

// Publish an event
await eventService.publish({
  buildingId: '123',
  type: 'access_granted',
  description: 'Front door access granted',
  severity: 'low'
});

// Get active connections
const connections = eventService.getActiveConnections('123');
```

## Testing

To test WebSocket functionality:
```bash
node test-websocket.js
```

This will verify that:
- Socket.io connections work properly
- Building room subscriptions function correctly
- Events can be received by connected clients

## Architecture Benefits

1. **Separation of Concerns**: Business logic is isolated from infrastructure
2. **Testability**: Services can be easily mocked for testing
3. **Scalability**: Easy to add new services or replace implementations
4. **Real-time Updates**: Integrated WebSocket support for live events