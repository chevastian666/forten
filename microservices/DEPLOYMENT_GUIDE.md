# FORTEN Microservices Deployment Guide

## Prerequisites

### Development Environment
- Docker Desktop 4.0+ with Docker Compose
- Node.js 18+ and npm
- Git
- Make (optional, for convenience commands)

### Production Environment
- Linux server with Docker support
- At least 8GB RAM and 4 CPU cores
- 50GB+ disk space
- Domain name with SSL certificates
- External service accounts (Twilio, SendGrid, etc.)

## Quick Start (Development)

### 1. Clone and Setup
```bash
git clone https://github.com/chevastian666/forten.git
cd forten/microservices

# Setup shared library and build all services
make setup

# Start development environment
make dev
```

### 2. Access Services
- **API Gateway**: http://localhost:3000
- **Grafana Dashboard**: http://localhost:3010 (admin/admin)
- **RabbitMQ Management**: http://localhost:15672 (forten/forten123)
- **Prometheus**: http://localhost:9090

### 3. Health Check
```bash
make health
```

## Production Deployment

### 1. Server Preparation

#### Install Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Configure Firewall
```bash
# Allow essential ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 2. Environment Configuration

#### Create Production Environment File
```bash
cp .env.prod.example .env.prod
```

#### Edit .env.prod with your settings:
```bash
# Database passwords
POSTGRES_PASSWORD=your-secure-postgres-password
REDIS_PASSWORD=your-secure-redis-password
RABBITMQ_PASSWORD=your-secure-rabbitmq-password

# JWT secrets (generate with: openssl rand -hex 32)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# External service credentials
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
SENDGRID_API_KEY=your-sendgrid-api-key
HIKCENTRAL_API_KEY=your-hikcentral-api-key
QBOX_API_KEY=your-qbox-api-key

# Email configuration
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASS=your-app-password
```

### 3. SSL Certificates

#### Option A: Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d api.forten.yourdomain.com
sudo certbot certonly --standalone -d forten.yourdomain.com

# Copy certificates to nginx directory
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/forten.yourdomain.com/fullchain.pem nginx/ssl/forten.crt
sudo cp /etc/letsencrypt/live/forten.yourdomain.com/privkey.pem nginx/ssl/forten.key
```

#### Option B: Self-signed (Development/Testing)
```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/forten.key \
  -out nginx/ssl/forten.crt \
  -subj "/C=UY/ST=Montevideo/L=Montevideo/O=FORTEN/CN=forten.yourdomain.com"
```

### 4. Database Initialization

#### Create database init script passwords
```bash
# Edit postgres/init-scripts/001-create-databases.sql
# Replace passwords with secure ones
```

### 5. Deploy Services

#### Start Production Environment
```bash
# Build all images
make build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
make status

# View logs
make logs
```

#### Run Database Migrations
```bash
# Wait for services to be healthy, then run migrations
sleep 30
make db-migrate

# Seed initial data (optional)
make db-seed
```

## Kubernetes Deployment

### 1. Cluster Preparation

#### Install kubectl
```bash
# Download latest kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

#### Create namespace
```bash
kubectl apply -f deployment/kubernetes/namespace.yaml
```

### 2. Secrets Configuration

#### Encode secrets to base64
```bash
# Example: encode password
echo -n "your-password" | base64

# Edit deployment/kubernetes/secrets.yaml with your encoded values
```

#### Apply secrets and config
```bash
kubectl apply -f deployment/kubernetes/secrets.yaml
```

### 3. Deploy Infrastructure Services

#### PostgreSQL
```bash
kubectl apply -f deployment/kubernetes/postgres-deployment.yaml
```

#### Redis
```bash
kubectl apply -f deployment/kubernetes/redis-deployment.yaml
```

#### RabbitMQ
```bash
kubectl apply -f deployment/kubernetes/rabbitmq-deployment.yaml
```

### 4. Deploy Application Services

#### API Gateway
```bash
kubectl apply -f deployment/kubernetes/api-gateway-deployment.yaml
```

#### All other services
```bash
kubectl apply -f deployment/kubernetes/
```

### 5. Monitor Deployment
```bash
# Check pod status
kubectl get pods -n forten

