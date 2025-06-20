// Winston logger configuration for microservices

import winston from 'winston';
import { Request } from 'express';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
}

// Custom log format
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, service, ...metadata }) => {
    let msg = `${timestamp} [${service}] ${level}: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
  })
);

// Logger configuration interface
export interface LoggerConfig {
  service: string;
  level?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  filePath?: string;
}

// Create logger instance
export const createLogger = (config: LoggerConfig): winston.Logger => {
  const { service, level = 'info', enableConsole = true, enableFile = false, filePath } = config;

  const transports: winston.transport[] = [];

  // Console transport
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? customFormat : consoleFormat,
      })
    );
  }

  // File transport
  if (enableFile && filePath) {
    transports.push(
      new winston.transports.File({
        filename: filePath,
        format: customFormat,
      })
    );
  }

  return winston.createLogger({
    level,
    defaultMeta: { service },
    format: customFormat,
    transports,
    exceptionHandlers: [
      new winston.transports.File({ filename: 'exceptions.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'rejections.log' }),
    ],
  });
};

// Logger context interface
export interface LogContext {
  userId?: string;
  requestId?: string;
  correlationId?: string;
  method?: string;
  path?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

// Enhanced logger class
export class Logger {
  private logger: winston.Logger;
  private service: string;

  constructor(config: LoggerConfig) {
    this.logger = createLogger(config);
    this.service = config.service;
  }

  // Log methods with context
  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, {
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : undefined,
    });
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  http(message: string, context?: LogContext): void {
    this.logger.http(message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  // Log HTTP request
  logRequest(req: Request, responseTime?: number, statusCode?: number): void {
    const context: LogContext = {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: (req as any).user?.id,
      requestId: (req as any).id,
      responseTime,
      statusCode,
    };

    this.http(`${req.method} ${req.path} - ${statusCode}`, context);
  }

  // Log database query
  logQuery(operation: string, collection: string, duration: number, context?: LogContext): void {
    this.debug(`Database ${operation} on ${collection}`, {
      ...context,
      operation,
      collection,
      duration,
    });
  }

  // Log external API call
  logApiCall(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    this.info(`External API call: ${method} ${url}`, {
      ...context,
      method,
      url,
      statusCode,
      duration,
    });
  }

  // Log event
  logEvent(eventType: string, eventData: any, context?: LogContext): void {
    this.info(`Event: ${eventType}`, {
      ...context,
      eventType,
      eventData,
    });
  }

  // Create child logger with additional context
  child(context: LogContext): Logger {
    const childConfig: LoggerConfig = {
      service: this.service,
      level: this.logger.level,
    };

    const childLogger = new Logger(childConfig);
    childLogger.logger.defaultMeta = {
      ...this.logger.defaultMeta,
      ...context,
    };

    return childLogger;
  }
}

// Express middleware for request logging
export const requestLogger = (logger: Logger) => {
  return (req: Request, res: any, next: any) => {
    const start = Date.now();

    // Generate request ID if not present
    if (!(req as any).id) {
      (req as any).id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Log request start
    logger.http(`Incoming request: ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: (req as any).id,
    });

    // Capture response details
    const originalSend = res.send;
    res.send = function (data: any) {
      res.send = originalSend;
      
      const responseTime = Date.now() - start;
      logger.logRequest(req, responseTime, res.statusCode);
      
      return res.send(data);
    };

    next();
  };
};

// Performance logging decorator
export function LogPerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const start = Date.now();
    const className = target.constructor.name;
    const methodName = propertyKey;

    try {
      const result = await originalMethod.apply(this, args);
      const duration = Date.now() - start;
      
      if ((this as any).logger) {
        (this as any).logger.debug(`${className}.${methodName} completed`, { duration });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      if ((this as any).logger) {
        (this as any).logger.error(`${className}.${methodName} failed`, error as Error, { duration });
      }
      
      throw error;
    }
  };

  return descriptor;
}

// Default logger instance (should be configured by each service)
export const defaultLogger = new Logger({
  service: 'default',
  level: process.env.LOG_LEVEL || 'info',
});