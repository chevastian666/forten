-- Performance Optimization Indexes for FORTEN Database
-- =====================================================

-- Events Table Indexes
-- ---------------------
-- Composite index for building-based event queries with date filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_building_date 
ON events(building_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Index for event type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_type_severity 
ON events(type, severity)
WHERE resolved = false AND deleted_at IS NULL;

-- Index for unresolved events dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_unresolved 
ON events(created_at DESC)
WHERE resolved = false AND deleted_at IS NULL;

-- Index for user activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_user_date 
ON events(user_id, created_at DESC)
WHERE user_id IS NOT NULL AND deleted_at IS NULL;

-- Full-text search index for event descriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_description_fts 
ON events USING gin(to_tsvector('spanish', description));

-- Access Table Indexes
-- --------------------
-- Index for active PIN lookups (most critical query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_access_pin_active 
ON access(pin)
WHERE is_active = true AND deleted_at IS NULL;

-- Composite index for building access queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_access_building_active 
ON access(building_id, valid_until DESC)
WHERE is_active = true AND deleted_at IS NULL;

-- Index for access validation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_access_validation 
ON access(building_id, pin, valid_from, valid_until)
WHERE is_active = true AND current_uses < max_uses AND deleted_at IS NULL;

-- Index for visitor type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_access_type_created 
ON access(type, created_at DESC)
WHERE deleted_at IS NULL;

-- Buildings Table Indexes
-- -----------------------
-- Index for active building queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buildings_status_active 
ON buildings(status)
WHERE status = 'active' AND deleted_at IS NULL;

-- Index for city-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buildings_city_status 
ON buildings(city, status)
WHERE deleted_at IS NULL;

-- Full-text search for building names and addresses
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buildings_search 
ON buildings USING gin(
  to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(address, ''))
);

-- Users Table Indexes
-- -------------------
-- Index for email lookups (login)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
ON users(email)
WHERE is_active = true AND deleted_at IS NULL;

-- Index for role-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active 
ON users(role)
WHERE is_active = true AND deleted_at IS NULL;

-- Index for last login tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login 
ON users(last_login DESC NULLS LAST)
WHERE is_active = true AND deleted_at IS NULL;

-- Access Logs Table Indexes
-- -------------------------
-- Composite index for access history queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_access_logs_building_date 
ON access_logs(building_id, created_at DESC);

-- Index for PIN usage tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_access_logs_pin_date 
ON access_logs(pin, created_at DESC);

-- Index for success/failure analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_access_logs_status_date 
ON access_logs(success, created_at DESC);

-- Cameras Table Indexes
-- ---------------------
-- Index for building camera queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cameras_building_status 
ON cameras(building_id, status)
WHERE deleted_at IS NULL;

-- Index for offline camera monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cameras_offline 
ON cameras(last_heartbeat)
WHERE status = 'offline' AND deleted_at IS NULL;

-- Notifications Table Indexes
-- ---------------------------
-- Index for unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, created_at DESC)
WHERE read = false AND deleted_at IS NULL;

-- Index for notification delivery status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_delivery 
ON notifications(delivery_status, scheduled_at)
WHERE delivery_status IN ('pending', 'retry') AND deleted_at IS NULL;

-- Refresh Tokens Table Indexes
-- ----------------------------
-- Index for token validation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_token 
ON refresh_tokens(token)
WHERE is_revoked = false AND expires_at > CURRENT_TIMESTAMP;

-- Index for family-based revocation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_family 
ON refresh_tokens(family_id)
WHERE is_revoked = false;

-- API Keys Table Indexes
-- ----------------------
-- Index for API key validation
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_key_active 
ON api_keys(key_hash)
WHERE status = 'active' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

-- Index for service-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_service 
ON api_keys(service_id, status)
WHERE deleted_at IS NULL;

-- Audit Logs Table Indexes
-- ------------------------
-- Composite index for audit trail queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_date 
ON audit_logs(user_id, created_at DESC);

-- Index for resource-based audit queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource 
ON audit_logs(resource, resource_id, created_at DESC);

-- Index for security event monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_risk 
ON audit_logs(risk, created_at DESC)
WHERE risk IN ('high', 'critical');

-- Performance Optimization Views
-- ------------------------------
-- Materialized view for building statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_building_stats AS
SELECT 
  b.id,
  b.name,
  COUNT(DISTINCT e.id) as total_events,
  COUNT(DISTINCT e.id) FILTER (WHERE e.created_at > CURRENT_DATE - INTERVAL '7 days') as events_last_week,
  COUNT(DISTINCT a.id) as total_access,
  COUNT(DISTINCT a.id) FILTER (WHERE a.is_active = true) as active_access,
  COUNT(DISTINCT c.id) as total_cameras,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'online') as online_cameras
FROM buildings b
LEFT JOIN events e ON e.building_id = b.id AND e.deleted_at IS NULL
LEFT JOIN access a ON a.building_id = b.id AND a.deleted_at IS NULL
LEFT JOIN cameras c ON c.building_id = b.id AND c.deleted_at IS NULL
WHERE b.deleted_at IS NULL
GROUP BY b.id, b.name;

-- Index on materialized view
CREATE UNIQUE INDEX idx_mv_building_stats_id ON mv_building_stats(id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_building_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_building_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule periodic refresh (requires pg_cron extension)
-- SELECT cron.schedule('refresh-building-stats', '*/15 * * * *', 'SELECT refresh_building_stats();');

-- Update table statistics for query planner
ANALYZE events;
ANALYZE access;
ANALYZE buildings;
ANALYZE users;
ANALYZE access_logs;
ANALYZE cameras;
ANALYZE notifications;