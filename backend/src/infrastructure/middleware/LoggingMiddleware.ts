import morgan from 'morgan';
import { Request, Response } from 'express';
import { ConfigService } from '../config/ConfigService';
import fs from 'fs';
import path from 'path';

export class LoggingMiddleware {
  private configService: ConfigService;

  constructor() {
    this.configService = ConfigService.getInstance();
  }

  // Morgan middleware with environment-specific configuration
  morgan() {
    if (this.configService.isDevelopment()) {
      // Development logging - colorful and concise
      return morgan('dev');
    } else if (this.configService.isTest()) {
      // Test environment - minimal logging
      return morgan('tiny', {
        skip: (req: Request, res: Response) => res.statusCode < 400
      });
    } else {
      // Production logging - detailed with file output
      const logDirectory = path.join(process.cwd(), 'logs');
      
      // Ensure log directory exists
      if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory, { recursive: true });
      }

      // Create a write stream for access logs
      const accessLogStream = fs.createWriteStream(
        path.join(logDirectory, 'access.log'),
        { flags: 'a' }
      );

      // Custom token for user ID
      morgan.token('user-id', (req: any) => req.user?.id || 'anonymous');
      
      // Custom token for response time in milliseconds
      morgan.token('response-time-ms', (req: any, res: any) => {
        const digits = 3;
        const header = res.getHeader('X-Response-Time');
        if (header) {
          return parseFloat(header as string).toFixed(digits);
        }
        return '0.000';
      });

      // Combined format with additional information
      const format = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms ms';

      return morgan(format, {
        stream: accessLogStream,
        skip: (req: Request, res: Response) => {
          // Skip health check endpoints
          return req.path === '/health' || req.path === '/api/health';
        }
      });
    }
  }

  // Custom request logger for debugging
  requestLogger() {
    return (req: Request, res: Response, next: Function) => {
      if (this.configService.isDevelopment()) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
          query: req.query,
          body: req.body,
          headers: {
            'content-type': req.get('content-type'),
            'user-agent': req.get('user-agent')
          }
        });
      }
      next();
    };
  }

  // Response time tracking
  responseTime() {
    return (req: Request, res: Response, next: Function) => {
      const startTime = process.hrtime();

      res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const responseTime = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
        
        res.setHeader('X-Response-Time', responseTime.toFixed(3));
        
        // Log slow requests
        if (responseTime > 1000) { // More than 1 second
          console.warn(`Slow request detected: ${req.method} ${req.path} took ${responseTime.toFixed(3)}ms`);
        }
      });

      next();
    };
  }
}

// Factory function
export function createLoggingMiddleware(): LoggingMiddleware {
  return new LoggingMiddleware();
}