const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Test database configuration
const testDbPath = path.join(__dirname, '../../test.sqlite');

// Create test database instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: testDbPath,
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  }
});

// Import models
const models = require('../../src/models');

// Initialize models with test database
models.sequelize = sequelize;
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Test setup and teardown functions
const setupTestDatabase = async () => {
  try {
    // Force sync to create tables
    await sequelize.sync({ force: true });
    
    // Create default admin user for tests
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await models.User.create({
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Test Admin',
      role: 'admin',
      isActive: true
    });
    
    // Create test building
    const building = await models.Building.create({
      name: 'Test Building',
      address: '123 Test St',
      city: 'Test City',
      state: 'TC',
      zipCode: '12345',
      phone: '1234567890',
      email: 'building@test.com',
      isActive: true
    });
    
    return { building };
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
};

const teardownTestDatabase = async () => {
  try {
    // Close connection
    await sequelize.close();
    
    // Remove test database file
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  } catch (error) {
    console.error('Error tearing down test database:', error);
    throw error;
  }
};

const clearDatabase = async () => {
  try {
    // Clear all tables except User (keep admin user)
    await models.Access.destroy({ where: {} });
    await models.Event.destroy({ where: {} });
    await models.Building.destroy({ where: { name: { [models.Sequelize.Op.ne]: 'Test Building' } } });
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  models,
  setupTestDatabase,
  teardownTestDatabase,
  clearDatabase
};