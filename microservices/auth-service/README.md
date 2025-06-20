# Forten CRM - Auth Service

A robust authentication microservice built with Clean Architecture principles for the Forten CRM system.

## Features

- **User Authentication**: Login/logout with JWT tokens
- **User Registration**: Email verification and account activation
- **Password Management**: Reset and recovery functionality
- **Two-Factor Authentication (2FA)**: TOTP-based with QR codes
- **Role-Based Access Control**: Users, roles, and permissions
- **Session Management**: Redis-based session storage
- **Security Features**: Rate limiting, account lockout, suspicious activity detection

## Architecture

This service follows Clean Architecture principles:

```
src/
├── domain/                 # Business logic and entities
│   ├── entities/          # Domain entities (User, Role, Permission)
│   └── repositories/      # Repository interfaces
├── application/           # Use cases and business rules
│   ├── use-cases/        # Application use cases
│   └── services/         # Service interfaces
├── infrastructure/       # External concerns
│   ├── database/         # Database configuration and migrations
│   ├── repositories/     # Repository implementations
│   └── services/        # Service implementations
└── presentation/         # HTTP controllers and routes
    ├── controllers/      # Request handlers
    ├── middleware/       # Express middleware
    └── routes/          # Route definitions
```

## Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Docker (optional)

## Installation

1. **Clone and navigate to the service directory:**
   ```bash
   cd microservices/auth-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up databases:**
   ```bash
   # Create PostgreSQL database
   createdb forten_auth
   
   # Run migrations
   npm run migrate
   ```

5. **Start the service:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3001` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `forten_auth` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `ACCESS_TOKEN_SECRET` | JWT access token secret | Required |
| `REFRESH_TOKEN_SECRET` | JWT refresh token secret | Required |
| `SMTP_HOST` | Email SMTP host | Required |
| `SMTP_USER` | Email SMTP user | Required |
| `SMTP_PASS` | Email SMTP password | Required |

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/profile` - Get user profile

### Email Verification

- `GET /api/auth/verify-email/:token` - Verify email address

### Password Reset

- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Two-Factor Authentication

- `POST /api/auth/2fa/enable` - Enable 2FA
- `POST /api/auth/2fa/verify` - Verify 2FA setup
- `POST /api/auth/2fa/disable` - Disable 2FA

### Health Check

- `GET /health` - Service health status

## Database Schema

### Users Table
- User credentials and profile information
- Email verification status
- Two-factor authentication settings
- Account security (failed attempts, lockout)

### Roles Table
- Role definitions with descriptions
- System vs custom roles

### Permissions Table
- Granular permissions with resource/action pairs
- Hierarchical permission structure

### Junction Tables
- `user_roles`: Many-to-many user-role relationships
- `role_permissions`: Many-to-many role-permission relationships

## Security Features

### Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character
- bcrypt hashing with salt rounds

### Account Protection
- Failed login attempt tracking
- Temporary account lockout after 5 failed attempts
- Email notifications for suspicious activity

### Token Security
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Secure token storage in Redis
- Token invalidation on logout

### Rate Limiting
- Global API rate limit: 100 requests/15 minutes
- Auth endpoints: 5 attempts/15 minutes

## Docker Support

```bash
# Build image
docker build -t forten-auth-service .

# Run container
docker run -p 3001:3001 \
  -e DB_HOST=host.docker.internal \
  -e REDIS_HOST=host.docker.internal \
  forten-auth-service
```

## Development

### Running Tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

### Code Quality
```bash
npm run lint
npm run lint:fix
```

### Database Operations
```bash
# Run migrations
npm run migrate

# Rollback migration
npm run migrate:rollback

# Create new migration
npm run migrate:make migration_name
```

## Deployment

### Environment Setup
1. Set production environment variables
2. Use strong secrets for JWT tokens
3. Configure SSL/TLS for database connections
4. Set up monitoring and logging

### Health Monitoring
The service provides a health check endpoint at `/health` that returns:
- Service status
- Database connectivity
- Redis connectivity
- Timestamp

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check connection credentials
   - Ensure database exists

2. **Redis Connection Failed**
   - Verify Redis is running
   - Check Redis configuration
   - Verify network connectivity

3. **Email Not Sending**
   - Check SMTP configuration
   - Verify email credentials
   - Check firewall settings

4. **JWT Token Issues**
   - Ensure secrets are properly set
   - Check token expiration settings
   - Verify token format

## Contributing

1. Follow the existing code structure
2. Write tests for new features
3. Update documentation
4. Follow conventional commit messages

## License

This project is part of the Forten CRM system.