# Access Service

The Access Service handles all access control, PIN generation, visitor management, and door control for the Forten CRM system.

## Features

- **Access Control**: PIN generation and validation for building/door access
- **Q-Box Integration**: Direct integration with Q-Box hardware for door control
- **Visitor Management**: Complete visitor lifecycle from pre-registration to checkout
- **Access Logs**: Comprehensive audit trail of all access attempts
- **Real-time Monitoring**: WebSocket-based real-time access monitoring
- **Multi-building Support**: Manage access across multiple buildings
- **Emergency Protocols**: Emergency access and unlock procedures
- **Time-based Permissions**: Schedule-based access control

## Architecture

This service follows Clean Architecture principles:

```
src/
├── domain/           # Business logic and entities
│   ├── entities/     # Core business objects
│   ├── repositories/ # Repository interfaces
│   └── value-objects/# Domain value objects
├── application/      # Use cases and application services
│   ├── use-cases/    # Business use cases
│   └── services/     # Application service interfaces
├── infrastructure/   # External dependencies
│   ├── repositories/ # Database implementations
│   ├── services/     # External service implementations
│   └── persistence/  # Database migrations
└── presentation/     # API layer
    ├── routes/       # Express routes
    ├── controllers/  # Request handlers
    ├── middleware/   # Express middleware
    └── websocket/    # WebSocket handlers
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run database migrations:
```bash
npm run migration:run
```

4. Start the service:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Access Management
- `POST /api/v1/access/generate-pin` - Generate access PIN
- `POST /api/v1/access/validate` - Validate access attempt
- `GET /api/v1/access/:id` - Get access details
- `PUT /api/v1/access/:id` - Update access
- `POST /api/v1/access/:id/suspend` - Suspend access
- `POST /api/v1/access/:id/revoke` - Revoke access

### Visitor Management
- `POST /api/v1/visitors` - Create visitor
- `POST /api/v1/visitors/check-in` - Check in visitor
- `POST /api/v1/visitors/:id/check-out` - Check out visitor
- `GET /api/v1/visitors/:id` - Get visitor details
- `GET /api/v1/visitors/expected/:date` - Get expected visitors

### Door Control
- `POST /api/v1/doors/:id/control` - Control door (lock/unlock)
- `GET /api/v1/doors/:id/status` - Get door status
- `PUT /api/v1/doors/:id/schedule` - Update door schedule

### Access Logs
- `GET /api/v1/logs` - Search access logs
- `GET /api/v1/logs/recent/:limit` - Get recent logs
- `GET /api/v1/logs/analytics/statistics` - Get access statistics
- `GET /api/v1/logs/stream` - Real-time log stream (WebSocket)

### Building Management
- `GET /api/v1/buildings` - List buildings
- `GET /api/v1/buildings/:id` - Get building details
- `GET /api/v1/buildings/:id/occupancy` - Get occupancy info

## WebSocket Events

Connect to WebSocket for real-time monitoring:

```javascript
const socket = io('http://localhost:3003', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Subscribe to building events
socket.emit('subscribe:building', 'building-id');

// Listen for events
socket.on('access:log', (data) => {
  console.log('New access log:', data);
});

socket.on('door:status', (data) => {
  console.log('Door status update:', data);
});

socket.on('security:alert', (data) => {
  console.log('Security alert:', data);
});
```

## Database Schema

The service uses PostgreSQL with the following main tables:
- `buildings` - Building information
- `doors` - Door configurations
- `accesses` - Access permissions
- `visitors` - Visitor records
- `access_logs` - Access attempt logs

## Environment Variables

Key configuration options:
- `PORT` - Service port (default: 3003)
- `DB_*` - PostgreSQL connection settings
- `REDIS_*` - Redis connection for caching
- `QBOX_*` - Q-Box API credentials
- `JWT_SECRET` - JWT signing secret
- `SMTP_*` / `SMS_*` - Notification settings

## Development

### Running Tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

### Code Style
```bash
npm run lint
npm run lint:fix
```

### Database Migrations
```bash
# Create new migration
npm run migration:create migration_name

# Run migrations
npm run migration:run

# Rollback
npm run migration:rollback
```

## Monitoring

The service exposes metrics on port 9090 (configurable) in Prometheus format:
- Access attempt counts
- Door control operations
- API response times
- WebSocket connections

## Security

- JWT-based authentication
- Role-based access control
- Rate limiting on all endpoints
- Input validation on all requests
- Audit logging for all access attempts
- Encrypted PIN storage
- Anti-passback protection

## Integration

### Q-Box Integration
The service integrates with Q-Box hardware controllers for physical door control. Configure Q-Box credentials in environment variables.

### Event Bus
All significant events are published to the message bus for other services to consume:
- ACCESS_CREATED
- ACCESS_GRANTED/DENIED
- VISITOR_CHECKED_IN/OUT
- DOOR_CONTROLLED
- SECURITY_ALERT

## License

Copyright (c) 2024 Forten CRM