import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import serviceRegistry from '../services/service-registry';
import { getCircuitBreaker } from './circuit-breaker';
import { AuthRequest } from './auth';
import logger from '../utils/logger';

export interface ProxyOptions {
  serviceName: string;
  pathRewrite?: { [key: string]: string };
  requireAuth?: boolean;
}

export function createServiceProxy(options: ProxyOptions) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const service = serviceRegistry.getService(options.serviceName);
    
    if (!service) {
      res.status(500).json({ error: `Service ${options.serviceName} not found` });
      return;
    }
    
    // Check if service is healthy
    if (!serviceRegistry.isServiceHealthy(options.serviceName)) {
      res.status(503).json({ 
        error: 'Service unavailable',
        service: options.serviceName 
      });
      return;
    }
    
    const breaker = getCircuitBreaker(options.serviceName);
    
    // Check if circuit breaker is open
    if (breaker.opened) {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: options.serviceName
      });
      return;
    }
    
    // Create proxy options
    const proxyOptions: Options = {
      target: service.url,
      changeOrigin: true,
      pathRewrite: options.pathRewrite,
      logLevel: 'warn',
      
      onProxyReq: (proxyReq, req: AuthRequest) => {
        // Forward user information if authenticated
        if (req.user) {
          proxyReq.setHeader('X-User-Id', req.user.id);
          proxyReq.setHeader('X-User-Email', req.user.email);
          proxyReq.setHeader('X-User-Role', req.user.role);
          if (req.user.tenantId) {
            proxyReq.setHeader('X-Tenant-Id', req.user.tenantId);
          }
        }
        
        // Log outgoing request
        logger.debug(`Proxying ${req.method} ${req.path} to ${service.url}`);
      },
      
      onProxyRes: (proxyRes, req, res) => {
        // Log response
        logger.debug(`Response from ${options.serviceName}: ${proxyRes.statusCode}`);
        
        // Record successful response for circuit breaker
        if (proxyRes.statusCode && proxyRes.statusCode < 500) {
          breaker.fallback(() => {
            // Success callback for circuit breaker
          });
        }
      },
      
      onError: (err, req, res: Response) => {
        logger.error(`Proxy error for ${options.serviceName}:`, err);
        
        // Trigger circuit breaker
        breaker.fire({
          method: req.method,
          url: `${service.url}${req.url}`,
          headers: req.headers
        }).catch(() => {
          // Circuit breaker will handle the error
        });
        
        if (!res.headersSent) {
          res.status(502).json({
            error: 'Bad gateway',
            service: options.serviceName,
            message: 'Error communicating with upstream service'
          });
        }
      }
    };
    
    // Create and execute proxy
    const proxy = createProxyMiddleware(proxyOptions);
    proxy(req, res, next);
  };
}

// Helper function to create routes for a service
export function createServiceRoutes(serviceName: string, basePath: string) {
  return createServiceProxy({
    serviceName,
    pathRewrite: {
      [`^${basePath}`]: ''
    }
  });
}