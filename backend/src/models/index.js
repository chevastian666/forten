/**
 * Models Index
 * Initializes all models and sets up associations
 */

const sequelize = require('../config/database');
const { Sequelize } = require('sequelize');
const User = require('./User');
const AuditLog = require('./AuditLog');

// Import PIN model
const Pin = require('./pin.model')(sequelize, Sequelize.DataTypes);

// Import Webhook models
const Webhook = require('./Webhook');
const WebhookDelivery = require('./WebhookDelivery');

// Import Statistics models
const DailyStatistics = require('./DailyStatistics');
const WeeklyStatistics = require('./WeeklyStatistics');
const MonthlyStatistics = require('./MonthlyStatistics');

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
  AuditLog,
  Pin,
  Webhook,
  WebhookDelivery,
  DailyStatistics,
  WeeklyStatistics,
  MonthlyStatistics
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

// PIN associations
User.hasMany(Pin, {
  foreignKey: 'user_id',
  as: 'pins'
});

Pin.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Initialize PIN service with model
const PinService = require('../services/pin.service');
PinService.initialize(Pin);

// Webhook associations
Webhook.hasMany(WebhookDelivery, {
  foreignKey: 'webhook_id',
  as: 'deliveries'
});

// WebhookDelivery.belongsTo association is handled in WebhookDelivery.associate method

// Set up webhook associations if they have associate methods
if (Webhook.associate) {
  Webhook.associate(models);
}

if (WebhookDelivery.associate) {
  WebhookDelivery.associate(models);
}


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