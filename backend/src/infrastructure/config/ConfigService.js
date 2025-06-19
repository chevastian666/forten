// JavaScript wrapper for ConfigService
require('dotenv').config();

class ConfigService {
  static instance = null;

  constructor() {
    if (ConfigService.instance) {
      return ConfigService.instance;
    }

    // Initialize and validate configuration
    this.config = this.loadConfiguration();
    this.validateConfiguration();
    
    ConfigService.instance = this;
  }

  static getInstance() {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  loadConfiguration() {
    return {
      app: {
        port: parseInt(process.env.PORT || '3001', 10),
        env: process.env.NODE_ENV || 'development'
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'default-secret',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
        expiresIn: process.env.JWT_EXPIRE || '1h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
      },
      security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
        message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP'
      },
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'forten_crm',
        dialect: process.env.DB_DIALECT || 'sqlite',
        logging: process.env.DB_LOGGING === 'true'
      }
    };
  }

  validateConfiguration() {
    const errors = [];

    // Validate JWT configuration
    if (this.config.app.env === 'production') {
      if (this.config.jwt.secret === 'default-secret') {
        errors.push('JWT_SECRET must be set in production environment');
      }
      if (this.config.jwt.refreshSecret === 'default-refresh-secret') {
        errors.push('JWT_REFRESH_SECRET must be set in production environment');
      }
    }

    // Validate port
    if (isNaN(this.config.app.port) || this.config.app.port < 1 || this.config.app.port > 65535) {
      errors.push('PORT must be a valid number between 1 and 65535');
    }

    // Validate bcrypt rounds
    if (isNaN(this.config.security.bcryptRounds) || this.config.security.bcryptRounds < 1) {
      errors.push('BCRYPT_ROUNDS must be a positive number');
    }

    // Validate rate limit configuration
    if (isNaN(this.config.rateLimit.windowMs) || this.config.rateLimit.windowMs < 1) {
      errors.push('RATE_LIMIT_WINDOW_MS must be a positive number');
    }
    if (isNaN(this.config.rateLimit.max) || this.config.rateLimit.max < 1) {
      errors.push('RATE_LIMIT_MAX must be a positive number');
    }

    // Throw error if validation fails
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  getConfig() {
    return { ...this.config };
  }

  get(key) {
    return { ...this.config[key] };
  }

  getAppConfig() {
    return { ...this.config.app };
  }

  getJwtConfig() {
    return { ...this.config.jwt };
  }

  getSecurityConfig() {
    return { ...this.config.security };
  }

  getRateLimitConfig() {
    return { ...this.config.rateLimit };
  }

  getDatabaseConfig() {
    return { ...this.config.database };
  }

  isProduction() {
    return this.config.app.env === 'production';
  }

  isDevelopment() {
    return this.config.app.env === 'development';
  }

  isTest() {
    return this.config.app.env === 'test';
  }
}

module.exports = { ConfigService };