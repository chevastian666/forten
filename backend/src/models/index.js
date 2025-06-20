/**
 * Models Index
 * Initializes all models and sets up associations
 */

const sequelize = require('../config/database');
const User = require('./User');
const AuditLog = require('./AuditLog');

// Import other models if they exist
let Building, Event, Access;
try {
  Building = require('./Building');
  Event = require('./Event');
  Access = require('./Access');
} catch (error) {
  // Models don't exist yet
  console.log('Some models not found, skipping...');
}

// Initialize models object
const models = {
  User,
  AuditLog
};

// Add other models if they exist
if (Building) models.Building = Building;
if (Event) models.Event = Event;
if (Access) models.Access = Access;

// Set up associations
// User <-> AuditLog
User.hasMany(AuditLog, {
  foreignKey: 'user_id',
  as: 'audit_logs'
});

AuditLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Existing associations (if models exist)
if (Building && Event) {
  Building.hasMany(Event, { foreignKey: 'buildingId' });
  Event.belongsTo(Building, { foreignKey: 'buildingId' });
}

if (User && Event) {
  User.hasMany(Event, { foreignKey: 'userId' });
  Event.belongsTo(User, { foreignKey: 'userId' });
}

if (Building && Access) {
  Building.hasMany(Access, { foreignKey: 'buildingId' });
  Access.belongsTo(Building, { foreignKey: 'buildingId' });
}

if (User && Access) {
  User.hasMany(Access, { foreignKey: 'createdBy' });
  Access.belongsTo(User, { foreignKey: 'createdBy' });
}

// Add sequelize instance to models
models.sequelize = sequelize;
models.Sequelize = require('sequelize');

module.exports = models;