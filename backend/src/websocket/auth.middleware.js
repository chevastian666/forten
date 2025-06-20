/**
 * WebSocket Authentication Middleware
 * JWT-based authentication for Socket.IO connections
 */

const jwt = require('jsonwebtoken');

/**
 * Authentication middleware for Socket.IO
 */
const authenticateSocket = async (socket, next) => {
  try {
    console.log(`🔐 Authenticating socket connection: ${socket.id}`);
    
    // Get token from auth header or handshake
    let token = null;
    
    // Try multiple token sources
    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    } else if (socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    } else if (socket.handshake.query && socket.handshake.query.token) {
      token = socket.handshake.query.token;
    }
    
    if (!token) {
      console.warn(`⚠️  No token provided for socket: ${socket.id}`);
      return next(new Error('Authentication token required'));
    }
    
    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    const decoded = jwt.verify(token, jwtSecret);
    
    // Simulate user lookup (in production, query database)
    const user = await getUserById(decoded.userId || decoded.id);
    
    if (!user) {
      console.warn(`⚠️  User not found for token: ${decoded.userId || decoded.id}`);
      return next(new Error('User not found'));
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      console.warn(`⚠️  Inactive user attempted connection: ${user.id}`);
      return next(new Error('User account is not active'));
    }
    
    // Attach user information to socket
    socket.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName || user.first_name,
      lastName: user.lastName || user.last_name,
      buildings: user.buildings || [],
      permissions: user.permissions || [],
      lastActive: new Date()
    };
    
    // Store connection info
    socket.metadata = {
      connectedAt: new Date(),
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      buildingAccess: user.buildings || []
    };
    
    console.log(`✅ Socket authenticated: ${socket.id} (User: ${user.email}, Role: ${user.role})`);
    next();
    
  } catch (error) {
    console.error(`❌ Socket authentication failed for ${socket.id}:`, error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid authentication token'));
    } else if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication token expired'));
    } else {
      return next(new Error('Authentication failed'));
    }
  }
};

/**
 * Authorization middleware for specific actions
 */
const authorizeSocketAction = (requiredPermissions = []) => {
  return (socket, data, callback) => {
    try {
      if (!socket.user) {
        const error = new Error('Not authenticated');
        error.code = 'UNAUTHORIZED';
        return callback(error);
      }
      
      // Check role-based permissions
      const userRole = socket.user.role;
      const allowedRoles = ['admin', 'operator', 'security', 'viewer'];
      
      if (!allowedRoles.includes(userRole)) {
        const error = new Error('Insufficient role permissions');
        error.code = 'FORBIDDEN';
        return callback(error);
      }
      
      // Check specific permissions if required
      if (requiredPermissions.length > 0) {
        const userPermissions = socket.user.permissions || [];
        const hasPermission = requiredPermissions.some(perm => 
          userPermissions.includes(perm) || userRole === 'admin'
        );
        
        if (!hasPermission) {
          const error = new Error(`Missing required permissions: ${requiredPermissions.join(', ')}`);
          error.code = 'FORBIDDEN';
          return callback(error);
        }
      }
      
      // Check building access if building ID is provided
      if (data && data.buildingId) {
        const hasAccess = socket.user.role === 'admin' || 
                         socket.user.buildings.includes(data.buildingId);
        
        if (!hasAccess) {
          const error = new Error('No access to specified building');
          error.code = 'FORBIDDEN';
          return callback(error);
        }
      }
      
      return callback(null, true);
      
    } catch (error) {
      console.error(`❌ Authorization failed for socket ${socket.id}:`, error);
      const authError = new Error('Authorization failed');
      authError.code = 'FORBIDDEN';
      return callback(authError);
    }
  };
};

/**
 * Building access verification
 */
const verifyBuildingAccess = (socket, buildingId) => {
  if (!socket.user) {
    return false;
  }
  
  // Admin has access to all buildings
  if (socket.user.role === 'admin') {
    return true;
  }
  
  // Check if user has explicit access to building
  return socket.user.buildings.includes(buildingId);
};

/**
 * Get buildings accessible by user
 */
const getUserAccessibleBuildings = (socket) => {
  if (!socket.user) {
    return [];
  }
  
  // Admin gets all buildings (in production, query from database)
  if (socket.user.role === 'admin') {
    return ['all']; // Special case for admin
  }
  
  return socket.user.buildings || [];
};

/**
 * Mock user lookup function
 * In production, replace with actual database query
 */
async function getUserById(userId) {
  // Mock user data - replace with actual database lookup
  const mockUsers = {
    'admin-123': {
      id: 'admin-123',
      email: 'admin@forten.com.uy',
      role: 'admin',
      status: 'active',
      firstName: 'Admin',
      lastName: 'FORTEN',
      buildings: [], // Admin has access to all buildings
      permissions: ['all']
    },
    'operator-456': {
      id: 'operator-456',
      email: 'operator@forten.com.uy',
      role: 'operator',
      status: 'active',
      firstName: 'Operador',
      lastName: 'Sistema',
      buildings: ['building-1', 'building-2'],
      permissions: ['view_alerts', 'manage_access', 'view_devices']
    },
    'security-789': {
      id: 'security-789',
      email: 'security@forten.com.uy',
      role: 'security',
      status: 'active',
      firstName: 'Jefe',
      lastName: 'Seguridad',
      buildings: ['building-1', 'building-3'],
      permissions: ['view_alerts', 'manage_security', 'view_access_logs']
    },
    'viewer-101': {
      id: 'viewer-101',
      email: 'viewer@forten.com.uy',
      role: 'viewer',
      status: 'active',
      firstName: 'Usuario',
      lastName: 'Visualizador',
      buildings: ['building-2'],
      permissions: ['view_alerts']
    }
  };
  
  return mockUsers[userId] || null;
}

/**
 * Extract user ID from JWT token without verification
 * Used for connection tracking
 */
const extractUserIdFromToken = (token) => {
  try {
    const payload = jwt.decode(token);
    return payload ? (payload.userId || payload.id) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Generate mock JWT token for testing
 */
const generateMockToken = (userId, role = 'operator', buildings = []) => {
  const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
  const payload = {
    userId,
    role,
    buildings,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  return jwt.sign(payload, jwtSecret);
};

/**
 * Connection logging middleware
 */
const logConnection = (socket, next) => {
  const connectionInfo = {
    socketId: socket.id,
    ipAddress: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    timestamp: new Date().toISOString(),
    userId: socket.user ? socket.user.id : 'anonymous'
  };
  
  console.log(`🔌 WebSocket connection: ${JSON.stringify(connectionInfo)}`);
  next();
};

/**
 * Rate limiting for WebSocket events
 */
const rateLimitSocketEvents = (maxEvents = 100, windowMs = 60000) => {
  const clients = new Map();
  
  return (socket, next) => {
    const clientId = socket.user ? socket.user.id : socket.handshake.address;
    const now = Date.now();
    
    if (!clients.has(clientId)) {
      clients.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const client = clients.get(clientId);
    
    if (now > client.resetTime) {
      client.count = 1;
      client.resetTime = now + windowMs;
      return next();
    }
    
    if (client.count >= maxEvents) {
      const error = new Error('Rate limit exceeded');
      error.code = 'RATE_LIMIT_EXCEEDED';
      return next(error);
    }
    
    client.count++;
    next();
  };
};

module.exports = {
  authenticateSocket,
  authorizeSocketAction,
  verifyBuildingAccess,
  getUserAccessibleBuildings,
  extractUserIdFromToken,
  generateMockToken,
  logConnection,
  rateLimitSocketEvents,
  getUserById
};