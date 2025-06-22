import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import logger from '../utils/logger';

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req: Request, res: Response) => {
  const responseTime = res.get('X-Response-Time');
  return responseTime ? responseTime.replace('ms', '') : '-';
});

// Custom token for user ID
morgan.token('user-id', (req: any) => {
  return req.user?.id || 'anonymous';
});

// Custom token for request ID
morgan.token('request-id', (req: any) => {
  return req.id || '-';
});

// Development format
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

// Production format (JSON)
const prodFormat = JSON.stringify({
  timestamp: ':date[iso]',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time-ms',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  ip: ':remote-addr',
  userId: ':user-id',
  requestId: ':request-id'
});

// Create morgan middleware with winston stream
export const requestLogger = morgan(
  process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  {
    stream: {
      write: (message: string) => {
        // Remove trailing newline
        const log = message.trim();
        
        if (process.env.NODE_ENV === 'production') {
          try {
            const parsed = JSON.parse(log);
            logger.info('HTTP Request', parsed);
          } catch {
            logger.info(log);
          }
        } else {
          logger.info(log);
        }
      }
    },
    skip: (req: Request) => {
      // Skip health check endpoints
      return req.url === '/health' || req.url === '/metrics';
    }
  }
);

// Middleware to capture response time
export const responseTime = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.set('X-Response-Time', `${duration}ms`);
  });
  
  next();
};

// Request ID middleware
export const requestId = (req: any, res: Response, next: NextFunction): void => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.set('X-Request-ID', req.id);
  next();
};