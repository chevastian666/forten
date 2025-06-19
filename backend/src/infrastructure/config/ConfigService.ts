import dotenv from 'dotenv';

export interface AppConfig {
  port: number;
  env: string;
}

export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface SecurityConfig {
  bcryptRounds: number;
  corsOrigin: string;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  dialect: string;
  logging: boolean;
}

export interface Config {
  app: AppConfig;
  jwt: JwtConfig;
  security: SecurityConfig;
  rateLimit: RateLimitConfig;
  database: DatabaseConfig;
}

export class ConfigService {
  private static instance: ConfigService;
  private config: Config;

  private constructor() {
    // Load environment variables
    dotenv.config();
    
    // Initialize and validate configuration
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfiguration(): Config {
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

  private validateConfiguration(): void {
    const errors: string[] = [];

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

  public getConfig(): Config {
    return { ...this.config };
  }

  public get<K extends keyof Config>(key: K): Config[K] {
    return { ...this.config[key] };
  }

  public getAppConfig(): AppConfig {
    return { ...this.config.app };
  }

  public getJwtConfig(): JwtConfig {
    return { ...this.config.jwt };
  }

  public getSecurityConfig(): SecurityConfig {
    return { ...this.config.security };
  }

  public getRateLimitConfig(): RateLimitConfig {
    return { ...this.config.rateLimit };
  }

  public getDatabaseConfig(): DatabaseConfig {
    return { ...this.config.database };
  }

  public isProduction(): boolean {
    return this.config.app.env === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.app.env === 'development';
  }

  public isTest(): boolean {
    return this.config.app.env === 'test';
  }
}