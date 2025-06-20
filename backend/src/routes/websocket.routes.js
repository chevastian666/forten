/**
 * WebSocket Testing and Management Routes
 * API endpoints for testing WebSocket connections and managing building rooms
 */

const express = require('express');
const { generateMockToken } = require('../websocket/auth.middleware');

const router = express.Router();

/**
 * GET /api/websocket/test-tokens
 * Generate test JWT tokens for WebSocket connections (development only)
 */
router.get('/test-tokens', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      message: 'Test tokens only available in development mode'
    });
  }

  try {
    const tokens = {
      admin: generateMockToken('admin-123', 'admin', []),
      operator: generateMockToken('operator-456', 'operator', ['building-1', 'building-2']),
      security: generateMockToken('security-789', 'security', ['building-1', 'building-3']),
      viewer: generateMockToken('viewer-101', 'viewer', ['building-2'])
    };

    res.json({
      success: true,
      message: 'Test tokens generated for WebSocket connections',
      data: tokens,
      usage: {
        connect: 'ws://localhost:3001?token=<TOKEN>',
        authHeader: 'Authorization: Bearer <TOKEN>',
        socketAuth: 'socket.auth = { token: "<TOKEN>" }'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate test tokens',
      error: error.message
    });
  }
});

/**
 * GET /api/websocket/stats
 * Get WebSocket connection statistics
 */
router.get('/stats', (req, res) => {
  try {
    const buildingRoomsManager = req.app.get('buildingRoomsManager');
    
    if (!buildingRoomsManager) {
      return res.status(503).json({
        success: false,
        message: 'WebSocket system not available'
      });
    }

    const stats = buildingRoomsManager.getConnectionStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get WebSocket statistics',
      error: error.message
    });
  }
});

/**
 * POST /api/websocket/test-notification
 * Send test notification to specific building or all buildings
 */
