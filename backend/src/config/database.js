/**
 * Optimized PostgreSQL Connection Pool
 * Environment-based configuration with health checks and auto-reconnection
 */

const { Sequelize } = require('sequelize');
const { logger } = require('./logger');

// Environment-based pool configuration
const getPoolConfig = (env) => {
  const configs = {
    development: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 10000,
      evict: 1000,
      handleDisconnects: true
    },
    staging: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
      evict: 1000,
      handleDisconnects: true
    },
    production: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000,
      evict: 1000,
      handleDisconnects: true
    },
    test: {
      max: 3,
      min: 1,
      acquire: 30000,
      idle: 10000,
      evict: 1000,
      handleDisconnects: true
    }
  };
  
  return configs[env] || configs.development;
};

// Database configuration
const env = process.env.NODE_ENV || 'development';
const poolConfig = getPoolConfig(env);

const dbConfig = {
  database: process.env.DB_NAME || 'forten_crm',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: env === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: poolConfig.max,
    min: poolConfig.min,
    acquire: poolConfig.acquire,
    idle: poolConfig.idle,
    evict: poolConfig.evict,
    handleDisconnects: poolConfig.handleDisconnects
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  },
  dialectOptions: {
    // Connection timeout
    connectTimeout: 60000,
    // Socket timeout
    socketTimeout: 60000,
    // SSL configuration for production
    ...(env === 'production' && {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    })
  },
  // Retry configuration
  retry: {
    max: 3,
    timeout: 30000,
    backoffBase: 1000,
    backoffExponent: 2
  },
  // Query timeout
  benchmark: true,
  minifyAliases: true
};

// Create Sequelize instance with optimized configuration
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

// Connection health monitoring
class DatabaseHealthMonitor {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.isHealthy = false;
    this.lastHealthCheck = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000; // 5 seconds
    this.healthCheckInterval = 30000; // 30 seconds
    
    this.startHealthMonitoring();
  }

  async checkHealth() {
    try {
      await this.sequelize.authenticate();
      
      // Test with a simple query
      await this.sequelize.query('SELECT 1 as health_check');
      
      this.isHealthy = true;
      this.lastHealthCheck = new Date();
      this.reconnectAttempts = 0;
      
      return {
        status: 'healthy',
        timestamp: this.lastHealthCheck,
        connectionCount: this.getConnectionStats()
      };
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = new Date();
      
      logger.error('Database health check failed', {
        error: error.message,
        reconnectAttempts: this.reconnectAttempts
      });
      
      // Attempt reconnection if not at max attempts
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.attemptReconnection(), this.reconnectInterval);
      }
      
      return {
        status: 'unhealthy',
        timestamp: this.lastHealthCheck,
        error: error.message,
        reconnectAttempts: this.reconnectAttempts
      };
    }
  }

  async attemptReconnection() {
    this.reconnectAttempts++;
    
    logger.info('Attempting database reconnection', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    });
    
    try {
      // Close existing connections
      await this.sequelize.close();
      
      // Create new connection
      await this.sequelize.authenticate();
      
      logger.info('Database reconnection successful', {
        attempt: this.reconnectAttempts
      });
      
      this.isHealthy = true;
      this.reconnectAttempts = 0;
    } catch (error) {
      logger.error('Database reconnection failed', {
        attempt: this.reconnectAttempts,
        error: error.message
      });
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.attemptReconnection(), this.reconnectInterval * this.reconnectAttempts);
      } else {
        logger.error('Max reconnection attempts reached, database unavailable');
      }
    }
  }

  getConnectionStats() {
    const pool = this.sequelize.connectionManager.pool;
    if (pool) {
      return {
        total: pool.size,
        active: pool.borrowed,
        idle: pool.available,
        pending: pool.pending,
        max: pool.max,
        min: pool.min
      };
    }
    return null;
  }

  startHealthMonitoring() {
    // Initial health check
    this.checkHealth();
    
    // Periodic health checks
    setInterval(() => {
      this.checkHealth();
    }, this.healthCheckInterval);
    
    logger.info('Database health monitoring started', {
      interval: this.healthCheckInterval,
      environment: env,
      poolConfig: poolConfig
    });
  }

  getStatus() {
    return {
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      reconnectAttempts: this.reconnectAttempts,
      connectionStats: this.getConnectionStats(),
      poolConfig: poolConfig,
      environment: env
    };
  }
}

// Initialize health monitor
const healthMonitor = new DatabaseHealthMonitor(sequelize);

// Enhanced connection hooks
sequelize.addHook('beforeConnect', (config) => {
  logger.debug('Establishing database connection', {
    host: config.host,
    database: config.database,
    environment: env
  });
});

sequelize.addHook('afterConnect', (connection, config) => {
  logger.info('Database connection established', {
    host: config.host,
    database: config.database,
    environment: env,
    connectionStats: healthMonitor.getConnectionStats()
  });
});

sequelize.addHook('beforeDisconnect', (connection) => {
  logger.info('Database connection closing');
});

sequelize.addHook('afterDisconnect', (connection) => {
  logger.warn('Database connection closed');
});

// Global error handlers
sequelize.addHook('beforeQuery', (options) => {
  if (env === 'development') {
    logger.debug('Executing query', {
      sql: options.sql?.substring(0, 100) + '...',
      type: options.type
    });
  }
});

// Handle connection errors
process.on('SIGINT', async () => {
  logger.info('Gracefully closing database connections...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Gracefully closing database connections...');
  await sequelize.close();
  process.exit(0);
});

// Export enhanced sequelize with health monitoring
sequelize.healthMonitor = healthMonitor;

// Initial connection test
sequelize.authenticate()
  .then(() => {
    logger.info('Database connection pool initialized successfully', {
      environment: env,
      poolConfig: poolConfig,
      database: dbConfig.database,
      host: dbConfig.host
    });
  })
  .catch(err => {
    logger.error('Failed to initialize database connection pool', {
      error: err.message,
      environment: env,
      database: dbConfig.database,
      host: dbConfig.host
    });
  });

module.exports = sequelize;