# Check service endpoints
kubectl get services -n forten

# View logs
kubectl logs -f deployment/api-gateway -n forten
```

## Monitoring Setup

### 1. Prometheus Configuration
```bash
# Prometheus is already configured in docker-compose.prod.yml
# Access at: http://your-domain:9090
```

### 2. Grafana Setup
```bash
# Access Grafana at: http://your-domain:3010
# Default login: admin/admin (change on first login)

# Import dashboards from monitoring/grafana/dashboards/
```

### 3. Alerting Setup
```bash
# Configure alert channels in Grafana
# Email notifications
# Slack integration
# SMS alerts via Twilio
```

## Backup and Recovery

### 1. Database Backup
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dumpall -U forten > backup_${DATE}.sql
docker-compose exec -T redis redis-cli BGSAVE
tar -czf backup_${DATE}.tar.gz backup_${DATE}.sql dump.rdb
rm backup_${DATE}.sql
EOF

chmod +x backup.sh
```

### 2. Automated Backups
```bash
# Add to crontab for daily backups at 2 AM
crontab -e

# Add line:
0 2 * * * /path/to/forten/microservices/backup.sh
```

### 3. Recovery Process
```bash
# Stop services
make stop

# Restore database
docker-compose up -d postgres redis
sleep 10
docker exec -i postgres_container psql -U forten < backup_YYYYMMDD_HHMMSS.sql

# Restart all services
make start
```

## Maintenance

### 1. Log Rotation
```bash
# Configure log rotation
sudo tee /etc/logrotate.d/docker-containers << 'EOF'
/var/lib/docker/containers/*/*.log {
  daily
  missingok
  rotate 7
  compress
  delaycompress
  copytruncate
}
EOF
```

### 2. Service Updates
```bash
# Update individual service
docker-compose pull auth-service
docker-compose up -d auth-service

# Update all services
docker-compose pull
docker-compose up -d
```

### 3. Health Monitoring
```bash
# Create health check script
cat > health-check.sh << 'EOF'
#!/bin/bash
services=("auth-service" "monitoring-service" "access-service" "communication-service" "analytics-service")

for service in "${services[@]}"; do
    if ! docker-compose ps $service | grep -q "Up"; then
        echo "Service $service is down"
        # Send alert or restart service
        docker-compose restart $service
    fi
done
EOF

# Run every 5 minutes
echo "*/5 * * * * /path/to/health-check.sh" | crontab -
```

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker-compose logs service-name

# Check resource usage
docker stats

# Restart specific service
docker-compose restart service-name
```

#### Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify database exists
docker-compose exec postgres psql -U forten -l

# Reset database connection
docker-compose restart postgres
sleep 10
make db-migrate
```

#### Memory Issues
```bash
# Check memory usage
free -h
docker stats

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Performance Tuning

#### Database Optimization
```sql
-- Connect to PostgreSQL
docker-compose exec postgres psql -U forten

-- Optimize settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
SELECT pg_reload_conf();
```

#### Redis Optimization
```bash
# Edit redis configuration if needed
docker-compose exec redis redis-cli CONFIG SET maxmemory 512mb
docker-compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## Security Hardening

### 1. System Security
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install fail2ban
sudo apt install fail2ban

# Configure SSH (disable root login, use key auth)
sudo nano /etc/ssh/sshd_config
```

### 2. Docker Security
```bash
# Run Docker as non-root user
sudo usermod -aG docker $USER

# Use Docker secrets for sensitive data
echo "sensitive-data" | docker secret create my-secret -
```

### 3. Network Security
```bash
# Use private networks
# Configure firewall rules
# Implement VPN for admin access
```

## Support and Maintenance Contacts

- **System Administrator**: admin@forten.uy
- **Developer Support**: dev@forten.uy
- **24/7 Monitoring**: monitoring@forten.uy

For emergency issues, contact: +598 99 123 456