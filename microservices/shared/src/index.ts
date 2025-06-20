// Main exports for @forten/shared package

// Export all types
export * from './types';

// Export all events
export * from './events';
export * from './events/access-events';

// Export all errors
export * from './errors';

// Export logger
export * from './logger';

// Export authentication middleware
export * from './middleware/auth';

// Export service authentication
export * from './auth/service-auth';

// Export messaging
export * from './messaging/rabbitmq';

// Export service discovery
export * from './service-discovery/service-registry';

// Export HTTP client
export * from './http/service-client';

// Export distributed tracing
export * from './tracing/distributed-tracing';

// Export health checks
export * from './health/health-check';

// Export database utilities
export * from './database/base-repository';

// Re-export commonly used external types
export { Request, Response, NextFunction } from 'express';
export { Connection, Channel, ConsumeMessage } from 'amqplib';