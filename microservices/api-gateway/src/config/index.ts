import dotenv from 'dotenv';

dotenv.config();

export interface ServiceConfig {
  name: string;
  url: string;
  healthCheckPath: string;
  timeout?: number;
}

export interface Config {
  port: number;
  env: string;
  jwtSecret: string;
  services: ServiceConfig[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
  circuitBreaker: {
    timeout: number;
    errorThresholdPercentage: number;
    resetTimeout: number;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  
  services: [
    {
      name: 'auth',
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      healthCheckPath: '/health'
    },
    {
      name: 'user',
      url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
      healthCheckPath: '/health'
    },
    {
      name: 'crm',
      url: process.env.CRM_SERVICE_URL || 'http://localhost:3003',
      healthCheckPath: '/health'
    },
    {
      name: 'notification',
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
      healthCheckPath: '/health'
    },
    {
      name: 'audit',
      url: process.env.AUDIT_SERVICE_URL || 'http://localhost:3005',
      healthCheckPath: '/health'
    }
  ],
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
  },
  
  circuitBreaker: {
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '3000', 10),
    errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '50', 10),
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10)
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
};