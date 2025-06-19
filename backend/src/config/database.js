const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use SQLite for development if PostgreSQL is not available
const isDevelopment = process.env.NODE_ENV === 'development';
const usePostgreSQL = process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD;

const sequelize = usePostgreSQL ? 
  new Sequelize({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    logging: isDevelopment ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }) :
  new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: isDevelopment ? console.log : false
  });

module.exports = sequelize;