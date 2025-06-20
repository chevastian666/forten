import winston from 'winston';
import { Logger, LogLevel, LogContext } from '../../application/interfaces/ILogger';

export class WinstonLogger implements Logger {
  private logger: winston.Logger;

  constructor() {
    const format = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          ...meta
        });
      })
    );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format,
      defaultMeta: { service: 'communication-service' },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: process.env.NODE_ENV === 'development' 
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
              )
            : format
        })
      ]
    });

    // Add file transport in production
    if (process.env.NODE_ENV === 'production') {
      this.logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }));

      this.logger.add(new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }));
    }
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  log(level: LogLevel, message: string, context?: LogContext): void {
    this.logger.log(level, message, context);
  }
}