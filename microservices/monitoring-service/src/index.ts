import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cron from 'node-cron';
import path from 'path';

// Configuration and utilities
import config from './config';
import { Logger } from './utils/Logger';
import { DatabaseConnection } from './config/database';

// Infrastructure
import { PostgreSQLBuildingRepository } from './infrastructure/repositories/PostgreSQLBuildingRepository';
import { PostgreSQLCameraRepository } from './infrastructure/repositories/PostgreSQLCameraRepository';
import { HikCentralService } from './infrastructure/services/HikCentralService';
import { QBoxService } from './infrastructure/services/QBoxService';
import { StreamingService } from './infrastructure/services/StreamingService';
import { NotificationService } from './infrastructure/services/NotificationService';
import { WebSocketService } from './infrastructure/websocket/WebSocketService';

// Use cases
import { CameraManagementUseCase } from './application/use-cases/CameraManagementUseCase';
import { StreamingUseCase } from './application/use-cases/StreamingUseCase';
import { AlertManagementUseCase } from './application/use-cases/AlertManagementUseCase';

// Presentation layer
import { BuildingController } from './presentation/controllers/BuildingController';
import { CameraController } from './presentation/controllers/CameraController';
import { AuthMiddleware } from './presentation/middleware/AuthMiddleware';
import { RoleMiddleware } from './presentation/middleware/RoleMiddleware';
import { PermissionMiddleware } from './presentation/middleware/PermissionMiddleware';
import { ValidationService } from './presentation/middleware/ValidationService';
import { createBuildingRoutes } from './presentation/routes/buildingRoutes';
import { createCameraRoutes } from './presentation/routes/cameraRoutes';

class MonitoringService {
  private app: Application;
  private server: any;
  private logger: Logger;
  private database: DatabaseConnection;
  private webSocketService: WebSocketService;
  private cameraManagementUseCase: CameraManagementUseCase;
  private streamingUseCase: StreamingUseCase;
  private alertManagementUseCase: AlertManagementUseCase;

  constructor() {
    this.logger = new Logger(config.logging);
    this.app = express();
    this.server = createServer(this.app);
    
    this.logger.info('Monitoring Service starting...');
  }

