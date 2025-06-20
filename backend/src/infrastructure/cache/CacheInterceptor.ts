import { Request, Response, NextFunction } from 'express';
import { CacheManager } from './CacheManager';
import { Logger } from '../logging/Logger';
import crypto from 'crypto';

export interface CacheInterceptorOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  tags?: string[] | ((req: Request) => string[]);
  varyBy?: string[]; // Headers to vary cache by
  excludeQuery?: string[]; // Query params to exclude from key
  namespace?: string;
}

export class CacheInterceptor {
  private readonly logger: Logger;
  
  constructor(private readonly cache: CacheManager) {
    this.logger = new Logger('CacheInterceptor');
  }

  /**
   * Express middleware for HTTP response caching
   */
  middleware(options: CacheInterceptorOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Check if caching should be applied
      if (!this.shouldCache(req, options)) {
        return next();
      }

      const cacheKey = this.generateCacheKey(req, options);
      const namespace = options.namespace || 'http';

      // Try to get from cache
      const cached = await this.cache.get<CachedResponse>(cacheKey, namespace);
      
      if (cached) {
        this.logger.debug('HTTP cache hit', { 
          method: req.method, 
          path: req.path,
          key: cacheKey 
        });

        // Set cached headers
        Object.entries(cached.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        // Add cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);

        // Send cached response
        return res.status(cached.statusCode).send(cached.body);
      }

      // Cache miss - intercept response
      this.interceptResponse(req, res, cacheKey, namespace, options);
      
      next();
    };
  }

  /**
   * Method decorator for caching method results
   */
  methodCache(options: CacheInterceptorOptions = {}) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cacheKey = options.keyGenerator
          ? options.keyGenerator(args[0])
          : `${target.constructor.name}:${propertyKey}:${CacheInterceptor.hashArgs(args)}`;

        const namespace = options.namespace || 'methods';

        // Try cache first
        const cached = await this.cache.get(cacheKey, namespace);
        if (cached !== null) {
          return cached;
        }

        // Execute method
        const result = await originalMethod.apply(this, args);

        // Cache result
        const tags = typeof options.tags === 'function' 
          ? options.tags(args[0])
          : options.tags;

        await this.cache.set(cacheKey, result, {
          ttl: options.ttl,
          tags,
          namespace
        });

