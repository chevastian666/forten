import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import routes from './routes';
import serviceRegistry from './services/service-registry';
import logger from './utils/logger';
import { requestLogger, responseTime, requestId } from './middleware/request-logger';

const app: Application = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request tracking
app.use(requestId);
app.use(responseTime);

// Request logging
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    });
  }
});

// Apply rate limiting to all routes except health checks
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/health')) {
    next();
  } else {
    limiter(req, res, next);
  }
});

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// API routes
app.use('/', routes);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    message: config.env === 'development' ? err.message : 'An unexpected error occurred',
    requestId: (req as any).id
  });
});

// Start the server
const PORT = config.port;

async function startServer() {
  try {
    // Start health checks for all services
    serviceRegistry.startHealthChecks(30000); // Check every 30 seconds
    
    // Wait for initial health checks
    logger.info('Performing initial health checks...');
    await serviceRegistry.checkAllServices();
    
    app.listen(PORT, () => {
      logger.info(`API Gateway is running on port ${PORT}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Registered services: ${config.services.map(s => s.name).join(', ')}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  serviceRegistry.stopHealthChecks();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  serviceRegistry.stopHealthChecks();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

export default app;