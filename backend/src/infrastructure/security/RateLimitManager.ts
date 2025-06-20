import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';
import { Request, Response } from 'express';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}

export interface RateLimitPreset {
  login: RateLimitConfig;
  api: RateLimitConfig;
  pins: RateLimitConfig;
  register: RateLimitConfig;
  passwordReset: RateLimitConfig;
  fileUpload: RateLimitConfig;
  search: RateLimitConfig;
  reports: RateLimitConfig;
  streaming: RateLimitConfig;
  webhook: RateLimitConfig;
}

export class RateLimitManager {
  private readonly presets: RateLimitPreset;
  private readonly redisClient: Redis;
  private readonly limiters: Map<string, RateLimitRequestHandler> = new Map();

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
    this.presets = this.createDefaultPresets();
    this.initializeLimiters();
  }

  private createDefaultPresets(): RateLimitPreset {
    return {
      // Authentication endpoints - very strict
      login: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5,
        message: 'Too many login attempts, please try again later',
        skipSuccessfulRequests: true,
        keyGenerator: (req) => {
          // Rate limit by IP + username combination
          const username = req.body?.email || req.body?.username || '';
          return `login_${req.ip}_${username}`;
        }
      },

      // General API endpoints
      api: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 100,
        message: 'Too many requests, please slow down'
      },

      // PIN validation - strict for security
      pins: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 10,
        message: 'Too many PIN attempts, access temporarily blocked',
        skipSuccessfulRequests: false,
        keyGenerator: (req) => {
          // Rate limit by building + PIN combination
          const buildingId = req.body?.buildingId || req.params?.buildingId || '';
          const pin = req.body?.pin || '';
          return `pin_${req.ip}_${buildingId}_${pin.substring(0, 3)}`;
        }
      },

      // Registration - prevent spam
      register: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3,
        message: 'Registration limit reached, please try again later',
        keyGenerator: (req) => {
          // Rate limit by IP + email
          const email = req.body?.email || '';
          return `register_${req.ip}_${email}`;
        }
      },

      // Password reset - prevent abuse
      passwordReset: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3,
        message: 'Password reset limit reached, please try again later',
        keyGenerator: (req) => {
          const email = req.body?.email || '';
          return `reset_${req.ip}_${email}`;
        }
      },

      // File uploads - prevent abuse
      fileUpload: {
        windowMs: 10 * 60 * 1000, // 10 minutes
        max: 10,
        message: 'File upload limit reached, please wait before uploading more'
      },

      // Search operations - prevent resource abuse
      search: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 30,
        message: 'Search rate limit exceeded, please slow down'
      },

      // Report generation - resource intensive
      reports: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 5,
        message: 'Report generation limit reached, please wait',
        keyGenerator: (req) => {
          const userId = (req as any).user?.id || '';
          return `reports_${userId}_${req.ip}`;
        }
      },

      // Video streaming - bandwidth intensive
      streaming: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 10,
        message: 'Streaming limit reached, please wait',
        keyGenerator: (req) => {
          const userId = (req as any).user?.id || '';
          const cameraId = req.params?.cameraId || '';
          return `stream_${userId}_${cameraId}`;
        }
      },

      // Webhook endpoints - prevent flooding
      webhook: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 50,
        message: 'Webhook rate limit exceeded',
        keyGenerator: (req) => {
          // Rate limit by source IP + webhook ID
          const webhookId = req.params?.webhookId || req.headers['x-webhook-id'] || '';
          return `webhook_${req.ip}_${webhookId}`;
        }
      }
    };
  }

  private initializeLimiters(): void {
    Object.entries(this.presets).forEach(([name, config]) => {
      this.limiters.set(name, this.createLimiter(config));
    });
  }

  private createLimiter(config: RateLimitConfig): RateLimitRequestHandler {
    return rateLimit({
      store: new RedisStore({
        client: this.redisClient,
        prefix: 'rl:'
      }),
      ...config,
      handler: config.handler || this.defaultHandler.bind(this),
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  private defaultHandler(req: Request, res: Response): void {
    res.status(429).json({
      error: 'Too Many Requests',
      message: res.locals.rateLimitMessage || 'Rate limit exceeded',
      retryAfter: res.getHeader('Retry-After'),
      limit: res.getHeader('X-RateLimit-Limit'),
      remaining: res.getHeader('X-RateLimit-Remaining'),
      reset: res.getHeader('X-RateLimit-Reset')
    });
  }

  // Get a specific rate limiter
  get(name: keyof RateLimitPreset): RateLimitRequestHandler {
    const limiter = this.limiters.get(name);
    if (!limiter) {
      throw new Error(`Rate limiter '${name}' not found`);
    }
    return limiter;
  }

  // Create a custom rate limiter
  custom(config: RateLimitConfig): RateLimitRequestHandler {
    return this.createLimiter(config);
  }

  // Dynamic rate limiting based on user tier
  tiered(baseName: keyof RateLimitPreset): RateLimitRequestHandler {
    return (req: Request, res: Response, next: Function) => {
      const user = (req as any).user;
      const tier = user?.tier || 'basic';
      
      // Adjust limits based on tier
      const baseConfig = { ...this.presets[baseName] };
      switch (tier) {
        case 'premium':
          baseConfig.max = Math.floor(baseConfig.max * 2);
          break;
        case 'enterprise':
          baseConfig.max = Math.floor(baseConfig.max * 5);
          break;
      }

      const limiter = this.createLimiter(baseConfig);
      limiter(req, res, next);
    };
  }

  // IP-based allowlist/blocklist
  withIPFilter(
    limiterName: keyof RateLimitPreset,
    allowlist: string[] = [],
    blocklist: string[] = []
  ): RateLimitRequestHandler {
    return (req: Request, res: Response, next: Function) => {
      const clientIP = req.ip;

      // Check blocklist first
      if (blocklist.includes(clientIP)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      // Skip rate limiting for allowlisted IPs
      if (allowlist.includes(clientIP)) {
        return next();
      }

      // Apply rate limiting
      this.get(limiterName)(req, res, next);
    };
  }

  // Adaptive rate limiting based on system load
  adaptive(baseName: keyof RateLimitPreset): RateLimitRequestHandler {
    return async (req: Request, res: Response, next: Function) => {
      // Check system load (this is a simplified example)
      const systemLoad = await this.getSystemLoad();
      
      const baseConfig = { ...this.presets[baseName] };
      
      // Adjust limits based on system load
      if (systemLoad > 0.8) {
        baseConfig.max = Math.floor(baseConfig.max * 0.5); // Reduce by 50%
      } else if (systemLoad > 0.6) {
        baseConfig.max = Math.floor(baseConfig.max * 0.75); // Reduce by 25%
      }

      const limiter = this.createLimiter(baseConfig);
      limiter(req, res, next);
    };
  }

  private async getSystemLoad(): Promise<number> {
    // This is a placeholder - implement actual system load checking
    // Could check CPU usage, memory usage, response times, etc.
    return 0.5;
  }

  // Reset rate limit for a specific key
  async reset(limiterName: string, key: string): Promise<void> {
    await this.redisClient.del(`rl:${limiterName}:${key}`);
  }

  // Get current rate limit status for a key
  async getStatus(limiterName: string, key: string): Promise<{
    count: number;
    resetTime: number;
  } | null> {
    const data = await this.redisClient.get(`rl:${limiterName}:${key}`);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  // Temporarily ban an IP or user
  async temporaryBan(
    identifier: string,
    durationMinutes: number,
    reason: string
  ): Promise<void> {
    const key = `ban:${identifier}`;
    const duration = durationMinutes * 60; // Convert to seconds
    
    await this.redisClient.setex(key, duration, JSON.stringify({
      reason,
      bannedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + duration * 1000).toISOString()
    }));
  }

  // Check if an identifier is banned
  async isBanned(identifier: string): Promise<{
    banned: boolean;
    reason?: string;
    expiresAt?: string;
  }> {
    const data = await this.redisClient.get(`ban:${identifier}`);
    if (!data) {
      return { banned: false };
    }

    try {
      const banInfo = JSON.parse(data);
      return {
        banned: true,
        reason: banInfo.reason,
        expiresAt: banInfo.expiresAt
      };
    } catch {
      return { banned: false };
    }
  }

  // Middleware to check bans
  banCheck(): RateLimitRequestHandler {
    return async (req: Request, res: Response, next: Function) => {
      const identifiers = [
        req.ip,
        (req as any).user?.id,
        req.body?.email
      ].filter(Boolean);

      for (const identifier of identifiers) {
        const banStatus = await this.isBanned(identifier);
        if (banStatus.banned) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Access temporarily banned',
            reason: banStatus.reason,
            expiresAt: banStatus.expiresAt
          });
        }
      }

      next();
    };
  }
}