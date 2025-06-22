# FORTEN Microservices Architecture

## Overview

FORTEN has been architected as a microservices-based system to provide scalability, maintainability, and independent deployment capabilities for each business domain. The system separates concerns into dedicated services that communicate through well-defined APIs and event-driven patterns.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Mobile App    │    │  External APIs  │
│   (React)       │    │   (React Native)│    │  (HikCentral)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Load Balancer       │
                    │        (Nginx)           │
                    └─────────────┬─────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      API Gateway         │
                    │   (Authentication,       │
                    │   Rate Limiting,         │
                    │   Request Routing)       │
                    └─────────────┬─────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                       │                        │
┌───────▼────────┐    ┌─────────▼─────────┐    ┌─────────▼─────────┐
│   Auth Service │    │ Monitoring Service│    │  Access Service   │
│   (Port 3001)  │    │   (Port 3002)     │    │   (Port 3003)     │
└────────────────┘    └───────────────────┘    └───────────────────┘
        │                       │                        │
        │              ┌────────▼────────┐               │
        │              │ Communication   │               │
        │              │    Service      │               │
        │              │  (Port 3004)    │               │
        │              └─────────────────┘               │
        │                       │                        │
        │              ┌────────▼────────┐               │
        │              │   Analytics     │               │
        │              │    Service      │               │
        │              │  (Port 3005)    │               │
        │              └─────────────────┘               │
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                               │
           ┌────────────────────┼────────────────────┐
           │                   │                    │
    ┌──────▼──────┐    ┌───────▼───────┐    ┌──────▼──────┐
    │ PostgreSQL  │    │    Redis      │    │  RabbitMQ   │
    │ (Database)  │    │   (Cache)     │    │ (Messages)  │
    └─────────────┘    └───────────────┘    └─────────────┘
