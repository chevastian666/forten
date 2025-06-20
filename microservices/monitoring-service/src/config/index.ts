import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  app: {
    name: string;
    version: string;
    port: number;
    environment: string;
    corsOrigins: string[];
  };
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    maxConnections: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  hikCentral: {
    baseUrl: string;
    username: string;
    password: string;
    timeout: number;
  };
  qBox: {
    baseUrl: string;
    apiKey: string;
    timeout: number;
  };
  streaming: {
    streamDir: string;
    baseUrl: string;
    maxStreams: number;
    inactiveTimeoutMinutes: number;
  };
  websocket: {
    corsOrigins: string[];
    pingTimeout: number;
    pingInterval: number;
  };
  notification: {
    email: {
      service: string;
      apiKey: string;
      fromAddress: string;
    };
    sms: {
      service: string;
      apiKey: string;
      fromNumber: string;
    };
    push: {
      service: string;
      apiKey: string;
      appId: string;
    };
  };
  monitoring: {
    healthCheckInterval: number;
    cameraOfflineThreshold: number;
    deviceOfflineThreshold: number;
    alertRetryInterval: number;
    eventCleanupDays: number;
    alertCleanupDays: number;
  };
  logging: {
    level: string;
    file: string;
    maxSize: string;
    maxFiles: number;
  };
}

const config: Config = {
  app: {
    name: process.env.APP_NAME || 'monitoring-service',
    version: process.env.APP_VERSION || '1.0.0',
    port: parseInt(process.env.PORT || '3000'),
    environment: process.env.NODE_ENV || 'development',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'monitoring_db',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000')
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  hikCentral: {
    baseUrl: process.env.HIK_CENTRAL_BASE_URL || 'https://hikcentral.example.com',
    username: process.env.HIK_CENTRAL_USERNAME || 'admin',
    password: process.env.HIK_CENTRAL_PASSWORD || 'password',
    timeout: parseInt(process.env.HIK_CENTRAL_TIMEOUT || '30000')
  },
  qBox: {
    baseUrl: process.env.QBOX_BASE_URL || 'https://qbox.example.com',
    apiKey: process.env.QBOX_API_KEY || 'your-qbox-api-key',
    timeout: parseInt(process.env.QBOX_TIMEOUT || '30000')
  },
  streaming: {
    streamDir: process.env.STREAM_DIR || '/tmp/streams',
    baseUrl: process.env.STREAM_BASE_URL || 'http://localhost:3000',
    maxStreams: parseInt(process.env.MAX_STREAMS || '50'),
    inactiveTimeoutMinutes: parseInt(process.env.STREAM_INACTIVE_TIMEOUT || '30')
  },
  websocket: {
    corsOrigins: process.env.WS_CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000'),
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000')
  },
  notification: {
    email: {
      service: process.env.EMAIL_SERVICE || 'sendgrid',
      apiKey: process.env.EMAIL_API_KEY || 'your-email-api-key',
      fromAddress: process.env.EMAIL_FROM || 'noreply@example.com'
    },
    sms: {
      service: process.env.SMS_SERVICE || 'twilio',
      apiKey: process.env.SMS_API_KEY || 'your-sms-api-key',
      fromNumber: process.env.SMS_FROM || '+1234567890'
    },
    push: {
      service: process.env.PUSH_SERVICE || 'firebase',
      apiKey: process.env.PUSH_API_KEY || 'your-push-api-key',
      appId: process.env.PUSH_APP_ID || 'your-app-id'
    }
  },
  monitoring: {
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000'), // 1 minute
    cameraOfflineThreshold: parseInt(process.env.CAMERA_OFFLINE_THRESHOLD || '5'), // 5 minutes
    deviceOfflineThreshold: parseInt(process.env.DEVICE_OFFLINE_THRESHOLD || '10'), // 10 minutes
    alertRetryInterval: parseInt(process.env.ALERT_RETRY_INTERVAL || '300000'), // 5 minutes
    eventCleanupDays: parseInt(process.env.EVENT_CLEANUP_DAYS || '90'),
    alertCleanupDays: parseInt(process.env.ALERT_CLEANUP_DAYS || '30')
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/monitoring-service.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5')
  }
};

export default config;