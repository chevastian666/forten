# Microservices Communication Guide

This guide explains how to implement and use the communication patterns between microservices in the Forten CRM system.

## Table of Contents

1. [Overview](#overview)
2. [Service Discovery](#service-discovery)
3. [Event-Driven Communication](#event-driven-communication)
4. [HTTP Service-to-Service Communication](#http-service-to-service-communication)
5. [Service Authentication](#service-authentication)
6. [Health Checks](#health-checks)
7. [Distributed Tracing](#distributed-tracing)
8. [Circuit Breaker Pattern](#circuit-breaker-pattern)
9. [Event Patterns](#event-patterns)

## Overview

The microservices communicate using:
- **RabbitMQ** for asynchronous event-driven communication
- **HTTP REST APIs** for synchronous service-to-service calls
- **Service Discovery** for dynamic service location
- **JWT tokens** for service authentication
- **Distributed tracing** for request tracking across services

## Service Discovery

### Registering a Service

```typescript
import { createServiceDiscoveryClient } from '@forten/shared';

const discovery = createServiceDiscoveryClient({
  registryUrl: 'http://api-gateway:3000',
  logger,
});

await discovery.register({
  name: 'auth-service',
  version: '1.0.0',
  port: 3001,
  healthCheckUrl: 'http://auth-service:3001/health',
  metadata: {
    capabilities: ['authentication', 'user-management'],
  },
});
```

### Discovering Services

```typescript
// Find all instances of a service
const instances = await discovery.discover('access-service');

// Get a single instance with load balancing
const instance = await discovery.getServiceInstance('access-service');

// Get service URL
const url = await discovery.getServiceUrl('access-service');
```

## Event-Driven Communication

### Publishing Events

```typescript
import { RabbitMQClient, EventBuilder, EventType } from '@forten/shared';

const rabbitmq = createRabbitMQClient({
  url: 'amqp://rabbitmq:5672',
  logger,
});

await rabbitmq.connect();

// Publish an event
const event = EventBuilder.create(
  EventType.USER_CREATED,
  {
    data: {
      userId: '123',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
    },
  },
  'auth-service'
);

await rabbitmq.publish(event);
```

### Subscribing to Events

```typescript
await rabbitmq.subscribe({
  eventType: EventType.USER_CREATED,
  handler: async (event) => {
    console.log('User created:', event.data);
    // Process the event
  },
  queue: 'access-service.user.created',
  retries: 3,
  retryDelay: 1000,
});
```

## HTTP Service-to-Service Communication

### Creating Service Clients

```typescript
import { ServiceClient } from '@forten/shared';

const accessClient = new ServiceClient({
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
});

// Make requests
const response = await accessClient.get('/api/doors');
const door = await accessClient.post('/api/doors', { 
  name: 'Main Entrance',
  buildingId: '123',
});
```

## Service Authentication

### Setting Up Service Auth

```typescript
import { createServiceAuth } from '@forten/shared';

const serviceAuth = createServiceAuth({
  serviceName: 'auth-service',
  serviceSecret: process.env.SERVICE_SECRET,
  jwtSecret: process.env.JWT_SECRET,
  logger,
});

// Generate token for service-to-service calls
const authHeader = await serviceAuth.createAuthHeader('access-service');

// Use in HTTP client
const response = await axios.get(url, {
  headers: authHeader,
});
```

### Protecting Service Endpoints

```typescript
import { serviceAuthMiddleware } from '@forten/shared';

// Protect internal endpoints
app.use('/internal', serviceAuthMiddleware(serviceAuth, ['internal:read']));

// Access service identity in handlers
app.get('/internal/data', (req, res) => {
  const { serviceIdentity } = req;
  console.log('Request from:', serviceIdentity.name);
});
```

## Health Checks

### Registering Health Checks

```typescript
import { createHealthMonitor, HealthChecks } from '@forten/shared';

const healthMonitor = createHealthMonitor({
  serviceName: 'auth-service',
  serviceVersion: '1.0.0',
  logger,
});

// Register built-in checks
healthMonitor.register(
  HealthChecks.database('postgres', async () => {
    return await db.ping();
  })
);

healthMonitor.register(
  HealthChecks.rabbitmq('rabbitmq', () => rabbitmq.isConnected())
);

healthMonitor.register(
  HealthChecks.httpService('access-service', 'http://access-service:3002')
);

// Add health routes
app.use(createHealthRoutes(healthMonitor));
```

### Health Check Endpoints

- `GET /health` - Full health report
- `GET /health/live` - Liveness probe (is service alive?)
- `GET /health/ready` - Readiness probe (can accept traffic?)

## Distributed Tracing

### Setting Up Tracing

```typescript
import { createTracer, tracingMiddleware } from '@forten/shared';

const tracer = createTracer({
  serviceName: 'auth-service',
  logger,
});

// Apply middleware
app.use(tracingMiddleware(tracer));

// Create child spans
app.post('/api/users', async (req, res) => {
  const span = req.span;
  
  // Create child span for database operation
  const dbSpan = tracer.startChildSpan('db.insert', span);
  dbSpan.setAttribute('db.table', 'users');
  
  try {
    const user = await db.users.insert(req.body);
    dbSpan.setStatus('ok');
    res.json(user);
  } catch (error) {
    dbSpan.setStatus('error', error.message);
    throw error;
  } finally {
    dbSpan.end();
  }
});
```

## Circuit Breaker Pattern

The circuit breaker prevents cascading failures:

```typescript
const client = new ServiceClient({
  serviceName: 'external-service',
  circuitBreaker: {
    failureThreshold: 5,      // Open after 5 failures
    successThreshold: 2,      // Close after 2 successes
    timeout: 10000,          // Request timeout
    resetTimeout: 60000,     // Try half-open after 60s
  },
});

// Monitor circuit state
client.onCircuitEvent('circuit:state_changed', (state) => {
  console.log('Circuit state:', state);
});

// Check circuit state
const state = client.getCircuitState();
if (state === 'OPEN') {
  console.log('Circuit is open, requests will fail fast');
}
```

## Event Patterns

### Access Control Events

```typescript
// Access granted
await eventPublisher.publishAccessGranted({
  userId: '123',
  doorId: 'door-1',
  buildingId: 'building-1',
  accessMethod: 'card',
  timestamp: new Date(),
});

// Door forced
await eventPublisher.publishDoorForced({
  doorId: 'door-1',
  buildingId: 'building-1',
  timestamp: new Date(),
  severity: 'critical',
});
```

### Monitoring Events

```typescript
// Camera offline
await eventPublisher.publishCameraOffline({
  cameraId: 'camera-1',
  buildingId: 'building-1',
  lastSeen: new Date(),
  reason: 'Network timeout',
});

// Alert triggered
await eventPublisher.publishAlertTriggered({
  alertId: 'alert-1',
  type: 'security',
  severity: 'high',
  source: 'door-1',
  description: 'Unauthorized access attempt',
  timestamp: new Date(),
});
```

### Analytics Aggregation

The analytics service automatically aggregates all events:

```typescript
// Events are automatically processed for:
// - Real-time metrics
// - Time-series data
// - Aggregated reports
// - Derived metrics (success rates, availability, etc.)
```

## Best Practices

1. **Always use service discovery** for dynamic service location
2. **Implement retry logic** for transient failures
3. **Use circuit breakers** to prevent cascading failures
4. **Add correlation IDs** to track requests across services
5. **Monitor health endpoints** regularly
6. **Handle events idempotently** to support retries
7. **Use dead letter queues** for failed messages
8. **Implement graceful shutdown** to avoid data loss
9. **Log with structured data** including trace IDs
10. **Set appropriate timeouts** for all operations

## Error Handling

```typescript
// Handle RabbitMQ connection errors
rabbitmq.on('error', (error) => {
  logger.error('RabbitMQ error:', error);
});

// Handle service discovery errors
discovery.on('registry:disconnected', () => {
  logger.warn('Lost connection to service registry');
});

// Handle circuit breaker rejections
try {
  await client.get('/api/data');
} catch (error) {
  if (error.message === 'Circuit breaker is OPEN') {
    // Handle circuit open scenario
    return cachedData;
  }
  throw error;
}
```

## Monitoring and Observability

1. **Health Checks**: Monitor `/health` endpoints
2. **Metrics**: Track request rates, error rates, latency
3. **Distributed Tracing**: Follow requests across services
4. **Event Monitoring**: Track event publishing/consumption rates
5. **Circuit Breaker State**: Monitor circuit states and failures
6. **Service Discovery**: Track service registrations/deregistrations

## Deployment Considerations

1. **Environment Variables**:
   ```env
   RABBITMQ_URL=amqp://rabbitmq:5672
   REGISTRY_URL=http://api-gateway:3000
   SERVICE_SECRET=your-service-secret
   JWT_SECRET=your-jwt-secret
   ```

2. **Docker Networking**: Ensure services can communicate
3. **Load Balancing**: Use service discovery for client-side load balancing
4. **Scaling**: Services automatically register new instances
5. **Rolling Updates**: Graceful shutdown ensures zero downtime