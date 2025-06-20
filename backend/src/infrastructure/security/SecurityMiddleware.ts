import { Request, Response, NextFunction, RequestHandler } from 'express';
import helmet from 'helmet';
import crypto from 'crypto';
import { RateLimitManager } from './RateLimitManager';
import { AnomalyDetector } from './AnomalyDetector';
import { AuditLogger } from '../logging/AuditLogger';

export interface SecurityConfig {
  enableCSRF?: boolean;
  csrfCookieName?: string;
  csrfHeaderName?: string;
  enableNonce?: boolean;
  enableFingerprint?: boolean;
  enableAntiAutomation?: boolean;
  trustedProxies?: string[];
  securityHeaders?: boolean;
}

export class SecurityMiddleware {
  private readonly config: Required<SecurityConfig>;
  
  constructor(
    private readonly rateLimiter: RateLimitManager,
    private readonly anomalyDetector: AnomalyDetector,
    private readonly auditLogger: AuditLogger,
    config?: SecurityConfig
  ) {
    this.config = {
      enableCSRF: config?.enableCSRF ?? true,
      csrfCookieName: config?.csrfCookieName || '_csrf',
      csrfHeaderName: config?.csrfHeaderName || 'x-csrf-token',
      enableNonce: config?.enableNonce ?? true,
      enableFingerprint: config?.enableFingerprint ?? true,
      enableAntiAutomation: config?.enableAntiAutomation ?? true,
      trustedProxies: config?.trustedProxies || [],
      securityHeaders: config?.securityHeaders ?? true
    };
  }