        return result;
      };

      return descriptor;
    };
  }

  /**
   * Create cache middleware for specific routes
   */
  static routeCache(cache: CacheManager, ttl: number, namespace?: string) {
    const interceptor = new CacheInterceptor(cache);
    
    return interceptor.middleware({
      ttl,
      namespace: namespace || 'routes',
      condition: (req) => req.method === 'GET'
    });
  }

  /**
   * Create cache middleware for API endpoints
   */
  static apiCache(cache: CacheManager, options: {
    ttl?: number;
    varyBy?: string[];
    excludeAuth?: boolean;
  } = {}) {
    const interceptor = new CacheInterceptor(cache);
    
    return interceptor.middleware({
      ttl: options.ttl || 60,
      namespace: 'api',
      varyBy: options.varyBy || ['authorization', 'accept'],
      condition: (req) => {
        // Only cache GET requests
        if (req.method !== 'GET') return false;
        
        // Don't cache if auth is required and excludeAuth is true
        if (options.excludeAuth && req.headers.authorization) return false;
        
        return true;
      },
      keyGenerator: (req) => {
        const parts = [
          req.method,
          req.path,
          CacheInterceptor.normalizeQuery(req.query)
        ];

        // Add vary headers
        if (options.varyBy) {
          options.varyBy.forEach(header => {
            if (req.headers[header]) {
              parts.push(`${header}:${req.headers[header]}`);
            }
          });
        }

        return CacheInterceptor.hashString(parts.join(':'));
      }
    });
  }

  private shouldCache(req: Request, options: CacheInterceptorOptions): boolean {
    // Default: only cache GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return false;
    }

    // Check custom condition
    if (options.condition && !options.condition(req)) {
      return false;
    }

    // Don't cache if no-cache header is present
    if (req.headers['cache-control']?.includes('no-cache')) {
      return false;
    }

    return true;
  }

  private generateCacheKey(req: Request, options: CacheInterceptorOptions): string {
    if (options.keyGenerator) {
      return options.keyGenerator(req);
    }

    const keyParts: string[] = [
      req.method,
      req.hostname,
      req.path
    ];

    // Add query parameters
    const query = this.filterQuery(req.query, options.excludeQuery);
    if (Object.keys(query).length > 0) {
      keyParts.push(CacheInterceptor.normalizeQuery(query));
    }

    // Add vary headers
    if (options.varyBy) {
      options.varyBy.forEach(header => {
        const value = req.headers[header.toLowerCase()];
        if (value) {
          keyParts.push(`${header}:${value}`);
        }
      });
    }

    return CacheInterceptor.hashString(keyParts.join('|'));
  }

  private filterQuery(query: any, exclude?: string[]): any {
    if (!exclude || exclude.length === 0) {
      return query;
    }

    const filtered: any = {};
    
    Object.keys(query).forEach(key => {
      if (!exclude.includes(key)) {
        filtered[key] = query[key];
      }
    });

    return filtered;
  }

  private interceptResponse(
    req: Request,
    res: Response,
    cacheKey: string,
    namespace: string,
    options: CacheInterceptorOptions
  ): void {
    const originalSend = res.send;
    const originalJson = res.json;
    const chunks: Buffer[] = [];

    // Intercept write to capture response
    const originalWrite = res.write;
    res.write = function(chunk: any, ...args: any[]): boolean {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return originalWrite.apply(res, [chunk, ...args]);
    };

    // Intercept send
    res.send = function(body: any): Response {
      res.send = originalSend;
      
      if (shouldCacheResponse(res)) {
        cacheResponse(body);
      }

      return originalSend.call(res, body);
    };

    // Intercept json
    res.json = function(body: any): Response {
      res.json = originalJson;
      
      if (shouldCacheResponse(res)) {
        cacheResponse(JSON.stringify(body));
      }

      return originalJson.call(res, body);
    };

    const shouldCacheResponse = (res: Response): boolean => {
      // Only cache successful responses
      return res.statusCode >= 200 && res.statusCode < 300;
    };

    const cacheResponse = async (body: any): Promise<void> => {
      try {
        const cachedResponse: CachedResponse = {
          statusCode: res.statusCode,
          headers: this.getCacheableHeaders(res),
          body: body || Buffer.concat(chunks).toString(),
          cachedAt: new Date()
        };

        const tags = typeof options.tags === 'function'
          ? options.tags(req)
          : options.tags;

        await this.cache.set(cacheKey, cachedResponse, {
          ttl: options.ttl,
          tags,
          namespace
        });

        // Add cache headers
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);

        this.logger.debug('Response cached', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          key: cacheKey
        });
      } catch (error) {
        this.logger.error('Failed to cache response', error);
      }
    };
  }

  private getCacheableHeaders(res: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    const cacheableHeaders = [
      'content-type',
      'content-encoding',
      'content-language',
      'etag',
      'last-modified',
      'vary'
    ];

    cacheableHeaders.forEach(header => {
      const value = res.getHeader(header);
      if (value) {
        headers[header] = String(value);
      }
    });

    return headers;
  }

  private static normalizeQuery(query: any): string {
    const sorted = Object.keys(query)
      .sort()
      .reduce((acc, key) => {
        acc[key] = query[key];
        return acc;
      }, {} as any);

    return JSON.stringify(sorted);
  }

  private static hashString(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex');
  }

  private static hashArgs(args: any[]): string {
    return CacheInterceptor.hashString(JSON.stringify(args));
  }
}

interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  cachedAt: Date;
}

// Preset cache configurations
export const CachePresets = {
  // Very short cache for dynamic content
  dynamic: {
    ttl: 10,
    tags: ['dynamic']
  },

  // Standard API cache
  api: {
    ttl: 60,
    tags: ['api'],
    varyBy: ['authorization']
  },

  // Static content cache
  static: {
    ttl: 3600,
    tags: ['static']
  },

  // User-specific cache
  user: {
    ttl: 300,
    tags: ['user'],
    varyBy: ['authorization'],
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id || 'anonymous';
      return `user:${userId}:${req.path}`;
    }
  },

  // Search results cache
  search: {
    ttl: 600,
    tags: ['search'],
    excludeQuery: ['_t'] // Exclude timestamp params
  },

  // Report cache
  reports: {
    ttl: 1800,
    tags: ['reports'],
    condition: (req: Request) => {
      // Only cache if not requesting fresh data
      return !req.query.fresh;
    }
  }
};