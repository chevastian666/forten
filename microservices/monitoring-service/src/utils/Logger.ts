import winston from 'winston';
import { Config } from '../config';

export class Logger {
  private logger: winston.Logger;

  constructor(config: Config['logging']) {
    this.logger = winston.createLogger({
      level: config.level,
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'monitoring-service' },
      transports: [
        // Write all logs with importance level of 'error' or less to 'error.log'
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: this.parseSize(config.maxSize),
          maxFiles: config.maxFiles
        }),
        // Write all logs with importance level of 'info' or less to the main log file
        new winston.transports.File({
          filename: config.file,
          maxsize: this.parseSize(config.maxSize),
          maxFiles: config.maxFiles
        })
      ],
      exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' })
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' })
      ]
    });

    // If we're not in production, log to the console with a simple format
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  private parseSize(size: string): number {
    const match = size.match(/^(\d+)([kmg]?)$/i);
    if (!match) return 10 * 1024 * 1024; // Default 10MB

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'k':
        return value * 1024;
      case 'm':
        return value * 1024 * 1024;
      case 'g':
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  http(message: string, meta?: any): void {
    this.logger.http(message, meta);
  }

  // Structured logging methods for specific events
  logCameraEvent(cameraId: string, event: string, details?: any): void {
    this.info(`Camera event: ${event}`, {
      cameraId,
      event,
      ...details
    });
  }

  logDeviceEvent(deviceId: string, event: string, details?: any): void {
    this.info(`Device event: ${event}`, {
      deviceId,
      event,
      ...details
    });
  }

  logBuildingEvent(buildingId: string, event: string, details?: any): void {
    this.info(`Building event: ${event}`, {
      buildingId,
      event,
      ...details
    });
  }

  logSecurityEvent(event: string, details?: any): void {
    this.warn(`Security event: ${event}`, {
      event,
      ...details
    });
  }

  logPerformance(operation: string, duration: number, details?: any): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      ...details
    });
  }

  logAPIRequest(method: string, url: string, statusCode: number, duration: number, userId?: string): void {
    this.http(`${method} ${url} ${statusCode}`, {
      method,
      url,
      statusCode,
      duration,
      userId
    });
  }

  logAPIError(method: string, url: string, error: Error, userId?: string): void {
    this.error(`API Error: ${method} ${url}`, {
      method,
      url,
      error: error.message,
      stack: error.stack,
      userId
    });
  }

  logDatabaseOperation(operation: string, table: string, duration: number, details?: any): void {
    this.debug(`DB: ${operation} on ${table}`, {
      operation,
      table,
      duration,
      ...details
    });
  }

  logWebSocketEvent(event: string, userId?: string, details?: any): void {
    this.debug(`WebSocket: ${event}`, {
      event,
      userId,
      ...details
    });
  }

  logStreamingEvent(sessionId: string, event: string, details?: any): void {
    this.info(`Streaming: ${event}`, {
      sessionId,
      event,
      ...details
    });
  }

  logNotificationEvent(alertId: string, method: string, status: string, details?: any): void {
    this.info(`Notification: ${method} ${status}`, {
      alertId,
      method,
      status,
      ...details
    });
  }

  logSystemHealth(component: string, status: 'healthy' | 'unhealthy', details?: any): void {
    const level = status === 'healthy' ? 'info' : 'warn';
    this.logger.log(level, `System Health: ${component} is ${status}`, {
      component,
      status,
      ...details
    });
  }

  // Method to create child loggers with additional context
  child(defaultMeta: any): Logger {
    const childLogger = new Logger({
      level: this.logger.level,
      file: 'logs/monitoring-service.log',
      maxSize: '10m',
      maxFiles: 5
    });

    childLogger.logger = this.logger.child(defaultMeta);
    return childLogger;
  }

  // Method to change log level at runtime
  setLevel(level: string): void {
    this.logger.level = level;
    this.logger.transports.forEach(transport => {
      transport.level = level;
    });
  }

  // Method to flush logs (useful for testing or graceful shutdown)
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      // Flush all file transports
      const fileTransports = this.logger.transports.filter(
        transport => transport instanceof winston.transports.File
      );

      if (fileTransports.length === 0) {
        resolve();
        return;
      }

      let pendingFlushes = fileTransports.length;
      fileTransports.forEach(transport => {
        if ('_flush' in transport && typeof transport._flush === 'function') {
          transport._flush(() => {
            pendingFlushes--;
            if (pendingFlushes === 0) {
              resolve();
            }
          });
        } else {
          pendingFlushes--;
          if (pendingFlushes === 0) {
            resolve();
          }
        }
      });
    });
  }
}