  // Comprehensive security headers
  securityHeaders(): RequestHandler {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", (req: Request, res: Response) => {
            return `'nonce-${res.locals.nonce}'`;
          }],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'https:'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          childSrc: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          upgradeInsecureRequests: [],
          blockAllMixedContent: [],
          requireTrustedTypesFor: ["'script'"]
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true
    });
  }

  // CSRF Protection
  csrfProtection(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableCSRF) {
        return next();
      }

      // Skip CSRF for safe methods and API endpoints that use JWT
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path.startsWith('/api/')) {
        return next();
      }

      // Generate CSRF token if not exists
      if (!req.session?.csrfToken) {
        req.session.csrfToken = this.generateCSRFToken();
      }

      // Set CSRF cookie
      res.cookie(this.config.csrfCookieName, req.session.csrfToken, {
        httpOnly: false, // Must be readable by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      // Verify CSRF token
      const token = req.headers[this.config.csrfHeaderName] || req.body._csrf;
      
      if (!token || !this.verifyCSRFToken(token as string, req.session.csrfToken)) {
        return res.status(403).json({
          error: 'Invalid CSRF token',
          message: 'Cross-site request forgery detected'
        });
      }

      next();
    };
  }

  // Nonce generation for CSP
  nonceGenerator(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      if (this.config.enableNonce) {
        res.locals.nonce = crypto.randomBytes(16).toString('base64');
      }
      next();
    };
  }

  // Device fingerprinting
  deviceFingerprint(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableFingerprint) {
        return next();
      }

      const fingerprint = this.generateFingerprint(req);
      req.deviceFingerprint = fingerprint;

      // Verify fingerprint if session exists
      if (req.session?.deviceFingerprint) {
        if (req.session.deviceFingerprint !== fingerprint) {
          // Device changed - possible session hijacking
          this.anomalyDetector.trackEvent({
            userId: (req as any).user?.id,
            ipAddress: this.getClientIP(req),
            userAgent: req.headers['user-agent'],
            eventType: 'session_mismatch',
            timestamp: new Date(),
            metadata: {
              oldFingerprint: req.session.deviceFingerprint,
              newFingerprint: fingerprint
            }
          });
        }
      } else if (req.session) {
        req.session.deviceFingerprint = fingerprint;
      }

      next();
    };
  }

  // Anti-automation detection
  antiAutomation(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableAntiAutomation) {
        return next();
      }

      const indicators = this.detectAutomation(req);
      
      if (indicators.length > 0) {
        await this.anomalyDetector.trackEvent({
          ipAddress: this.getClientIP(req),
          userAgent: req.headers['user-agent'],
          eventType: 'automation_detected',
          timestamp: new Date(),
          metadata: { indicators }
        });

        // Add challenge or block based on severity
        if (indicators.length >= 3) {
          return res.status(403).json({
            error: 'Automated access detected',
            challenge: 'captcha_required'
          });
        }
      }

      next();
    };
  }

  // IP validation and proxy detection
  ipValidation(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = this.getClientIP(req);
      
      // Validate IP format
      if (!this.isValidIP(clientIP)) {
        return res.status(400).json({
          error: 'Invalid client IP'
        });
      }

      // Store clean IP
      req.clientIP = clientIP;
      
      next();
    };
  }

  // Request integrity validation
  requestIntegrity(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      // Validate content-type matches body
      if (req.body && Object.keys(req.body).length > 0) {
        const contentType = req.headers['content-type'];
        if (!contentType?.includes('application/json') && 
            !contentType?.includes('application/x-www-form-urlencoded') &&
            !contentType?.includes('multipart/form-data')) {
          return res.status(400).json({
            error: 'Invalid content-type for request body'
          });
        }
      }

      // Validate request size
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > 10 * 1024 * 1024) { // 10MB limit
        return res.status(413).json({
          error: 'Request entity too large'
        });
      }

      next();
    };
  }

  // Security event logger
  securityEventLogger(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Capture original end function
      const originalEnd = res.end;
      
      res.end = function(...args: any[]) {
        // Restore original
        res.end = originalEnd;
        
        // Call original
        originalEnd.apply(res, args);
        
        // Log security-relevant events
        if (res.statusCode === 401 || res.statusCode === 403) {
          setImmediate(async () => {
            await this.auditLogger.logSecurityEvent(
              'access_denied',
              'medium',
              `${req.method} ${req.path} returned ${res.statusCode}`,
              req.clientIP || req.ip,
              {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration: Date.now() - startTime,
                userId: (req as any).user?.id,
                userAgent: req.headers['user-agent']
              }
            );
          });
        }
      };
      
      next();
    };
  }

  // Combined security middleware
  allSecurityMiddleware(): RequestHandler[] {
    const middlewares: RequestHandler[] = [];

    if (this.config.securityHeaders) {
      middlewares.push(this.securityHeaders());
    }

    middlewares.push(
      this.nonceGenerator(),
      this.ipValidation(),
      this.requestIntegrity(),
      this.deviceFingerprint(),
      this.antiAutomation(),
      this.csrfProtection(),
      this.securityEventLogger()
    );

    return middlewares;
  }

  private generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private verifyCSRFToken(token: string, sessionToken: string): boolean {
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(sessionToken)
    );
  }

  private generateFingerprint(req: Request): string {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.headers['accept'] || '',
      // Add more stable headers
    ];

    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }

  private detectAutomation(req: Request): string[] {
    const indicators: string[] = [];
    const ua = req.headers['user-agent'] || '';

    // Check for headless browser indicators
    if (ua.includes('HeadlessChrome') || ua.includes('PhantomJS')) {
      indicators.push('headless_browser');
    }

    // Check for missing headers that browsers always send
    if (!req.headers['accept-language']) {
      indicators.push('missing_accept_language');
    }

    if (!req.headers['accept-encoding']) {
      indicators.push('missing_accept_encoding');
    }

    // Check for automation tools
    if (req.headers['x-forwarded-for']?.includes('127.0.0.1')) {
      indicators.push('local_proxy');
    }

    // Check for WebDriver
    if ((req as any).webdriver || req.headers['webdriver']) {
      indicators.push('webdriver_detected');
    }

    // Check for suspicious timing patterns
    const referer = req.headers['referer'];
    if (!referer && req.method === 'POST') {
      indicators.push('missing_referer_on_post');
    }

    return indicators;
  }

  private getClientIP(req: Request): string {
    // Handle trusted proxies
    if (this.config.trustedProxies.length > 0) {
      const xForwardedFor = req.headers['x-forwarded-for'];
      if (xForwardedFor) {
        const ips = (xForwardedFor as string).split(',').map(ip => ip.trim());
        // Return first non-trusted IP
        for (const ip of ips) {
          if (!this.config.trustedProxies.includes(ip)) {
            return ip;
          }
        }
      }
    }

    // Fallback to standard IP detection
    return req.ip || 
           req.socket.remoteAddress || 
           req.headers['x-real-ip'] as string ||
           '0.0.0.0';
  }

  private isValidIP(ip: string): boolean {
    // IPv4
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // IPv6
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      clientIP?: string;
      deviceFingerprint?: string;
      session?: any;
    }
  }
}