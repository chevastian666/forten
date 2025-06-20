// Security Module Exports

export { TokenRotationService, TokenPair, TokenRotationOptions } from './TokenRotationService';
export { RateLimitManager, RateLimitConfig, RateLimitPreset } from './RateLimitManager';
export { AnomalyDetector, AnomalyEvent, AnomalyPattern, AnomalyDetectionConfig } from './AnomalyDetector';
export { EncryptionService, EncryptionConfig, EncryptedData } from './EncryptionService';
export { SecurityMiddleware, SecurityConfig } from './SecurityMiddleware';
export { APIKeyManager, APIKey, APIKeyUsage, APIKeyValidationResult } from './APIKeyManager';

// Re-export commonly used types
export { RefreshToken, RefreshTokenEntity, RevokeReason } from '../../domain/entities/RefreshToken';

// Factory function to create security infrastructure
import { Redis } from 'ioredis';
import { AuditLogger, AuditLoggerConfig } from '../logging/AuditLogger';
import { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';

export interface SecurityInfrastructureConfig {
  redis: Redis;
  masterKey: string;
  auditLoggerConfig: AuditLoggerConfig;
  refreshTokenRepository: IRefreshTokenRepository;
  jwtService: any; // Your JWT service
  tokenRotation?: Partial<TokenRotationOptions>;
  encryption?: Partial<EncryptionConfig>;
  security?: Partial<SecurityConfig>;
  anomalyDetection?: Partial<AnomalyDetectionConfig>;
}

export class SecurityInfrastructure {
  public readonly tokenRotation: TokenRotationService;
  public readonly rateLimiter: RateLimitManager;
  public readonly anomalyDetector: AnomalyDetector;
  public readonly encryption: EncryptionService;
  public readonly auditLogger: AuditLogger;
  public readonly apiKeyManager: APIKeyManager;
  public readonly securityMiddleware: SecurityMiddleware;

  constructor(config: SecurityInfrastructureConfig) {
    // Initialize audit logger
    this.auditLogger = new AuditLogger(config.auditLoggerConfig);

    // Initialize token rotation
    this.tokenRotation = new TokenRotationService(
      config.refreshTokenRepository,
      config.jwtService,
      config.tokenRotation
    );

    // Initialize rate limiter
    this.rateLimiter = new RateLimitManager(config.redis);

    // Initialize anomaly detector
    this.anomalyDetector = new AnomalyDetector(
      config.redis,
      config.anomalyDetection
    );

    // Initialize encryption
    this.encryption = new EncryptionService(
      config.masterKey,
      config.encryption
    );

    // Initialize API key manager
    this.apiKeyManager = new APIKeyManager(
      config.redis,
      this.encryption,
      this.auditLogger
    );

    // Initialize security middleware
    this.securityMiddleware = new SecurityMiddleware(
      this.rateLimiter,
      this.anomalyDetector,
      this.auditLogger,
      config.security
    );
  }

  // Helper method to apply all security middleware
  getMiddleware() {
    return {
      // Basic security headers
      headers: this.securityMiddleware.securityHeaders(),
      
      // All security middleware combined
      all: this.securityMiddleware.allSecurityMiddleware(),
      
      // Individual middleware
      csrf: this.securityMiddleware.csrfProtection(),
      nonce: this.securityMiddleware.nonceGenerator(),
      fingerprint: this.securityMiddleware.deviceFingerprint(),
      antiAutomation: this.securityMiddleware.antiAutomation(),
      ipValidation: this.securityMiddleware.ipValidation(),
      requestIntegrity: this.securityMiddleware.requestIntegrity(),
      securityLogger: this.securityMiddleware.securityEventLogger(),
      
      // Rate limiting presets
      rateLimit: {
        login: this.rateLimiter.get('login'),
        api: this.rateLimiter.get('api'),
        pins: this.rateLimiter.get('pins'),
        register: this.rateLimiter.get('register'),
        passwordReset: this.rateLimiter.get('passwordReset'),
        fileUpload: this.rateLimiter.get('fileUpload'),
        search: this.rateLimiter.get('search'),
        reports: this.rateLimiter.get('reports'),
        streaming: this.rateLimiter.get('streaming'),
        webhook: this.rateLimiter.get('webhook'),
        custom: (config: RateLimitConfig) => this.rateLimiter.custom(config),
        tiered: (preset: keyof RateLimitPreset) => this.rateLimiter.tiered(preset),
        adaptive: (preset: keyof RateLimitPreset) => this.rateLimiter.adaptive(preset)
      },
      
      // API key authentication
      apiKey: this.apiKeyManager.middleware(),
      
      // Ban check
      banCheck: this.rateLimiter.banCheck()
    };
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    // Cleanup expired tokens
    await this.tokenRotation.cleanupExpiredTokens();
    
    // Any other cleanup tasks
  }
}

// Utility functions for common security operations

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = require('bcryptjs');
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(password, hash);
}

export function generateSecureToken(length: number = 32): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('base64url');
}

export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  const crypto = require('crypto');
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  
  return otp;
}

export function sanitizeInput(input: string): string {
  // Basic HTML entity encoding
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Security headers configuration for different environments
export const securityHeadersConfig = {
  development: {
    contentSecurityPolicy: false, // Disable in development for hot reload
    crossOriginEmbedderPolicy: false
  },
  production: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }
};