```

## Service Breakdown

### 1. API Gateway (Port 3000)
**Purpose**: Single entry point for all client requests

**Responsibilities**:
- Request routing to appropriate microservices
- Authentication and authorization (JWT validation)
- Rate limiting and throttling
- CORS handling
- Request/response logging
- Circuit breaker pattern for service resilience
- Service discovery integration

**Technologies**: Node.js, Express, Redis, Winston

### 2. Auth Service (Port 3001)
**Purpose**: User authentication and authorization management

**Responsibilities**:
- User registration and login
- JWT token generation and validation
- Password reset and email verification
- Two-factor authentication (2FA)
- Role and permission management
- Session management with Redis
- Security event logging

**Technologies**: Node.js, Express, PostgreSQL, Redis, bcrypt, speakeasy

**Database**: `forten_auth`
- users, roles, permissions tables
- user_roles, role_permissions (many-to-many)
- security_events table

### 3. Monitoring Service (Port 3002)
**Purpose**: Building and camera monitoring system

**Responsibilities**:
- Integration with HikCentral API for camera management
- Live video streaming and recording management
- Motion detection and alert generation
- Building and device status monitoring
- Q-Box integration for door control
- Real-time event streaming via WebSocket
- Device health monitoring

**Technologies**: Node.js, Express, PostgreSQL, Socket.io, FFmpeg

**Database**: `forten_monitoring`
- buildings, cameras, devices tables
- events, alerts tables
- streaming_sessions table

**External Integrations**:
- HikCentral API for camera management
- Q-Box API for access control hardware

### 4. Access Service (Port 3003)
**Purpose**: Access control and door management

**Responsibilities**:
- PIN generation and validation
- Visitor management system
- Access log tracking and audit trails
- Time-based access permissions
- Emergency access protocols
- Multi-building access control
- Q-Box integration for door operations

**Technologies**: Node.js, Express, PostgreSQL, Socket.io

**Database**: `forten_access`
- accesses, access_logs tables
- visitors, door_schedules tables
- emergency_access table

### 5. Communication Service (Port 3004)
**Purpose**: Multi-channel communication management

**Responsibilities**:
- WhatsApp messaging via Twilio
- Email notifications (SMTP/SendGrid)
- SMS messaging
- Push notifications for mobile apps
- Notification templates and personalization
- Campaign management and scheduling
- Communication preferences
- Delivery status tracking

**Technologies**: Node.js, Express, PostgreSQL, Bull Queue, Redis

**Database**: `forten_communication`
- notifications, templates tables
- contacts, campaigns tables
- delivery_logs table

**External Integrations**:
- Twilio for WhatsApp and SMS
- SendGrid for email
- Firebase for push notifications

### 6. Analytics Service (Port 3005)
**Purpose**: Business intelligence and reporting

**Responsibilities**:
- Data aggregation from all microservices
- Report generation (PDF, Excel, CSV)
- Real-time dashboard metrics
- KPI calculation and tracking
- Custom query builder
- Data visualization
- Scheduled reports
- Performance monitoring

**Technologies**: Node.js, Express, TimescaleDB, Redis, Puppeteer

**Database**: `forten_analytics` (TimescaleDB)
- reports, metrics tables
- dashboards, queries tables
- time-series data for analytics

## Communication Patterns

### 1. Synchronous Communication (HTTP/REST)
- Client-to-service via API Gateway
- Service-to-service for immediate responses
- Circuit breaker pattern for resilience

### 2. Asynchronous Communication (Event-Driven)
- RabbitMQ for service-to-service events
- Dead letter queues for failed messages
- Retry policies with exponential backoff

### 3. Real-time Communication
- WebSocket connections for live monitoring
- Socket.io for real-time updates
- Building-specific subscriptions

## Key Events

### Auth Service Events
- `user.created`: New user registration
- `user.updated`: User profile changes
- `user.deleted`: User account deletion
- `user.login`: User authentication
- `user.logout`: User session end

### Access Service Events
- `access.granted`: Successful access
- `access.denied`: Failed access attempt
- `door.opened`: Door operation
- `visitor.checked_in`: Visitor arrival
- `emergency.triggered`: Emergency access

### Monitoring Service Events
- `camera.offline`: Camera connectivity issues
- `motion.detected`: Motion detection alert
- `alert.triggered`: System alert generation
- `device.status_changed`: Device status update

### Communication Service Events
- `notification.sent`: Message delivery
- `notification.failed`: Delivery failure
- `campaign.started`: Campaign initiation
- `template.updated`: Template modification

## Data Flow Examples

### 1. User Access Flow
```
1. User presents PIN at door
2. Access Service validates PIN
3. Access Service publishes access.granted event
4. Monitoring Service logs security event
5. Communication Service sends notification
6. Analytics Service records access metrics
```

### 2. Alert Generation Flow
```
1. Camera detects motion (Monitoring Service)
2. Monitoring Service publishes motion.detected event
3. Communication Service sends WhatsApp alert
4. Analytics Service records incident metrics
5. Access Service checks current access permissions
```

## Infrastructure

### Databases
- **PostgreSQL**: Primary database for all services
- **TimescaleDB**: Time-series data for analytics
- **Redis**: Caching and session storage

### Message Broker
- **RabbitMQ**: Event-driven communication
- Dead letter queues for failed messages
- Message persistence and delivery guarantees

### Monitoring and Observability
- **Prometheus**: Metrics collection
- **Grafana**: Dashboard and visualization
- **Jaeger**: Distributed tracing
- **Winston**: Structured logging

### Container Orchestration
- **Docker**: Service containerization
- **Docker Compose**: Local development
- **Kubernetes**: Production deployment

## Security

### Authentication & Authorization
- JWT tokens for stateless authentication
- Service-to-service authentication
- Role-based access control (RBAC)
- API rate limiting and throttling

### Data Protection
- Encryption at rest and in transit
- Secure password storage with bcrypt
- Input validation and sanitization
- SQL injection prevention

### Network Security
- HTTPS/TLS termination at load balancer
- Private network communication between services
- Firewall rules and network segmentation

## Deployment

### Development Environment
```bash
# Start all services locally
make dev

# Individual service logs
make logs-auth
make logs-monitoring
```

### Production Environment
```bash
# Deploy with Docker Compose
make prod

# Deploy to Kubernetes
kubectl apply -f deployment/kubernetes/
```

### Health Checks
```bash
# Check all service health
make health

# Individual service status
curl http://localhost:3001/health
```

## Scalability Considerations

### Horizontal Scaling
- Stateless service design
- Load balancing at API Gateway
- Database connection pooling
- Redis clustering for high availability

### Performance Optimization
- Response caching with Redis
- Database query optimization
- Image optimization for cameras
- CDN for static assets

### Monitoring and Alerting
- Service health monitoring
- Performance metrics tracking
- Error rate monitoring
- Business KPI tracking

## Migration Strategy

The system was migrated from a monolithic architecture to microservices:

1. **Domain Extraction**: Identified bounded contexts
2. **Data Migration**: Separated databases by domain
3. **API Refactoring**: Created service-specific APIs
4. **Event Integration**: Implemented event-driven communication
5. **Gradual Rollout**: Service-by-service deployment

## Future Enhancements

- **Service Mesh**: Istio for advanced traffic management
- **Event Sourcing**: Complete audit trail implementation
- **CQRS**: Command Query Responsibility Segregation
- **Machine Learning**: Predictive analytics integration
- **Edge Computing**: Local processing for cameras
- **Blockchain**: Immutable audit logging