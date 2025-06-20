/**
 * Logger Configuration
 * Winston-based structured logging system with daily rotation
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels and colors
const logLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  }
};

// Add colors to Winston
winston.addColors(logLevels.colors);

// Custom timestamp format
const timestampFormat = () => {
  return new Date().toLocaleString('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Montevideo'
  });
};

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: timestampFormat
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: timestampFormat
  }),
  winston.format.align(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if exists
    if (Object.keys(metadata).length > 0) {
      // Handle error objects specially
      if (metadata.error && metadata.error instanceof Error) {
        metadata.error = {
          message: metadata.error.message,
          stack: metadata.error.stack,
          ...metadata.error
        };
      }
      msg += ` ${JSON.stringify(metadata, null, 2)}`;
    }
    
    return msg;
  })
);

// File rotation transport options
const fileRotateOptions = {
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
  zippedArchive: true,
  createSymlink: true,
  symlinkName: 'current.log'
};

// Create transports based on environment
const createTransports = () => {
  const transports = [];

  if (process.env.NODE_ENV === 'production') {
    // In production, log to files only
    
    // Error logs
    transports.push(
      new DailyRotateFile({
        ...fileRotateOptions,
        filename: path.join(logsDir, 'error-%DATE%.log'),
        level: 'error',
        handleExceptions: true,
        handleRejections: true,
        symlinkName: 'current-error.log'
      })
    );

    // Combined logs (all levels)
    transports.push(
      new DailyRotateFile({
        ...fileRotateOptions,
        filename: path.join(logsDir, 'combined-%DATE%.log'),
        handleExceptions: true,
        handleRejections: true,
        symlinkName: 'current-combined.log'
      })
    );

    // Separate files for different categories
    transports.push(
      new DailyRotateFile({
        ...fileRotateOptions,
        filename: path.join(logsDir, 'access-%DATE%.log'),
        level: 'info',
        filter: winston.format((info) => {
          return info.category === 'access' ? info : false;
        })(),
        symlinkName: 'current-access.log'
      })
    );

    transports.push(
      new DailyRotateFile({
        ...fileRotateOptions,
        filename: path.join(logsDir, 'security-%DATE%.log'),
        level: 'warn',
        filter: winston.format((info) => {
          return info.category === 'security' ? info : false;
        })(),
        symlinkName: 'current-security.log'
      })
    );

  } else {
    // In development, log to console and files
    
    // Console transport
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
        handleExceptions: true,
        handleRejections: true
      })
    );

    // Also log to file in development for debugging
    transports.push(
      new DailyRotateFile({
        ...fileRotateOptions,
        filename: path.join(logsDir, 'development-%DATE%.log'),
        handleExceptions: true,
        handleRejections: true,
        symlinkName: 'current-development.log'
      })
    );
  }

  return transports;
};

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels.levels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  transports: createTransports(),
  exitOnError: false
});

// Create child loggers for different modules
const createModuleLogger = (module) => {
  return logger.child({ module });
};

// Stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    // Remove trailing newline
    const msg = message.trim();
    logger.http(msg, { category: 'http' });
  }
};

// Log uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { 
    error: error.message,
    stack: error.stack,
    category: 'crash'
  });
  // Give logger time to write before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason: reason,
    promise: promise,
    category: 'crash'
  });
});

// Utility functions
const loggers = {
  // Main logger instance
  logger,

  // Module-specific loggers
  auth: createModuleLogger('auth'),
  database: createModuleLogger('database'),
  api: createModuleLogger('api'),
  websocket: createModuleLogger('websocket'),
  notification: createModuleLogger('notification'),
  export: createModuleLogger('export'),
  cache: createModuleLogger('cache'),
  audit: createModuleLogger('audit'),

  // Convenience methods
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  http: (message, meta = {}) => logger.http(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),

  // Structured logging helpers
  logRequest: (req, message, meta = {}) => {
    logger.info(message, {
      ...meta,
      category: 'access',
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      requestId: req.id
    });
  },

  logError: (error, context = {}) => {
    logger.error(error.message, {
      ...context,
      category: 'error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...error
      }
    });
  },

  logSecurity: (event, details = {}) => {
    logger.warn(event, {
      ...details,
      category: 'security',
      timestamp: new Date().toISOString()
    });
  },

  logPerformance: (operation, duration, meta = {}) => {
    logger.info(`Performance: ${operation}`, {
      ...meta,
      category: 'performance',
      operation,
      duration: `${duration}ms`,
      durationMs: duration
    });
  },

  logDatabase: (operation, query, duration, meta = {}) => {
    logger.debug(`Database: ${operation}`, {
      ...meta,
      category: 'database',
      operation,
      query: query?.substring(0, 200), // Limit query length
      duration: `${duration}ms`,
      durationMs: duration
    });
  },

  logCache: (operation, key, hit, meta = {}) => {
    logger.debug(`Cache ${operation}: ${key}`, {
      ...meta,
      category: 'cache',
      operation,
      key,
      hit,
      result: hit ? 'HIT' : 'MISS'
    });
  },

  logWebSocket: (event, socketId, meta = {}) => {
    logger.info(`WebSocket: ${event}`, {
      ...meta,
      category: 'websocket',
      event,
      socketId
    });
  },

  logNotification: (type, channel, status, meta = {}) => {
    logger.info(`Notification: ${type} via ${channel}`, {
      ...meta,
      category: 'notification',
      type,
      channel,
      status
    });
  },

  logAudit: (action, entity, userId, changes = {}) => {
    logger.info(`Audit: ${action} on ${entity}`, {
      category: 'audit',
      action,
      entity,
      userId,
      changes,
      timestamp: new Date().toISOString()
    });
  },

  // Query logger state
  getLogFiles: () => {
    const files = [];
    logger.transports.forEach(transport => {
      if (transport.filename) {
        files.push({
          filename: transport.filename,
          dirname: transport.dirname,
          maxSize: transport.maxSize,
          maxFiles: transport.maxFiles
        });
      }
    });
    return files;
  },

  // Clean up old logs manually if needed
  cleanOldLogs: async () => {
    try {
      const files = await fs.promises.readdir(logsDir);
      const now = Date.now();
      const maxAge = 14 * 24 * 60 * 60 * 1000; // 14 days

      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const stats = await fs.promises.stat(filePath);
        
        if (now - stats.mtimeMs > maxAge && file.endsWith('.log')) {
          await fs.promises.unlink(filePath);
          logger.info(`Cleaned old log file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning old logs:', { error: error.message });
    }
  }
};

// Add performance monitoring
if (process.env.NODE_ENV !== 'production') {
  // Log memory usage every 5 minutes in development
  setInterval(() => {
    const memUsage = process.memoryUsage();
    logger.debug('Memory Usage:', {
      category: 'performance',
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    });
  }, 5 * 60 * 1000);
}

// Log system startup
logger.info('Logger initialized', {
  category: 'system',
  environment: process.env.NODE_ENV,
  logLevel: logger.level,
  logsDirectory: logsDir,
  transports: logger.transports.map(t => t.constructor.name)
});

module.exports = loggers;