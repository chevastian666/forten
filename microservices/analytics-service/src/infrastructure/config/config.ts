import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  env: z.enum(['development', 'test', 'production']),
  server: z.object({
    port: z.number(),
    logLevel: z.enum(['error', 'warn', 'info', 'debug'])
  }),
  database: z.object({
    url: z.string(),
    pool: z.object({
      min: z.number(),
      max: z.number()
    }),
    timescale: z.object({
      enabled: z.boolean(),
      chunkInterval: z.string()
    })
  }),
  redis: z.object({
    url: z.string(),
    password: z.string().optional(),
    db: z.number()
  }),
  rabbitmq: z.object({
    url: z.string(),
    exchange: z.string(),
    queuePrefix: z.string()
  }),
  auth: z.object({
    jwtSecret: z.string(),
    jwtExpiresIn: z.string()
  }),
  storage: z.object({
    type: z.enum(['local', 's3']),
    path: z.string(),
    s3: z.object({
      bucket: z.string().optional(),
      region: z.string().optional(),
      accessKeyId: z.string().optional(),
      secretAccessKey: z.string().optional()
    })
  }),
  email: z.object({
    smtp: z.object({
      host: z.string(),
      port: z.number(),
      secure: z.boolean(),
      user: z.string().optional(),
      password: z.string().optional()
    }),
    from: z.string()
  }),
  etl: z.object({
    batchSize: z.number(),
    parallelWorkers: z.number(),
    errorThreshold: z.number()
  }),
  cache: z.object({
    ttl: z.object({
      short: z.number(),
      medium: z.number(),
      long: z.number()
    })
  }),
  cors: z.object({
    origins: z.array(z.string()),
    credentials: z.boolean()
  }),
  rateLimit: z.object({
    windowMs: z.number(),
    max: z.number()
  }),
  security: z.object({
    encryptionKey: z.string(),
    bcryptRounds: z.number()
  }),
  features: z.object({
    realTimeUpdates: z.boolean(),
    aiInsights: z.boolean(),
    advancedVisualizations: z.boolean()
  })
});

const loadConfig = () => {
  const config = {
    env: process.env.NODE_ENV || 'development',
    server: {
      port: parseInt(process.env.PORT || '3008'),
      logLevel: process.env.LOG_LEVEL || 'info'
    },
    database: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/forten_analytics',
      pool: {
        min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
        max: parseInt(process.env.DATABASE_POOL_MAX || '10')
      },
      timescale: {
        enabled: process.env.TIMESCALE_ENABLED === 'true',
        chunkInterval: process.env.TIMESCALE_CHUNK_INTERVAL || '1d'
      }
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '8')
    },
    rabbitmq: {
      url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      exchange: process.env.RABBITMQ_EXCHANGE || 'analytics_events',
      queuePrefix: process.env.RABBITMQ_QUEUE_PREFIX || 'analytics_'
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d'
    },
    storage: {
      type: process.env.STORAGE_TYPE as 'local' | 's3' || 'local',
      path: process.env.STORAGE_PATH || '/tmp/analytics/reports',
      s3: {
        bucket: process.env.AWS_S3_BUCKET,
        region: process.env.AWS_S3_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    },
    email: {
      smtp: {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD
      },
      from: process.env.EMAIL_FROM || 'analytics@forten-crm.com'
    },
    etl: {
      batchSize: parseInt(process.env.ETL_BATCH_SIZE || '1000'),
      parallelWorkers: parseInt(process.env.ETL_PARALLEL_WORKERS || '5'),
      errorThreshold: parseInt(process.env.ETL_ERROR_THRESHOLD || '100')
    },
    cache: {
      ttl: {
        short: parseInt(process.env.CACHE_TTL_SHORT || '300'),
        medium: parseInt(process.env.CACHE_TTL_MEDIUM || '3600'),
        long: parseInt(process.env.CACHE_TTL_LONG || '86400')
      }
    },
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: process.env.CORS_CREDENTIALS === 'true'
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
    },
    security: {
      encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-32chars!!',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10')
    },
    features: {
      realTimeUpdates: process.env.FEATURE_REAL_TIME_UPDATES === 'true',
      aiInsights: process.env.FEATURE_AI_INSIGHTS === 'true',
      advancedVisualizations: process.env.FEATURE_ADVANCED_VISUALIZATIONS === 'true'
    }
  };

  return configSchema.parse(config);
};

export const config = loadConfig();