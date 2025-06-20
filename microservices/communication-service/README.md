# Communication Service

A comprehensive microservice for handling multi-channel communications including WhatsApp, Email, SMS, and Push notifications.

## Features

- **Multi-Channel Support**: Email, SMS, WhatsApp, and Push notifications
- **Template Management**: Create and manage reusable message templates with multi-language support
- **Campaign Management**: Create and execute notification campaigns with audience targeting
- **Contact Management**: Manage contacts with channel preferences and subscription status
- **Queue System**: Reliable message delivery with retry mechanisms
- **Webhook Integration**: Real-time delivery status updates
- **Analytics**: Track delivery rates, open rates, and click rates
- **Clean Architecture**: Domain-driven design with clear separation of concerns

## Technology Stack

- Node.js with TypeScript
- Express.js for REST API
- PostgreSQL with TypeORM
- Redis with Bull for queue management
- Twilio for SMS/WhatsApp
- SendGrid/SMTP for Email
- Firebase for Push notifications
- Docker for containerization

## Project Structure

```
src/
├── domain/              # Domain entities and repository interfaces
│   ├── entities/        # Business entities (Notification, Template, Contact, Campaign)
│   └── repositories/    # Repository interfaces
├── application/         # Application business logic
│   ├── use-cases/       # Use case implementations
│   └── interfaces/      # Application service interfaces
├── infrastructure/      # External service implementations
│   ├── database/        # Database entities and migrations
│   ├── repositories/    # Repository implementations
│   └── services/        # External service integrations
└── presentation/        # API layer
    ├── routes/          # Express routes
    ├── controllers/     # Request handlers
    └── middleware/      # Express middleware
```

## API Endpoints

### Notifications
- `POST /api/v1/notifications` - Send a single notification
- `POST /api/v1/notifications/batch` - Send batch notifications
- `GET /api/v1/notifications/:id` - Get notification by ID
- `GET /api/v1/notifications` - List notifications with filters
- `GET /api/v1/notifications/stats/delivery` - Get delivery statistics
- `POST /api/v1/notifications/:id/cancel` - Cancel a pending notification
- `POST /api/v1/notifications/:id/retry` - Retry a failed notification

### Templates
- `POST /api/v1/templates` - Create a new template
- `GET /api/v1/templates/:id` - Get template by ID
- `GET /api/v1/templates` - List templates with filters
- `PUT /api/v1/templates/:id` - Update template
- `DELETE /api/v1/templates/:id` - Delete template
- `POST /api/v1/templates/:id/activate` - Activate template
- `POST /api/v1/templates/:id/deactivate` - Deactivate template

### Campaigns
- `POST /api/v1/campaigns` - Create a new campaign
- `GET /api/v1/campaigns/:id` - Get campaign by ID
- `GET /api/v1/campaigns` - List campaigns with filters
- `PUT /api/v1/campaigns/:id` - Update campaign
- `POST /api/v1/campaigns/:id/start` - Start campaign
- `POST /api/v1/campaigns/:id/pause` - Pause campaign
- `POST /api/v1/campaigns/:id/resume` - Resume campaign
- `POST /api/v1/campaigns/:id/cancel` - Cancel campaign

### Contacts
- `POST /api/v1/contacts` - Create a new contact
- `GET /api/v1/contacts/:id` - Get contact by ID
- `GET /api/v1/contacts` - List contacts with filters
- `PUT /api/v1/contacts/:id` - Update contact
- `PUT /api/v1/contacts/:id/preferences` - Update contact preferences
- `POST /api/v1/contacts/:id/unsubscribe` - Unsubscribe contact

### Webhooks
- `POST /webhooks/twilio/status` - Twilio status webhook
- `POST /webhooks/sendgrid/events` - SendGrid event webhook
- `POST /webhooks/generic/:provider` - Generic webhook endpoint

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and configure your settings
3. Install dependencies: `npm install`
4. Run database migrations: `npm run migration:run`
5. Start the service: `npm run dev`

## Environment Variables

See `.env.example` for all available configuration options.

## Docker

Build and run with Docker:

```bash
docker build -t communication-service .
docker run -p 3003:3003 communication-service
```

## Testing

```bash
npm test                 # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
```

## License

ISC