# API Gateway Service

The API Gateway is the single entry point for all client requests to the Forten CRM microservices architecture. It handles routing, authentication, rate limiting, and provides resilience patterns.

## Features

- **Request Routing**: Routes requests to appropriate microservices
- **Authentication**: Validates JWT tokens and forwards user context
- **Rate Limiting**: Protects services from abuse
- **Circuit Breaker**: Prevents cascading failures
- **Health Checks**: Monitors all downstream services
- **Request/Response Logging**: Comprehensive logging with Winston
- **CORS Handling**: Configurable CORS support
- **Response Compression**: Gzip compression for responses
- **Security Headers**: Helmet.js for security best practices

## Architecture

The API Gateway sits between clients and microservices:

```
Client -> API Gateway -> Microservices
                     |-> Auth Service
                     |-> User Service
                     |-> CRM Service
                     |-> Notification Service
                     |-> Audit Service
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key environment variables:

- `PORT`: Gateway port (default: 3000)
- `JWT_SECRET`: Secret for JWT verification
- `*_SERVICE_URL`: URLs for each microservice
- `RATE_LIMIT_*`: Rate limiting configuration
- `CIRCUIT_BREAKER_*`: Circuit breaker configuration

### Running

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

### Docker

Build image:
```bash
docker build -t forten-api-gateway .
```

Run container:
```bash
docker run -p 3000:3000 --env-file .env forten-api-gateway
```

## API Routes

### Public Routes (No Authentication)

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Protected Routes (Authentication Required)

All other routes require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

#### User Service
- `/api/users/*`

#### CRM Service
- `/api/contacts/*`
- `/api/companies/*`
- `/api/deals/*`
- `/api/activities/*`
- `/api/tasks/*`
- `/api/pipelines/*`

#### Notification Service
- `/api/notifications/*`

#### Audit Service
- `/api/audit/*`

## Health Endpoints

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with all services
- `GET /health/services/:serviceName` - Specific service health
- `GET /health/metrics` - System metrics
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## Security Features

### Rate Limiting
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables
- Excludes health check endpoints

### Circuit Breaker
- Opens after 50% error rate
- 30-second reset timeout
- Prevents cascading failures

### Authentication
- JWT token validation
- User context forwarding via headers:
  - `X-User-Id`
  - `X-User-Email`
  - `X-User-Role`
  - `X-Tenant-Id`

### Security Headers
- Content Security Policy
- HSTS
- X-Frame-Options
- X-Content-Type-Options
- And more via Helmet.js

## Monitoring

### Logging
- Structured JSON logging in production
- Colored console output in development
- Request/response logging
- Error tracking

### Health Checks
- Automatic health checks every 30 seconds
- Circuit breaker integration
- Service availability monitoring

## Development

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npx tsc --noEmit
```

## Troubleshooting

### Service Unavailable (503)
- Check if the target service is running
- Review circuit breaker status at `/health/detailed`
- Check service health at `/health/services/:serviceName`

### Rate Limit Exceeded (429)
- Wait for the rate limit window to reset
- Check `Retry-After` header for wait time

### Authentication Failed (401/403)
- Verify JWT token is valid and not expired
- Ensure token is properly formatted in Authorization header

## Performance Considerations

- Response compression enabled by default
- Circuit breaker prevents unnecessary requests to failing services
- Health checks cached for 30 seconds
- Proxy timeout set to 3 seconds by default