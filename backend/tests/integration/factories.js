const { v4: uuidv4 } = require('uuid');

// User factory
const createUser = (overrides = {}) => ({
  email: `user-${Date.now()}@test.com`,
  password: 'password123',
  name: 'Test User',
  role: 'operator',
  isActive: true,
  ...overrides
});

// Building factory
const createBuilding = (overrides = {}) => ({
  name: `Building ${Date.now()}`,
  address: '456 Test Ave',
  city: 'Test City',
  state: 'TC',
  zipCode: '54321',
  phone: '9876543210',
  email: `building-${Date.now()}@test.com`,
  isActive: true,
  ...overrides
});

// Event factory
const createEvent = (buildingId, overrides = {}) => ({
  buildingId,
  type: 'door_open',
  description: 'Test event description',
  severity: 'low',
  metadata: {},
  resolved: false,
  ...overrides
});

// Access factory
const createAccess = (buildingId, overrides = {}) => {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7); // Valid for 7 days
  
  return {
    buildingId,
    name: `Visitor ${Date.now()}`,
    phone: '+1234567890',
    type: 'visitor',
    validUntil: validUntil.toISOString(),
    maxUses: 5,
    usedCount: 0,
    isActive: true,
    notes: 'Test access',
    ...overrides
  };
};

// Generate random PIN
const generatePin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Auth token factory
const createAuthTokens = () => {
  const jwt = require('jsonwebtoken');
  const user = {
    id: uuidv4(),
    email: 'test@test.com',
    role: 'admin'
  };
  
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '7d' }
  );
  
  return { user, accessToken, refreshToken };
};

module.exports = {
  createUser,
  createBuilding,
  createEvent,
  createAccess,
  generatePin,
  createAuthTokens
};