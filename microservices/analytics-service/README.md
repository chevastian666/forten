# Analytics Service

The Analytics Service is a comprehensive business intelligence and reporting microservice for the Forten CRM system. It provides real-time metrics, customizable dashboards, report generation, and advanced data analytics capabilities.

## Features

- **Report Generation**: Create PDF, Excel, and CSV reports with customizable templates
- **Real-time Dashboards**: Interactive dashboards with various widget types
- **Metrics & KPIs**: Track and calculate business metrics with threshold alerts
- **Data Aggregation**: ETL pipelines for data processing and aggregation
- **Query Builder**: Custom query interface for ad-hoc analysis
- **Scheduled Reports**: Automated report generation and email delivery
- **Data Visualization**: Charts, graphs, and advanced visualizations
- **Performance Monitoring**: Track service performance across the system
- **Data Warehouse**: TimescaleDB integration for time-series data

## Architecture

The service follows Clean Architecture principles:

```
src/
├── domain/           # Business logic and entities
│   ├── entities/     # Report, Metric, Dashboard, Query, Dataset
│   └── repositories/ # Repository interfaces
├── application/      # Use cases and application services
│   ├── use-cases/    # Business operations
│   └── interfaces/   # Service interfaces
├── infrastructure/   # External dependencies
│   ├── database/     # PostgreSQL + TimescaleDB
│   ├── cache/        # Redis caching
│   ├── etl/          # ETL pipelines
│   └── services/     # PDF, Excel, Chart generation
└── presentation/     # API layer
    ├── routes/       # Express routes
    ├── controllers/  # Request handlers
    └── middleware/   # Auth, validation, etc.
```

## Installation

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
npm run dev
```

## API Endpoints

### Reports
- `POST /api/v1/reports` - Create a new report
- `GET /api/v1/reports` - List reports
- `GET /api/v1/reports/:id` - Get report details
- `GET /api/v1/reports/:id/download` - Download report file
- `POST /api/v1/reports/:id/schedule` - Schedule report

### Dashboards
- `POST /api/v1/dashboards` - Create dashboard
- `GET /api/v1/dashboards` - List dashboards
- `PUT /api/v1/dashboards/:id` - Update dashboard
- `POST /api/v1/dashboards/:id/widgets` - Add widget
- `GET /api/v1/dashboards/:id/widgets/:widgetId/data` - Get widget data

### Metrics
- `POST /api/v1/metrics` - Create metric
- `GET /api/v1/metrics` - List metrics
- `GET /api/v1/metrics/kpis` - Get KPIs
- `POST /api/v1/metrics/:id/calculate` - Calculate metric
- `GET /api/v1/metrics/:id/timeseries` - Get time series data

### Queries
- `POST /api/v1/queries` - Create query
- `GET /api/v1/queries` - List queries
- `POST /api/v1/queries/:id/execute` - Execute query

### Datasets
- `POST /api/v1/datasets` - Create dataset
- `GET /api/v1/datasets` - List datasets
- `POST /api/v1/datasets/:id/etl` - Run ETL job

## Configuration

### Database
The service uses PostgreSQL with TimescaleDB extension for time-series data:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/forten_analytics
TIMESCALE_ENABLED=true
TIMESCALE_CHUNK_INTERVAL=1d
```

### Redis Cache
Configure Redis for caching and performance:

```env
REDIS_URL=redis://localhost:6379
REDIS_DB=8
```

### Storage
Configure file storage for reports:

```env
STORAGE_TYPE=local # or 's3'
STORAGE_PATH=/tmp/analytics/reports
```

## Docker

Build and run with Docker:

```bash
docker build -t forten-analytics-service .
docker run -p 3008:3008 forten-analytics-service
```

## Testing

Run tests:
```bash
npm test
npm run test:coverage
```

## Monitoring

The service exposes metrics at `/metrics` and health checks at `/health`.

## License

Proprietary - Forten CRM