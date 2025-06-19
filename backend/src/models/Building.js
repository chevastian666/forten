const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Building = sequelize.define('Building', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: 'Uruguay'
  },
  postalCode: {
    type: DataTypes.STRING
  },
  phone: {
    type: DataTypes.STRING
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  status: {
    type: DataTypes.ENUM('prospect', 'quoting', 'contract', 'active', 'inactive'),
    defaultValue: 'prospect'
  },
  contractDate: {
    type: DataTypes.DATE
  },
  installationDate: {
    type: DataTypes.DATE
  },
  totalUnits: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalCameras: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  qboxSerial: {
    type: DataTypes.STRING
  },
  hikCentralId: {
    type: DataTypes.STRING
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  timestamps: true
});

module.exports = Building;