router.post('/test-notification', (req, res) => {
  try {
    const { buildingId, type = 'test', message = 'Test notification' } = req.body;
    const buildingRoomsManager = req.app.get('buildingRoomsManager');
    
    if (!buildingRoomsManager) {
      return res.status(503).json({
        success: false,
        message: 'WebSocket system not available'
      });
    }

    const notification = {
      id: require('uuid').v4(),
      type,
      title: '🧪 Test Notification',
      message,
      priority: 'low',
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        source: 'api_test'
      }
    };

    if (buildingId) {
      // Send to specific building
      buildingRoomsManager.sendNotificationToBuilding(buildingId, notification);
      
      res.json({
        success: true,
        message: `Test notification sent to building ${buildingId}`,
        notification
      });
    } else {
      // Broadcast to all buildings
      buildingRoomsManager.broadcastNotification(notification);
      
      res.json({
        success: true,
        message: 'Test notification broadcasted to all buildings',
        notification
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

/**
 * GET /api/websocket/rooms
 * Get information about active WebSocket rooms
 */
router.get('/rooms', (req, res) => {
  try {
    const io = req.app.get('io');
    
    if (!io) {
      return res.status(503).json({
        success: false,
        message: 'WebSocket system not available'
      });
    }

    const rooms = [];
    const adapter = io.sockets.adapter;
    
    // Get all rooms
    adapter.rooms.forEach((sockets, roomName) => {
      // Skip individual socket rooms
      if (!adapter.sids.has(roomName)) {
        rooms.push({
          name: roomName,
          clientCount: sockets.size,
          type: roomName.startsWith('building_') ? 'building' : 
               roomName.startsWith('role_') ? 'role' : 'other'
        });
      }
    });

    res.json({
      success: true,
      data: {
        rooms,
        totalRooms: rooms.length,
        totalConnections: io.sockets.sockets.size
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get room information',
      error: error.message
    });
  }
});

/**
 * GET /api/websocket/connected-users
 * Get list of connected users (admin only)
 */
router.get('/connected-users', (req, res) => {
  try {
    const io = req.app.get('io');
    
    if (!io) {
      return res.status(503).json({
        success: false,
        message: 'WebSocket system not available'
      });
    }

    const connectedUsers = [];
    
    io.sockets.sockets.forEach(socket => {
      if (socket.user) {
        connectedUsers.push({
          userId: socket.user.id,
          email: socket.user.email,
          role: socket.user.role,
          buildings: socket.user.buildings,
          connectedAt: socket.metadata.connectedAt,
          lastActive: socket.user.lastActive,
          rooms: Array.from(socket.rooms).filter(room => room !== socket.id)
        });
      }
    });

    res.json({
      success: true,
      data: {
        users: connectedUsers,
        totalUsers: connectedUsers.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get connected users',
      error: error.message
    });
  }
});

/**
 * POST /api/websocket/broadcast
 * Broadcast message to all connected users or specific room
 */
router.post('/broadcast', (req, res) => {
  try {
    const { message, type = 'info', room = 'all' } = req.body;
    const io = req.app.get('io');
    
    if (!io) {
      return res.status(503).json({
        success: false,
        message: 'WebSocket system not available'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const broadcastData = {
      type: 'admin_broadcast',
      message,
      messageType: type,
      from: 'System Admin',
      timestamp: new Date().toISOString()
    };

    if (room === 'all') {
      io.emit('admin_broadcast', broadcastData);
    } else {
      io.to(room).emit('admin_broadcast', broadcastData);
    }

    res.json({
      success: true,
      message: `Broadcast sent to ${room}`,
      data: broadcastData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast',
      error: error.message
    });
  }
});

/**
 * GET /api/websocket/health
 * WebSocket system health check
 */
router.get('/health', (req, res) => {
  try {
    const io = req.app.get('io');
    const buildingRoomsManager = req.app.get('buildingRoomsManager');
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        socketIO: !!io,
        buildingRoomsManager: !!buildingRoomsManager,
        activeConnections: io ? io.sockets.sockets.size : 0,
        heartbeatActive: buildingRoomsManager ? !!buildingRoomsManager.heartbeatInterval : false
      }
    };

    // Check if any component is failing
    if (!io || !buildingRoomsManager) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

/**
 * GET /api/websocket/client-example
 * Get client-side connection example code
 */
router.get('/client-example', (req, res) => {
  const { role = 'operator' } = req.query;
  
  const examples = {
    javascript: `
// Install: npm install socket.io-client

import io from 'socket.io-client';

// Get token from API
const token = 'your-jwt-token-here';

// Connect to WebSocket
const socket = io('ws://localhost:3001', {
  auth: {
    token: token
  },
  transports: ['websocket', 'polling']
});

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to FORTEN WebSocket');
});

socket.on('connection_established', (data) => {
  console.log('Connection established:', data);
  console.log('User rooms:', data.rooms);
  console.log('Buildings:', data.buildings);
});

// Handle notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});

socket.on('building_notification', (data) => {
  console.log('Building notification:', data);
});

// Handle heartbeat
socket.on('heartbeat', (data) => {
  console.log('Heartbeat received');
  socket.emit('heartbeat_response', {
    clientTime: Date.now()
  });
});

// Join specific building (if you have access)
socket.emit('join_building', { buildingId: 'building-1' }, (response) => {
  console.log('Join building response:', response);
});

// Send message to building
socket.emit('message_to_building', {
  buildingId: 'building-1',
  message: 'Hello from operator!',
  type: 'info'
}, (response) => {
  console.log('Message sent:', response);
});

// Handle errors
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
`,
    
    curl: `
# Get test token
curl -X GET http://localhost:3001/api/websocket/test-tokens

# Get WebSocket stats
curl -X GET http://localhost:3001/api/websocket/stats

# Send test notification
curl -X POST http://localhost:3001/api/websocket/test-notification \\
  -H "Content-Type: application/json" \\
  -d '{"buildingId": "building-1", "message": "Test from API"}'
`,

    html: `
<!DOCTYPE html>
<html>
<head>
    <title>FORTEN WebSocket Test</title>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
</head>
<body>
    <h1>FORTEN WebSocket Test</h1>
    <div id="status">Disconnected</div>
    <div id="messages"></div>
    
    <script>
        // Get token from API first
        const token = 'your-test-token-here';
        
        const socket = io('ws://localhost:3001', {
            auth: { token: token }
        });
        
        const status = document.getElementById('status');
        const messages = document.getElementById('messages');
        
        socket.on('connect', () => {
            status.textContent = 'Connected';
            status.style.color = 'green';
        });
        
        socket.on('disconnect', () => {
            status.textContent = 'Disconnected';
            status.style.color = 'red';
        });
        
        socket.on('notification', (data) => {
            const div = document.createElement('div');
            div.innerHTML = \`<strong>\${data.title}</strong>: \${data.message}\`;
            messages.appendChild(div);
        });
        
        socket.on('heartbeat', () => {
            socket.emit('heartbeat_response', { clientTime: Date.now() });
        });
    </script>
</body>
</html>
`
  };

  res.json({
    success: true,
    message: 'WebSocket client connection examples',
    data: {
      examples,
      testEndpoint: '/api/websocket/test-tokens',
      websocketUrl: 'ws://localhost:3001',
      authMethods: [
        'auth.token in connection options',
        'Authorization: Bearer <token> header',
        'token=<token> query parameter'
      ]
    }
  });
});

module.exports = router;