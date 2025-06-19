const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  buildingId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Buildings',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM(
      'door_open',
      'door_close',
      'visitor_call',
      'resident_call',
      'access_granted',
      'access_denied',
      'camera_view',
      'alarm',
      'maintenance',
      'system'
    ),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'low'
  },
  resolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resolvedAt: {
    type: DataTypes.DATE
  },
  resolvedBy: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['buildingId', 'createdAt']
    },
    {
      fields: ['type']
    },
    {
      fields: ['severity', 'resolved']
    }
  ]
});

module.exports = Event;