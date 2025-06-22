/**
 * Redis Configuration
 * Using ioredis client for better performance and features
 */

const Redis = require('ioredis');
require('dotenv').config();

let redisClient = null;
let isConnected = false;

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  
  // Connection options
  connectTimeout: 10000,
  lazyConnect: true,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  
  // Reconnection strategy
  retryDelayOnError: (error) => {
    console.error('Redis connection error:', error.message);
    return Math.min(error.attempt * 100, 3000);
  },
  
  // Pool settings for better performance
  family: 4,
  keepAlive: true,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'forten:',
};

/**
 * Initialize Redis connection
 * @returns {Promise<Redis|null>} Redis client instance or null if failed
 */
const initializeRedis = async () => {
  // Skip Redis in test environment unless explicitly enabled
  if (process.env.NODE_ENV === 'test' && !process.env.REDIS_ENABLED) {
    console.log('Redis disabled in test environment');
    return null;
  }

  try {
    redisClient = new Redis(redisConfig);

    // Event listeners
    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      isConnected = true;
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis ready for operations');
    });

    redisClient.on('error', (error) => {
      console.error('❌ Redis error:', error.message);
      isConnected = false;
    });

    redisClient.on('close', () => {
      console.log('⚠️  Redis connection closed');
      isConnected = false;
    });

    redisClient.on('reconnecting', (time) => {
      console.log(`🔄 Redis reconnecting in ${time}ms`);
    });

    // Test connection
    await redisClient.ping();
    console.log('✅ Redis ping successful');

    return redisClient;
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error.message);
    console.log('⚠️  Continuing without Redis cache...');
    redisClient = null;
    return null;
  }
};

/**
 * Get Redis client instance
 * @returns {Redis|null} Redis client or null if not available
 */
const getRedisClient = () => {
  return redisClient;
};

/**
 * Check if Redis is connected and available
 * @returns {boolean} Connection status
 */
const isRedisAvailable = () => {
  return redisClient !== null && isConnected;
};

/**
 * Gracefully close Redis connection
 * @returns {Promise<void>}
 */
const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('✅ Redis connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing Redis:', error.message);
    }
  }
};

/**
 * Redis health check
 * @returns {Promise<boolean>} Health status
 */
const healthCheck = async () => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error.message);
    return false;
  }
};

/**
 * Get Redis connection info
 * @returns {Object} Connection information
 */
const getConnectionInfo = () => {
  return {
    host: redisConfig.host,
    port: redisConfig.port,
    db: redisConfig.db,
    keyPrefix: redisConfig.keyPrefix,
    isConnected: isConnected,
    isAvailable: isRedisAvailable()
  };
};

module.exports = {
  initializeRedis,
  getRedisClient,
  isRedisAvailable,
  closeRedis,
  healthCheck,
  getConnectionInfo,
  redisConfig
};