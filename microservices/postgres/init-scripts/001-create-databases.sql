-- Create databases for each microservice
CREATE DATABASE forten_auth;
CREATE DATABASE forten_monitoring;
CREATE DATABASE forten_access;
CREATE DATABASE forten_communication;

-- Create users for each service (optional, for better security)
CREATE USER auth_service WITH PASSWORD 'auth_service_password';
CREATE USER monitoring_service WITH PASSWORD 'monitoring_service_password';
CREATE USER access_service WITH PASSWORD 'access_service_password';
CREATE USER communication_service WITH PASSWORD 'communication_service_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE forten_auth TO auth_service;
GRANT ALL PRIVILEGES ON DATABASE forten_monitoring TO monitoring_service;
GRANT ALL PRIVILEGES ON DATABASE forten_access TO access_service;
GRANT ALL PRIVILEGES ON DATABASE forten_communication TO communication_service;

-- Enable required extensions
\c forten_auth;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c forten_monitoring;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c forten_access;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c forten_communication;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";