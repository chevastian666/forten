import { Application, RequestHandler } from 'express';
import { AuthenticationMiddleware, createAuthenticationMiddleware } from './AuthenticationMiddleware';
import { ErrorHandlingMiddleware, createErrorHandlingMiddleware } from './ErrorHandlingMiddleware';
import { SecurityMiddleware, createSecurityMiddleware } from './SecurityMiddleware';
import { LoggingMiddleware, createLoggingMiddleware } from './LoggingMiddleware';
import express from 'express';

export class MiddlewareRegistry {
  private authMiddleware: AuthenticationMiddleware;
  private errorMiddleware: ErrorHandlingMiddleware;
  private securityMiddleware: SecurityMiddleware;
  private loggingMiddleware: LoggingMiddleware;

  constructor(container: any) {
    this.authMiddleware = createAuthenticationMiddleware(container);
    this.errorMiddleware = createErrorHandlingMiddleware();
    this.securityMiddleware = createSecurityMiddleware();
    this.loggingMiddleware = createLoggingMiddleware();
  }

  // Register all pre-route middleware
  registerPreRouteMiddleware(app: Application): void {
    // Security middleware
    app.use(this.securityMiddleware.helmet());
    app.use(this.securityMiddleware.cors());
    
    // Logging middleware
    app.use(this.loggingMiddleware.responseTime());
    app.use(this.loggingMiddleware.morgan());
    app.use(this.loggingMiddleware.requestLogger());
    
    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // General rate limiting for API routes
    app.use('/api/', this.securityMiddleware.rateLimit());
  }

  // Register all post-route middleware
  registerPostRouteMiddleware(app: Application): void {
    // 404 handler
    app.use(this.errorMiddleware.notFound);
    
    // Error handling (must be last)
    app.use(this.errorMiddleware.handle);
  }

  // Get authentication middleware
  getAuthMiddleware(): AuthenticationMiddleware {
    return this.authMiddleware;
  }

  // Get error handling middleware
  getErrorMiddleware(): ErrorHandlingMiddleware {
    return this.errorMiddleware;
  }

  // Get security middleware
  getSecurityMiddleware(): SecurityMiddleware {
    return this.securityMiddleware;
  }

  // Get logging middleware
  getLoggingMiddleware(): LoggingMiddleware {
    return this.loggingMiddleware;
  }

  // Convenience methods for common middleware combinations
  authenticateAndAuthorize(...roles: string[]): RequestHandler[] {
    return [
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize(...roles)
    ];
  }

  // Auth endpoints specific middleware
  authEndpointMiddleware(): RequestHandler[] {
    return [
      this.securityMiddleware.authRateLimit()
    ];
  }

  // API endpoint middleware
  apiEndpointMiddleware(): RequestHandler[] {
    return [
      this.securityMiddleware.apiRateLimit()
    ];
  }
}

// Factory function
export function createMiddlewareRegistry(container: any): MiddlewareRegistry {
  return new MiddlewareRegistry(container);
}