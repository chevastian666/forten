// Service setup and initialization

import {
  createRabbitMQClient,
  createServiceDiscoveryClient,
  createServiceAuth,
  createTracer,
  createHealthMonitor,
  ServiceClient,
  HealthChecks,
  Logger,
  createLogger,
  tracingMiddleware,
  serviceAuthMiddleware,
  createHealthRoutes,
} from '@forten/shared';
import { Application } from 'express';
import { AuthEventPublisher } from './messaging/event-publisher';

// Service configuration
export interface ServiceConfig {
  serviceName: string;
  serviceVersion: string;
  port: number;
  rabbitmqUrl: string;
  registryUrl: string;
  jwtSecret: string;
  serviceSecret: string;
}

// Service dependencies
export interface ServiceDependencies {
  logger: Logger;
  rabbitmq: any;
  discovery: any;
  serviceAuth: any;
  tracer: any;
  healthMonitor: any;
  eventPublisher: AuthEventPublisher;
  serviceClients: Map<string, ServiceClient>;
}

// Initialize service infrastructure
export async function initializeService(
  app: Application,
  config: ServiceConfig
): Promise<ServiceDependencies> {
  // Create logger
  const logger = createLogger({
    service: config.serviceName,
    level: process.env.LOG_LEVEL || 'info',
  });

  logger.info('Initializing service infrastructure', {
    service: config.serviceName,
    version: config.serviceVersion,
  });

  // Create RabbitMQ client
  const rabbitmq = createRabbitMQClient({
    url: config.rabbitmqUrl,
    logger,
  });

  // Connect to RabbitMQ
  await rabbitmq.connect();

  // Create service discovery client
  const discovery = createServiceDiscoveryClient({
    registryUrl: config.registryUrl,
    logger,
  });

  // Register service with discovery
  await discovery.register({
    name: config.serviceName,
    version: config.serviceVersion,
    port: config.port,
    healthCheckUrl: `http://localhost:${config.port}/health`,
    metadata: {
      capabilities: ['authentication', 'user-management'],
    },
  });

  // Create service authentication
  const serviceAuth = createServiceAuth({
    serviceName: config.serviceName,
    serviceSecret: config.serviceSecret,
    jwtSecret: config.jwtSecret,
    logger,
  });

  // Create tracer
  const tracer = createTracer({
    serviceName: config.serviceName,
    logger,
  });

  // Create health monitor
  const healthMonitor = createHealthMonitor({
    serviceName: config.serviceName,
    serviceVersion: config.serviceVersion,
    logger,
  });

  // Register health checks
  registerHealthChecks(healthMonitor, { rabbitmq, discovery });

  // Create event publisher
  const eventPublisher = new AuthEventPublisher(rabbitmq, logger);

  // Create service clients
  const serviceClients = createServiceClients(discovery, serviceAuth, logger);

  // Apply middleware
  app.use(tracingMiddleware(tracer));
  
  // Apply service auth middleware to internal endpoints
  app.use('/internal', serviceAuthMiddleware(serviceAuth));
  
  // Add health check routes
  app.use(createHealthRoutes(healthMonitor));

  // Handle graceful shutdown
  setupGracefulShutdown({
    logger,
    rabbitmq,
    discovery,
    healthMonitor,
    tracer,
  });

  logger.info('Service infrastructure initialized successfully');

  return {
    logger,
    rabbitmq,
    discovery,
    serviceAuth,
    tracer,
    healthMonitor,
    eventPublisher,
    serviceClients,
  };
}

// Register health checks
function registerHealthChecks(
  monitor: any,
  deps: { rabbitmq: any; discovery: any }
): void {
  // Database health check
  monitor.register(
    HealthChecks.database('postgres', async () => {
      // Check database connection
      try {
        // Your database check logic here
        return true;
      } catch {
        return false;
      }
    })
  );

  // Redis health check
  monitor.register(
    HealthChecks.redis('redis', async () => {
      // Check Redis connection
      try {
        // Your Redis check logic here
        return true;
      } catch {
        return false;
      }
    })
  );

  // RabbitMQ health check
  monitor.register(
    HealthChecks.rabbitmq('rabbitmq', () => deps.rabbitmq.isConnected())
  );

  // Service discovery health check
  monitor.register({
    name: 'service_discovery',
    critical: false,
    check: async () => {
      const isRegistered = deps.discovery.isRegistered();
      
      return {
        name: 'service_discovery',
        status: isRegistered ? 'UP' : 'DOWN',
        timestamp: new Date(),
      };
    },
  });

  // Memory health check
  monitor.register(HealthChecks.memory(0.9));

  // Disk space health check
  monitor.register(HealthChecks.diskSpace('/', 0.1));
}

// Create service clients for other microservices
function createServiceClients(
  discovery: any,
  serviceAuth: any,
  logger: Logger
): Map<string, ServiceClient> {
  const clients = new Map<string, ServiceClient>();

  // Access service client
  clients.set('access-service', new ServiceClient({
    serviceName: 'access-service',
    discovery,
    logger,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
    },
    retryPolicy: {
      maxRetries: 3,
      initialDelay: 1000,
    },
  }));

  // Communication service client
  clients.set('communication-service', new ServiceClient({
    serviceName: 'communication-service',
    discovery,
    logger,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 30000,
    },
  }));

  // Analytics service client
  clients.set('analytics-service', new ServiceClient({
    serviceName: 'analytics-service',
    discovery,
    logger,
    circuitBreaker: {
      failureThreshold: 10,
      resetTimeout: 120000,
    },
  }));

  return clients;
}

// Setup graceful shutdown
function setupGracefulShutdown(deps: {
  logger: Logger;
  rabbitmq: any;
  discovery: any;
  healthMonitor: any;
  tracer: any;
}): void {
  const shutdown = async (signal: string) => {
    deps.logger.info(`Received ${signal} signal, starting graceful shutdown`);

    try {
      // Stop health checks
      deps.healthMonitor.stop();

      // Deregister from service discovery
      await deps.discovery.deregister();

      // Disconnect from RabbitMQ
      await deps.rabbitmq.disconnect();

      // Shutdown tracer
      await deps.tracer.shutdown();

      deps.logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      deps.logger.error('Error during shutdown', error as Error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}