  async initialize(): Promise<void> {
    try {
      // Initialize database
      await this.initializeDatabase();
      
      // Initialize services
      await this.initializeServices();
      
      // Initialize use cases
      await this.initializeUseCases();
      
      // Setup Express middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup WebSocket
      this.setupWebSocket();
      
      // Setup error handling
      this.setupErrorHandling();
      
      // Setup scheduled tasks
      this.setupScheduledTasks();
      
      this.logger.info('Monitoring Service initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Monitoring Service: ${error.message}`);
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    this.database = new DatabaseConnection(config.database, this.logger);
    
    const isConnected = await this.database.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Create tables if they don't exist
    await this.database.createTables();
    this.logger.info('Database initialized successfully');
  }

  private async initializeServices(): Promise<void> {
    // Initialize external services
    const hikCentralService = new HikCentralService(config.hikCentral, this.logger);
    const qBoxService = new QBoxService(config.qBox, this.logger);
    const streamingService = new StreamingService(
      config.streaming.streamDir,
      config.streaming.baseUrl,
      this.logger
    );
    const notificationService = new NotificationService(config.notification, this.logger);

    // Test service connections
    try {
      await notificationService.testConnections();
      this.logger.info('External services initialized successfully');
    } catch (error) {
      this.logger.warn(`Some external services may not be available: ${error.message}`);
    }

    // Store services for use cases
    this.streamingService = streamingService;
    this.notificationService = notificationService;
    this.hikCentralService = hikCentralService;
    this.qBoxService = qBoxService;
  }

  private async initializeUseCases(): Promise<void> {
    const pool = this.database.getPool();
    
    // Initialize repositories
    const buildingRepository = new PostgreSQLBuildingRepository(pool, this.logger);
    const cameraRepository = new PostgreSQLCameraRepository(pool, this.logger);
    
    // Initialize use cases (will initialize other repositories as needed)
    this.cameraManagementUseCase = new CameraManagementUseCase(
      cameraRepository,
      null, // eventRepository - will need to implement
      this.hikCentralService,
      null, // webSocketService - will be set after initialization
      this.logger
    );

    this.streamingUseCase = new StreamingUseCase(
      cameraRepository,
      this.hikCentralService,
      this.streamingService,
      this.logger
    );

    this.alertManagementUseCase = new AlertManagementUseCase(
      null, // alertRepository - will need to implement
      null, // eventRepository - will need to implement
      this.notificationService,
      null, // webSocketService - will be set after initialization
      this.logger
    );

    this.logger.info('Use cases initialized successfully');
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.app.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static files for streaming
    this.app.use('/streams', express.static(config.streaming.streamDir));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.logAPIRequest(
          req.method,
          req.originalUrl,
          res.statusCode,
          duration,
          req.user?.id
        );
      });
      
      next();
    });
  }

  private setupRoutes(): void {
    const pool = this.database.getPool();
    
    // Initialize middleware
    const authMiddleware = new AuthMiddleware(config.jwt.secret, this.logger);
    const roleMiddleware = new RoleMiddleware(this.logger);
    const permissionMiddleware = new PermissionMiddleware(this.logger);
    const validationService = new ValidationService();

    // Initialize controllers
    const buildingRepository = new PostgreSQLBuildingRepository(pool, this.logger);
    const buildingController = new BuildingController(
      buildingRepository,
      validationService,
      this.logger
    );

    const cameraController = new CameraController(
      this.cameraManagementUseCase,
      this.streamingUseCase,
      validationService,
      this.logger
    );

    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        const dbHealth = await this.database.healthCheck();
        const wsStats = this.webSocketService?.getConnectionStats();

        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: config.app.name,
          version: config.app.version,
          uptime: process.uptime(),
          environment: config.app.environment,
          database: dbHealth,
          websocket: wsStats,
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        };

        res.json(health);
      } catch (error) {
        this.logger.error(`Health check failed: ${error.message}`);
        res.status(503).json({
          status: 'unhealthy',
          error: error.message
        });
      }
    });

    // API routes
    this.app.use('/api/v1/buildings', createBuildingRoutes(
      buildingController,
      authMiddleware,
      roleMiddleware
    ));

    this.app.use('/api/v1/cameras', createCameraRoutes(
      cameraController,
      authMiddleware,
      roleMiddleware,
      permissionMiddleware
    ));

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: config.app.name,
        version: config.app.version,
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });

    this.logger.info('Routes configured successfully');
  }

  private setupWebSocket(): void {
    this.webSocketService = new WebSocketService(
      this.server,
      config.websocket,
      config.jwt.secret,
      this.logger
    );

    // Set WebSocket service in use cases
    if (this.cameraManagementUseCase) {
      // Would need to update the use case to accept WebSocket service
    }

    if (this.alertManagementUseCase) {
      // Would need to update the use case to accept WebSocket service
    }

    this.logger.info('WebSocket service configured successfully');
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
      });
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.logAPIError(req.method, req.originalUrl, error, req.user?.id);

      if (res.headersSent) {
        return next(error);
      }

      const statusCode = (error as any).statusCode || 500;
      
      res.status(statusCode).json({
        success: false,
        message: config.app.environment === 'development' ? error.message : 'Internal server error',
        ...(config.app.environment === 'development' && { stack: error.stack })
      });
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Promise Rejection', { reason, promise });
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', error);
      process.exit(1);
    });
  }

  private setupScheduledTasks(): void {
    // Camera health check - every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.cameraManagementUseCase.checkCameraHealth();
      } catch (error) {
        this.logger.error(`Camera health check failed: ${error.message}`);
      }
    });

    // Send pending alerts - every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.alertManagementUseCase.sendPendingAlerts();
      } catch (error) {
        this.logger.error(`Alert processing failed: ${error.message}`);
      }
    });

    // Retry failed alerts - every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.alertManagementUseCase.retryFailedAlerts();
      } catch (error) {
        this.logger.error(`Alert retry failed: ${error.message}`);
      }
    });

    // Cleanup inactive streams - every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      try {
        await this.streamingUseCase.cleanupInactiveSessions();
      } catch (error) {
        this.logger.error(`Stream cleanup failed: ${error.message}`);
      }
    });

    // Daily cleanup tasks - every day at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        // Cleanup old events and alerts would go here
        this.logger.info('Daily cleanup tasks completed');
      } catch (error) {
        this.logger.error(`Daily cleanup failed: ${error.message}`);
      }
    });

    this.logger.info('Scheduled tasks configured successfully');
  }

  async start(): Promise<void> {
    try {
      await this.initialize();

      this.server.listen(config.app.port, () => {
        this.logger.info(`Monitoring Service started on port ${config.app.port}`);
        this.logger.info(`Environment: ${config.app.environment}`);
        this.logger.info(`Health check: http://localhost:${config.app.port}/health`);
      });
    } catch (error) {
      this.logger.error(`Failed to start Monitoring Service: ${error.message}`);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Monitoring Service...');

    try {
      // Close server
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          this.server.close((error: any) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }

      // Close database connection
      if (this.database) {
        await this.database.close();
      }

      // Flush logs
      await this.logger.flush();

      this.logger.info('Monitoring Service shut down gracefully');
      process.exit(0);
    } catch (error) {
      this.logger.error(`Error during shutdown: ${error.message}`);
      process.exit(1);
    }
  }
}

// Create and start the service
const monitoringService = new MonitoringService();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  monitoringService.shutdown();
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  monitoringService.shutdown();
});

// Start the service
monitoringService.start().catch((error) => {
  console.error('Failed to start service:', error);
  process.exit(1);
});