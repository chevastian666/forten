import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import knex from 'knex';

// Load environment variables
dotenv.config();

// Import infrastructure
import { PostgresAccessRepository } from './infrastructure/repositories/PostgresAccessRepository';
import { PostgresAccessLogRepository } from './infrastructure/repositories/PostgresAccessLogRepository';
import { PostgresVisitorRepository } from './infrastructure/repositories/PostgresVisitorRepository';
import { PostgresBuildingRepository } from './infrastructure/repositories/PostgresBuildingRepository';
import { PostgresDoorRepository } from './infrastructure/repositories/PostgresDoorRepository';

// Import services
import { EventBusService } from './infrastructure/services/EventBusService';
import { WinstonLogger } from './infrastructure/services/WinstonLogger';
import { NotificationService } from './infrastructure/services/NotificationService';
import { QBoxService } from './infrastructure/services/QBoxService';
import { PhotoService } from './infrastructure/services/PhotoService';
import { AccessMonitoringSocket } from './presentation/websocket/AccessMonitoringSocket';

// Import use cases
import { GeneratePINUseCase } from './application/use-cases/GeneratePINUseCase';
import { ValidateAccessUseCase } from './application/use-cases/ValidateAccessUseCase';
import { CreateVisitorUseCase } from './application/use-cases/CreateVisitorUseCase';
import { CheckInVisitorUseCase } from './application/use-cases/CheckInVisitorUseCase';
import { LogAccessUseCase } from './application/use-cases/LogAccessUseCase';
import { ControlDoorUseCase } from './application/use-cases/ControlDoorUseCase';

// Import controllers
import { AccessController } from './presentation/controllers/AccessController';
import { VisitorController } from './presentation/controllers/VisitorController';
import { LogController } from './presentation/controllers/LogController';
import { DoorController } from './presentation/controllers/DoorController';
import { BuildingController } from './presentation/controllers/BuildingController';

// Import routes
import { createAccessRoutes } from './presentation/routes/accessRoutes';
import { createVisitorRoutes } from './presentation/routes/visitorRoutes';
import { createLogRoutes } from './presentation/routes/logRoutes';
import { createDoorRoutes } from './presentation/routes/doorRoutes';
import { createBuildingRoutes } from './presentation/routes/buildingRoutes';

// Import middleware
import { errorHandler } from './presentation/middleware/errorHandler';
import { requestLogger } from './presentation/middleware/requestLogger';
import { rateLimiter } from './presentation/middleware/rateLimiter';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true
    }
  });

  // Database connection
  const db = knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'forten_access'
    },
    pool: {
      min: 2,
      max: 10
    }
  });

  // Run migrations
  try {
    await db.migrate.latest();
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  // Initialize repositories
  const accessRepository = new PostgresAccessRepository(db);
  const accessLogRepository = new PostgresAccessLogRepository(db);
  const visitorRepository = new PostgresVisitorRepository(db);
  const buildingRepository = new PostgresBuildingRepository(db);
  const doorRepository = new PostgresDoorRepository(db);

  // Initialize services
  const logger = new WinstonLogger();
  const eventBus = new EventBusService(logger);
  const notificationService = new NotificationService(logger);
  const qboxService = new QBoxService(logger);
  const photoService = new PhotoService(logger);
  const realtimeService = new AccessMonitoringSocket(io, logger);

  // Initialize use cases
  const generatePINUseCase = new GeneratePINUseCase(accessRepository, eventBus, logger);
  const validateAccessUseCase = new ValidateAccessUseCase(
    accessRepository,
    accessLogRepository,
    doorRepository,
    eventBus,
    logger
  );
  const createVisitorUseCase = new CreateVisitorUseCase(
    visitorRepository,
    accessRepository,
    notificationService,
    eventBus,
    logger
  );
  const checkInVisitorUseCase = new CheckInVisitorUseCase(
    visitorRepository,
    accessRepository,
    notificationService,
    photoService,
    eventBus,
    logger
  );
  const logAccessUseCase = new LogAccessUseCase(
    accessLogRepository,
    doorRepository,
    realtimeService,
    eventBus,
    logger
  );
  const controlDoorUseCase = new ControlDoorUseCase(
    doorRepository,
    accessLogRepository,
    qboxService,
    realtimeService,
    eventBus,
    logger
  );

  // Initialize controllers
  const accessController = new AccessController(
    generatePINUseCase,
    validateAccessUseCase,
    accessRepository,
    logger
  );
  const visitorController = new VisitorController(
    createVisitorUseCase,
    checkInVisitorUseCase,
    visitorRepository,
    logger
  );
  const logController = new LogController(
    logAccessUseCase,
    accessLogRepository,
    logger
  );
  const doorController = new DoorController(
    controlDoorUseCase,
    doorRepository,
    logger
  );
  const buildingController = new BuildingController(
    buildingRepository,
    logger
  );

  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger(logger));
  app.use(rateLimiter());

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: 'access-service',
      timestamp: new Date(),
      uptime: process.uptime()
    });
  });

  // Routes
  app.use('/api/v1/access', createAccessRoutes(accessController));
  app.use('/api/v1/visitors', createVisitorRoutes(visitorController));
  app.use('/api/v1/logs', createLogRoutes(logController));
  app.use('/api/v1/doors', createDoorRoutes(doorController));
  app.use('/api/v1/buildings', createBuildingRoutes(buildingController));

  // Error handling
  app.use(errorHandler(logger));

  // Start server
  const PORT = process.env.PORT || 3003;
  httpServer.listen(PORT, () => {
    logger.info(`Access Service running on port ${PORT}`);
    console.log(`Access Service running on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });
    await db.destroy();
    process.exit(0);
  });
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});