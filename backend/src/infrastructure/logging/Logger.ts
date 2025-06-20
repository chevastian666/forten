import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export interface LoggerConfig {
  level?: string;
  service?: string;
  dirname?: string;
  datePattern?: string;
  maxSize?: string;
  maxFiles?: string;
  format?: winston.Logform.Format;
}

export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string, config?: LoggerConfig) {
    this.context = context;
    
    const defaultFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    const transports: winston.transport[] = [];

    // Console transport
    if (process.env.NODE_ENV !== 'production') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      );
    }

    // File transport with rotation
    if (config?.dirname) {
      transports.push(
        new DailyRotateFile({
          dirname: config.dirname,
          filename: `${context}-%DATE%.log`,
          datePattern: config.datePattern || 'YYYY-MM-DD',
          maxSize: config.maxSize || '20m',
          maxFiles: config.maxFiles || '14d',
          format: config.format || defaultFormat
        })
      );

      // Error log file
      transports.push(
        new DailyRotateFile({
          dirname: config.dirname,
          filename: `${context}-error-%DATE%.log`,
          datePattern: config.datePattern || 'YYYY-MM-DD',
          maxSize: config.maxSize || '20m',
          maxFiles: config.maxFiles || '14d',
          level: 'error',
          format: config.format || defaultFormat
        })
      );
    }

    this.logger = winston.createLogger({
      level: config?.level || process.env.LOG_LEVEL || 'info',
      format: config?.format || defaultFormat,
      defaultMeta: { 
        service: config?.service || process.env.SERVICE_NAME || 'forten',
        context: this.context 
      },
      transports
    });
  }

  log(level: string, message: string, meta?: any): void {
    this.logger.log(level, message, meta);
  }

  error(message: string, error?: Error | any, meta?: any): void {
    this.logger.error(message, {
      ...meta,
      error: error?.message || error,
      stack: error?.stack
    });
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

  silly(message: string, meta?: any): void {
    this.logger.silly(message, meta);
  }

  // Security-specific logging methods
  security(message: string, meta?: any): void {
    this.logger.warn(`[SECURITY] ${message}`, meta);
  }

  audit(message: string, meta?: any): void {
    this.logger.info(`[AUDIT] ${message}`, meta);
  }

  critical(message: string, meta?: any): void {
    this.logger.error(`[CRITICAL] ${message}`, meta);
  }

  alert(message: string, meta?: any): void {
    this.logger.error(`[ALERT] ${message}`, meta);
  }

  // Performance logging
  startTimer(): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      return duration;
    };
  }

  logPerformance(operation: string, duration: number, meta?: any): void {
    this.logger.info(`[PERFORMANCE] ${operation}`, {
      duration,
      ...meta
    });
  }

  // Child logger with additional context
  child(additionalContext: any): Logger {
    const childLogger = new Logger(`${this.context}:${additionalContext}`, {
      level: this.logger.level
    });
    return childLogger;
  }
}