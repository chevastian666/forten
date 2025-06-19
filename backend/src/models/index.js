const sequelize = require('../config/database');
const User = require('./User');
const Building = require('./Building');
const Event = require('./Event');
const Access = require('./Access');

// Relaciones
Building.hasMany(Event, { foreignKey: 'buildingId' });
Event.belongsTo(Building, { foreignKey: 'buildingId' });

User.hasMany(Event, { foreignKey: 'userId' });
Event.belongsTo(User, { foreignKey: 'userId' });

Building.hasMany(Access, { foreignKey: 'buildingId' });
Access.belongsTo(Building, { foreignKey: 'buildingId' });

User.hasMany(Access, { foreignKey: 'createdBy' });
Access.belongsTo(User, { foreignKey: 'createdBy' });

module.exports = {
  sequelize,
  User,
  Building,
  Event,
  Access
};