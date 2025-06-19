const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Access = sequelize.define('Access', {
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
  pin: {
    type: DataTypes.STRING(6),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING
  },
  type: {
    type: DataTypes.ENUM('visitor', 'temporary', 'service', 'emergency'),
    defaultValue: 'visitor'
  },
  validFrom: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  validUntil: {
    type: DataTypes.DATE,
    allowNull: false
  },
  maxUses: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  currentUses: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['pin'],
      unique: true
    },
    {
      fields: ['buildingId', 'isActive']
    }
  ]
});

Access.prototype.isValid = function() {
  const now = new Date();
  return this.isActive && 
         now >= this.validFrom && 
         now <= this.validUntil && 
         this.currentUses < this.maxUses;
};

module.exports = Access;