require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3006',
  credentials: true
}));
app.use(express.json());

// SQLite Database Setup
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false
});

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  role: {
    type: DataTypes.STRING,
    defaultValue: 'operator'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Building Model
const Building = sequelize.define('Building', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: DataTypes.STRING,
  address: DataTypes.STRING,
  city: DataTypes.STRING,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },
  totalUnits: DataTypes.INTEGER,
  totalCameras: DataTypes.INTEGER,
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Event Model
const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  buildingId: DataTypes.INTEGER,
  type: DataTypes.STRING,
  priority: DataTypes.STRING,
  title: DataTypes.STRING,
  description: DataTypes.TEXT,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  resolvedAt: DataTypes.DATE,
  resolvedBy: DataTypes.INTEGER
});

// Access Model
const Access = sequelize.define('Access', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  buildingId: DataTypes.INTEGER,
  visitorName: DataTypes.STRING,
  visitorDocument: DataTypes.STRING,
  unitNumber: DataTypes.STRING,
  pin: DataTypes.STRING,
  validFrom: DataTypes.DATE,
  validUntil: DataTypes.DATE,
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  usedAt: DataTypes.DATE
});

// Associations
Building.hasMany(Event, { foreignKey: 'buildingId' });
Event.belongsTo(Building, { foreignKey: 'buildingId' });

Building.hasMany(Access, { foreignKey: 'buildingId' });
Access.belongsTo(Building, { foreignKey: 'buildingId' });

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'forten_secret_key_dev_2024',
      { expiresIn: '24h' }
    );
    
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'forten_refresh_secret_dev_2024',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      accessToken: token,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Middleware for authentication
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'forten_secret_key_dev_2024');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Protected Routes
app.get('/api/auth/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'role']
    });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Buildings Routes
app.get('/api/buildings', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = { isActive: true };
    if (status) {
      whereClause.status = status;
    }
    
    const { count, rows: buildings } = await Building.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ 
      success: true, 
      buildings,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/buildings', authenticate, async (req, res) => {
  try {
    const building = await Building.create(req.body);
    res.json({ success: true, data: building });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Events Routes
app.get('/api/events', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, buildingId, type, priority } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (buildingId) whereClause.buildingId = buildingId;
    if (type) whereClause.type = type;
    if (priority) whereClause.priority = priority;
    
    const { count, rows: events } = await Event.findAndCountAll({
      where: whereClause,
      include: [{ model: Building, attributes: ['name'] }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ 
      success: true, 
      events,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Event Stats Route
app.get('/api/events/stats', authenticate, async (req, res) => {
  try {
    const { buildingId } = req.query;
    const whereClause = buildingId ? { buildingId } : {};
    
    // Calculate today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [totalEvents, todayEvents, unresolvedEvents] = await Promise.all([
      Event.count({ where: whereClause }),
      Event.count({ 
        where: { 
          ...whereClause,
          createdAt: {
            [require('sequelize').Op.gte]: today,
            [require('sequelize').Op.lt]: tomorrow
          }
        }
      }),
      Event.count({ 
        where: { 
          ...whereClause,
          status: 'pending'
        }
      })
    ]);
    
    // Get events by type
    const eventsByType = await Event.findAll({
      where: whereClause,
      attributes: [
        'type',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['type']
    });
    
    const eventsByTypeObj = {};
    eventsByType.forEach(item => {
      eventsByTypeObj[item.type] = parseInt(item.dataValues.count);
    });
    
    res.json({
      success: true,
      totalEvents,
      todayEvents,
      unresolvedEvents,
      eventsByType: eventsByTypeObj
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/events', authenticate, async (req, res) => {
  try {
    const event = await Event.create(req.body);
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Access Routes
app.get('/api/access', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, buildingId } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (buildingId) whereClause.buildingId = buildingId;
    
    const { count, rows: accesses } = await Access.findAndCountAll({
      where: whereClause,
      include: [{ model: Building, attributes: ['name'] }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ 
      success: true, 
      accesses,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/access', authenticate, async (req, res) => {
  try {
    // Generate random 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const access = await Access.create({ ...req.body, pin });
    res.json({ success: true, data: access });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Logout
app.post('/api/auth/logout', authenticate, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Dashboard metrics
app.get('/api/dashboard/metrics', authenticate, async (req, res) => {
  try {
    const totalBuildings = await Building.count({ where: { isActive: true } });
    const totalEvents = await Event.count();
    const pendingEvents = await Event.count({ where: { status: 'pending' } });
    const totalAccesses = await Access.count();
    
    res.json({
      success: true,
      data: {
        totalBuildings,
        totalEvents,
        pendingEvents,
        totalAccesses,
        activeUsers: 5, // Mock data
        onlineDevices: 12 // Mock data
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Initialize database and start server
async function start() {
  try {
    await sequelize.sync();
    console.log('✅ SQLite database connected');
    
    app.listen(PORT, () => {
      console.log(`
🚀 FORTEN Backend Server Running
================================
📍 Server: http://localhost:${PORT}
📍 API Base: http://localhost:${PORT}/api
🗄️  Database: SQLite
🔐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3006'}

Available endpoints:
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/profile
- GET  /api/buildings
- POST /api/buildings
- GET  /api/events
- POST /api/events
- GET  /api/access
- POST /api/access
- GET  /api/dashboard/metrics

✅ Server is ready!
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();