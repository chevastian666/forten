/**
 * Sequelize Database Connection
 * Initializes Sequelize with PostgreSQL
 */

const { Sequelize } = require('sequelize');
const config = require('./database.config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance with PostgreSQL
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: dbConfig.define,
    dialectOptions: dbConfig.dialectOptions || {}
  }
);

// Test the connection
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection established successfully.');
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err);
  });

module.exports = sequelize;