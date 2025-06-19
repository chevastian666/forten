import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { ConfigService } from '../config/ConfigService';

export class SecurityMiddleware {
  private configService: ConfigService;

  constructor() {
    this.configService = ConfigService.getInstance();
  }

  // Helmet middleware for security headers
  helmet() {
    return helmet({
      contentSecurityPolicy: this.configService.isProduction() ? undefined : false,
      crossOriginEmbedderPolicy: !this.configService.isDevelopment()
    });
  }

  // CORS middleware
  cors() {
    const securityConfig = this.configService.getSecurityConfig();
    
    return cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if the origin is allowed
        const allowedOrigins = securityConfig.corsOrigin.split(',').map(o => o.trim());
        
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page']
    });
  }

  // Rate limiting middleware
  rateLimit(options?: Partial<rateLimit.Options>) {
    const rateLimitConfig = this.configService.getRateLimitConfig();
    
    return rateLimit({
      windowMs: rateLimitConfig.windowMs,
      max: rateLimitConfig.max,
      message: rateLimitConfig.message,
      standardHeaders: true,
      legacyHeaders: false,
      ...options
    });
  }

  // API-specific rate limiter (stricter)
  apiRateLimit() {
    return this.rateLimit({
      max: 50, // Stricter limit for API endpoints
      message: 'Too many API requests from this IP'
    });
  }

  // Auth endpoint rate limiter (even stricter)
  authRateLimit() {
    return this.rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Only 5 auth attempts per window
      message: 'Too many authentication attempts from this IP',
      skipSuccessfulRequests: true
    });
  }
}

// Factory function
export function createSecurityMiddleware(): SecurityMiddleware {
  return new SecurityMiddleware();
}