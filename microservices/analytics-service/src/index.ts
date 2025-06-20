import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { config } from './infrastructure/config/config';
import { setupDatabase } from './infrastructure/database/connection';
import { setupRedis } from './infrastructure/cache/redis';
import { setupMessageQueue } from './infrastructure/messaging/rabbitmq';
import { createContainer } from './infrastructure/di/container';
import { errorHandler } from './presentation/middleware/errorHandler';
import { requestLogger } from './presentation/middleware/requestLogger';
import { createReportRoutes } from './presentation/routes/reportRoutes';
import { createDashboardRoutes } from './presentation/routes/dashboardRoutes';
import { createMetricRoutes } from './presentation/routes/metricRoutes';
import { createQueryRoutes } from './presentation/routes/queryRoutes';
import { createDatasetRoutes } from './presentation/routes/datasetRoutes';
import { Logger } from './infrastructure/logging/Logger';
import { MetricCollector } from './infrastructure/monitoring/MetricCollector';
import { HealthCheckService } from './infrastructure/services/HealthCheckService';
import { SchedulerService } from './infrastructure/services/SchedulerService';

async function startServer() {
  const logger = new Logger('AnalyticsService');
  
  try {
    // Initialize infrastructure
    logger.info('Initializing infrastructure...');
    
    const db = await setupDatabase();
    const redis = await setupRedis();
    const rabbitMQ = await setupMessageQueue();
    
    // Create DI container
    const container = createContainer({ db, redis, rabbitMQ });
    
    // Initialize services
    const metricCollector = container.get(MetricCollector);
    const healthCheck = container.get(HealthCheckService);
    const scheduler = container.get(SchedulerService);
    
    // Start scheduler
    await scheduler.start();
    
    // Create Express app
    const app = express();
    const server = createServer(app);
    
    // Global middleware
    app.use(helmet());
    app.use(cors(config.cors));
    app.use(compression());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(requestLogger);
    
    // Health check
    app.get('/health', async (req, res) => {
      const health = await healthCheck.check();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });
    
    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
      const metrics = await metricCollector.getMetrics();
      res.json(metrics);
    });
    
    // API routes
    app.use('/api/v1/reports', createReportRoutes(container.get('ReportController')));
    app.use('/api/v1/dashboards', createDashboardRoutes(container.get('DashboardController')));
    app.use('/api/v1/metrics', createMetricRoutes(container.get('MetricController')));
    app.use('/api/v1/queries', createQueryRoutes(container.get('QueryController')));
    app.use('/api/v1/datasets', createDatasetRoutes(container.get('DatasetController')));
    
    // Error handling
    app.use(errorHandler);
    
    // Start server
    const port = config.server.port;
    server.listen(port, () => {
      logger.info(`Analytics Service running on port ${port}`);
      logger.info(`Environment: ${config.env}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      
      server.close(() => {
        logger.info('HTTP server closed');
      });
      
      await scheduler.stop();
      await rabbitMQ.close();
      await redis.quit();
      await db.destroy();
      
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();