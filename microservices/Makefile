# FORTEN Microservices Makefile

.PHONY: help build start stop restart clean logs status health setup dev prod

# Default target
help:
	@echo "FORTEN Microservices Management"
	@echo ""
	@echo "Available commands:"
	@echo "  build     - Build all Docker images"
	@echo "  start     - Start all services"
	@echo "  stop      - Stop all services"
	@echo "  restart   - Restart all services"
	@echo "  clean     - Clean up containers and volumes"
	@echo "  logs      - Show logs for all services"
	@echo "  status    - Show status of all services"
	@echo "  health    - Check health of all services"
	@echo "  setup     - Initial setup (build shared library)"
	@echo "  dev       - Start development environment"
	@echo "  prod      - Start production environment"
	@echo ""
	@echo "Service-specific commands:"
	@echo "  logs-auth      - Show auth service logs"
	@echo "  logs-monitoring - Show monitoring service logs"
	@echo "  logs-access    - Show access service logs"
	@echo "  logs-comm      - Show communication service logs"
	@echo "  logs-analytics - Show analytics service logs"
	@echo "  logs-gateway   - Show API gateway logs"

# Build shared library first
setup:
	@echo "Setting up shared library..."
	cd shared && npm install && npm run build
	@echo "Shared library setup complete!"

# Build all Docker images
build: setup
	@echo "Building all Docker images..."
	docker-compose build
	@echo "Build complete!"

# Start development environment
dev: setup
	@echo "Starting development environment..."
	docker-compose up -d
	@echo "Development environment started!"
	@echo "API Gateway: http://localhost:3000"
	@echo "Grafana: http://localhost:3010 (admin/admin)"
	@echo "RabbitMQ: http://localhost:15672 (forten/forten123)"

# Start production environment
prod: setup
	@echo "Starting production environment..."
	cp .env.prod.example .env.prod
	@echo "Please configure .env.prod with your production settings"
	docker-compose -f docker-compose.prod.yml up -d
	@echo "Production environment started!"

# Start all services
start:
	@echo "Starting all services..."
	docker-compose up -d
	@echo "All services started!"

# Stop all services
stop:
	@echo "Stopping all services..."
	docker-compose down
	@echo "All services stopped!"

# Restart all services
restart: stop start

# Show logs for all services
logs:
	docker-compose logs -f

# Show logs for specific services
logs-auth:
	docker-compose logs -f auth-service

logs-monitoring:
	docker-compose logs -f monitoring-service

logs-access:
	docker-compose logs -f access-service

logs-comm:
	docker-compose logs -f communication-service

logs-analytics:
	docker-compose logs -f analytics-service

logs-gateway:
	docker-compose logs -f api-gateway

# Show status of all services
status:
	@echo "Service Status:"
	@echo "==============="
	docker-compose ps

# Check health of all services
health:
	@echo "Checking service health..."
	@echo "API Gateway:"
	@curl -s http://localhost:3000/health || echo "❌ API Gateway unhealthy"
	@echo ""
	@echo "Auth Service:"
	@curl -s http://localhost:3001/health || echo "❌ Auth Service unhealthy"
	@echo ""
	@echo "Monitoring Service:"
	@curl -s http://localhost:3002/health || echo "❌ Monitoring Service unhealthy"
	@echo ""
	@echo "Access Service:"
	@curl -s http://localhost:3003/health || echo "❌ Access Service unhealthy"
	@echo ""
	@echo "Communication Service:"
	@curl -s http://localhost:3004/health || echo "❌ Communication Service unhealthy"
	@echo ""
	@echo "Analytics Service:"
	@curl -s http://localhost:3005/health || echo "❌ Analytics Service unhealthy"

# Clean up containers and volumes
clean:
	@echo "Cleaning up containers and volumes..."
	docker-compose down -v --remove-orphans
	docker system prune -f
	@echo "Cleanup complete!"

# Database operations
db-migrate:
	@echo "Running database migrations..."
	docker-compose exec auth-service npm run migrate
	docker-compose exec monitoring-service npm run migrate
	docker-compose exec access-service npm run migrate
	docker-compose exec communication-service npm run migrate
	docker-compose exec analytics-service npm run migrate
	@echo "Migrations complete!"

db-seed:
	@echo "Seeding databases..."
	docker-compose exec auth-service npm run seed
	docker-compose exec monitoring-service npm run seed
	docker-compose exec access-service npm run seed
	docker-compose exec communication-service npm run seed
	@echo "Seeding complete!"

# Development helpers
shell-auth:
	docker-compose exec auth-service /bin/sh

shell-monitoring:
	docker-compose exec monitoring-service /bin/sh

shell-access:
	docker-compose exec access-service /bin/sh

shell-comm:
	docker-compose exec communication-service /bin/sh

shell-analytics:
	docker-compose exec analytics-service /bin/sh

shell-gateway:
	docker-compose exec api-gateway /bin/sh

# Testing
test:
	@echo "Running tests..."
	cd shared && npm test
	docker-compose exec auth-service npm test
	docker-compose exec monitoring-service npm test
	docker-compose exec access-service npm test
	docker-compose exec communication-service npm test
	docker-compose exec analytics-service npm test
	docker-compose exec api-gateway npm test
	@echo "All tests complete!"

# Install dependencies in all services
install:
	@echo "Installing dependencies..."
	cd shared && npm install
	cd api-gateway && npm install
	cd auth-service && npm install
	cd monitoring-service && npm install
	cd access-service && npm install
	cd communication-service && npm install
	cd analytics-service && npm install
	@echo "Dependencies installed!"

# Update dependencies
update:
	@echo "Updating dependencies..."
	cd shared && npm update
	cd api-gateway && npm update
	cd auth-service && npm update
	cd monitoring-service && npm update
	cd access-service && npm update
	cd communication-service && npm update
	cd analytics-service && npm update
	@echo "Dependencies updated!"