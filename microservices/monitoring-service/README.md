# Monitoring Service

A comprehensive monitoring service for building management systems, providing camera management, device monitoring, event handling, and real-time alerting capabilities.

## Features

### Core Functionality
- **Camera Management**: Full CRUD operations for IP cameras with HikCentral integration
- **Device Monitoring**: Support for various building devices (doors, sensors, controllers)
- **Event Management**: Real-time event processing and acknowledgment
- **Alert System**: Multi-channel notifications (email, SMS, push, webhook)
- **Live Streaming**: Real-time video streaming with WebSocket support
- **Recording Management**: Video playback and download capabilities
- **Motion Detection**: Configurable motion detection with region support
- **Building Management**: Multi-building support with floor-based organization

### Integrations
- **HikCentral API**: Camera management and video streaming
- **Q-Box Integration**: Door control and access management
- **WebSocket**: Real-time communication for live monitoring
- **PostgreSQL**: Robust data persistence with optimized queries

### Architecture
- **Clean Architecture**: Domain-driven design with clear separation of concerns
- **RESTful API**: Well-documented endpoints with OpenAPI/Swagger support
- **Real-time Updates**: WebSocket connections for live monitoring
- **Microservice Ready**: Containerized with Docker support
- **Scalable Design**: Horizontal scaling support with load balancing

## Quick Start

### Prerequisites
- Node.js 16+ 
- PostgreSQL 12+
- Docker (optional)
- FFmpeg (for video processing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd monitoring-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Setup database**
   ```bash
   # Create database
   createdb monitoring_db
   
   # Run migrations
   psql -d monitoring_db -f migrations/001_initial_schema.sql
   ```

5. **Start the service**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

### Docker Deployment

1. **Build image**
   ```bash
   docker build -t monitoring-service .
   ```

2. **Run with docker-compose**
   ```bash
   docker-compose up -d
   ```

## API Documentation

### Authentication
All API endpoints require JWT authentication:
```bash
Authorization: Bearer <jwt-token>
```

### Core Endpoints

#### Buildings
- `GET /api/v1/buildings` - List all buildings
- `POST /api/v1/buildings` - Create new building
- `GET /api/v1/buildings/:id` - Get building details
- `PUT /api/v1/buildings/:id` - Update building
- `DELETE /api/v1/buildings/:id` - Delete building

#### Cameras
- `GET /api/v1/cameras` - List cameras for building
- `POST /api/v1/cameras` - Add new camera
- `GET /api/v1/cameras/:id` - Get camera details
- `PUT /api/v1/cameras/:id` - Update camera
- `DELETE /api/v1/cameras/:id` - Remove camera
- `POST /api/v1/cameras/:id/stream/live` - Start live stream
- `POST /api/v1/cameras/:id/stream/playback` - Start playback stream
- `POST /api/v1/cameras/:id/snapshot` - Capture snapshot
- `POST /api/v1/cameras/:id/ptz` - Control PTZ

#### Events & Alerts
- `GET /api/v1/events` - List events with filtering
- `PATCH /api/v1/events/:id/acknowledge` - Acknowledge event
- `GET /api/v1/alerts` - List alerts
- `PATCH /api/v1/alerts/:id/read` - Mark alert as read

### WebSocket Events

#### Connection
```javascript
const socket = io('ws://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

#### Real-time Events
- `camera:status_changed` - Camera online/offline status
- `motion:detected` - Motion detection events
- `door:event` - Door open/close events
- `alert:new` - New alert notifications
- `event:new` - New system events

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `JWT_SECRET` | JWT signing secret | Required |
| `HIK_CENTRAL_BASE_URL` | HikCentral API URL | Required |
| `QBOX_BASE_URL` | Q-Box API URL | Required |

### Camera Configuration
```json
{
  "capabilities": {
    "ptz": true,
    "zoom": true,
    "nightVision": true,
    "audioRecording": false,
    "motionDetection": true,
    "faceRecognition": false,
    "licenseReading": false,
    "resolution": "1920x1080",
    "fps": 30
  },
  "recording": {
    "enabled": true,
    "retention": 30,
    "quality": "high",
    "schedule": [
      {
        "dayOfWeek": 1,
        "startTime": "08:00",
        "endTime": "18:00"
      }
    ]
  },
  "motionDetection": {
    "enabled": true,
    "sensitivity": 75,
    "regions": [
      {
        "id": "entrance",
        "name": "Main Entrance",
        "coordinates": [
          {"x": 100, "y": 100},
          {"x": 500, "y": 100},
          {"x": 500, "y": 400},
          {"x": 100, "y": 400}
        ],
        "sensitivity": 80
      }
    ]
  }
}
```

## Development

### Project Structure
```
src/
├── domain/              # Business logic and entities
│   ├── entities/        # Domain models
│   └── repositories/    # Repository interfaces
├── application/         # Use cases and business rules
│   └── use-cases/       # Application services
├── infrastructure/      # External concerns
│   ├── repositories/    # Database implementations
│   ├── services/        # External service clients
│   └── websocket/       # WebSocket implementation
├── presentation/        # API layer
│   ├── controllers/     # HTTP controllers
│   ├── routes/          # Route definitions
│   └── middleware/      # Authentication, validation
├── config/              # Configuration
└── utils/               # Utilities and helpers
```

### Testing
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
```

## Monitoring & Health Checks

### Health Endpoint
```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "monitoring-service",
  "version": "1.0.0",
  "uptime": 3600,
  "database": {
    "status": "healthy",
    "details": {
      "totalConnections": 5,
      "idleConnections": 3,
      "waitingClients": 0
    }
  },
  "websocket": {
    "totalConnections": 12,
    "uniqueUsers": 8,
    "buildingSubscriptions": 4
  }
}
```

### Metrics & Logging
- **Structured Logging**: Winston-based logging with multiple transports
- **Performance Metrics**: Response times and database query performance
- **Error Tracking**: Comprehensive error logging and tracking
- **System Health**: Regular health checks for all components

## Deployment

### Production Considerations
- Use environment-specific configuration
- Enable SSL/TLS for secure communication
- Configure proper logging levels
- Set up monitoring and alerting
- Use a process manager (PM2, systemd)
- Configure reverse proxy (nginx)
- Set up database backups
- Configure log rotation

### Scaling
- Horizontal scaling with load balancers
- Database read replicas for read-heavy workloads
- Redis for session management and caching
- CDN for static assets and video content
- Message queues for async processing

## Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Permission-based authorization
- API key support for service-to-service communication

### Data Protection
- Encrypted database connections
- Secure password storage
- Input validation and sanitization
- Rate limiting and DDoS protection
- CORS configuration

## Support

### Troubleshooting
- Check service logs in `logs/` directory
- Verify database connectivity
- Ensure external services (HikCentral, Q-Box) are accessible
- Check WebSocket connections
- Validate JWT tokens

### Common Issues
1. **Camera Connection Failed**: Verify IP address, credentials, and network connectivity
2. **Database Connection Error**: Check PostgreSQL service and credentials
3. **WebSocket Connection Issues**: Verify JWT token and CORS settings
4. **Streaming Failures**: Ensure FFmpeg is installed and accessible

For additional support, please refer to the project documentation or contact the development team.