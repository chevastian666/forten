const { createClient } = require('redis');
require('dotenv').config();

let redisClient = null;

// Only create Redis client if Redis is available
if (process.env.REDIS_HOST || process.env.NODE_ENV === 'production') {
  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      },
      password: process.env.REDIS_PASSWORD || undefined
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
      console.log('Continuing without Redis...');
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });
  } catch (error) {
    console.log('Redis not available, continuing without it...');
  }
}

const connectRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.connect();
    } catch (error) {
      console.log('Redis connection failed, continuing without it...');
    }
  } else {
    console.log('Redis is disabled for this environment');
  }
};

module.exports = { redisClient, connectRedis };