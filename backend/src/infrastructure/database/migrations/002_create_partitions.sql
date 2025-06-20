-- Table Partitioning Strategy for FORTEN Database
-- ================================================
-- Partitioning large tables by date for improved performance

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- Events Table Partitioning (Monthly)
-- -----------------------------------
-- Convert events table to partitioned table
DO $$
BEGIN
  -- Check if table is already partitioned
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'events' AND c.relkind = 'p'
  ) THEN
    -- Rename original table
    ALTER TABLE events RENAME TO events_old;
    
    -- Create partitioned table
    CREATE TABLE events (
      id UUID DEFAULT gen_random_uuid() NOT NULL,
      building_id UUID NOT NULL,
      user_id UUID,
      type VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      severity VARCHAR(20) DEFAULT 'low',
      resolved BOOLEAN DEFAULT false,
      resolved_at TIMESTAMP,
      resolved_by UUID,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP,
      CONSTRAINT events_pkey PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at);
    
    -- Create indexes on partitioned table
    CREATE INDEX idx_events_building_date_part ON events(building_id, created_at DESC);
    CREATE INDEX idx_events_type_severity_part ON events(type, severity) WHERE resolved = false;
    
    -- Set up automatic partition management
    SELECT partman.create_parent(
      p_parent_table => 'public.events',
      p_control => 'created_at',
      p_type => 'range',
      p_interval => 'monthly',
      p_start_partition => date_trunc('month', CURRENT_DATE - interval '3 months')::text
    );
    
    -- Configure retention policy (keep 12 months)
    UPDATE partman.part_config 
    SET retention = '12 months',
        retention_keep_table = false,
        retention_keep_index = false
    WHERE parent_table = 'public.events';
    
    -- Migrate data from old table
    INSERT INTO events SELECT * FROM events_old;
    
    -- Drop old table after verification
    -- DROP TABLE events_old;
  END IF;
END $$;

-- Access Logs Table Partitioning (Weekly)
-- ---------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'access_logs' AND c.relkind = 'p'
  ) THEN
    -- Rename original table
    ALTER TABLE access_logs RENAME TO access_logs_old;
    
    -- Create partitioned table
    CREATE TABLE access_logs (
      id UUID DEFAULT gen_random_uuid() NOT NULL,
      access_id UUID,
      building_id UUID NOT NULL,
      pin VARCHAR(10),
      method VARCHAR(20) NOT NULL,
      success BOOLEAN NOT NULL,
      failure_reason VARCHAR(100),
      ip_address INET,
      user_agent TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT access_logs_pkey PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at);
    
    -- Create indexes
    CREATE INDEX idx_access_logs_building_date_part ON access_logs(building_id, created_at DESC);
    CREATE INDEX idx_access_logs_pin_date_part ON access_logs(pin, created_at DESC);
    CREATE INDEX idx_access_logs_success_date_part ON access_logs(success, created_at DESC);
    
    -- Set up automatic partition management
    SELECT partman.create_parent(
      p_parent_table => 'public.access_logs',
      p_control => 'created_at',
      p_type => 'range',
      p_interval => 'weekly',
      p_start_partition => date_trunc('week', CURRENT_DATE - interval '1 month')::text
    );
    
    -- Configure retention policy (keep 6 months)
    UPDATE partman.part_config 
    SET retention = '6 months',
        retention_keep_table = false
    WHERE parent_table = 'public.access_logs';
    
    -- Migrate data
    INSERT INTO access_logs SELECT * FROM access_logs_old;
  END IF;
END $$;

-- Audit Logs Table Partitioning (Monthly)
-- ---------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'audit_logs' AND c.relkind = 'p'
  ) THEN
    ALTER TABLE audit_logs RENAME TO audit_logs_old;
    
    CREATE TABLE audit_logs (
      id UUID DEFAULT gen_random_uuid() NOT NULL,
      user_id UUID,
      username VARCHAR(255),
      ip_address INET NOT NULL,
      user_agent TEXT,
      session_id VARCHAR(255),
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(100) NOT NULL,
      resource_id VARCHAR(255),
      method VARCHAR(10),
      status_code INTEGER,
      duration INTEGER,
      success BOOLEAN NOT NULL,
      error_message TEXT,
      request_body JSONB,
      response_body JSONB,
      metadata JSONB,
      tags TEXT[],
      risk VARCHAR(20),
      compliance JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT audit_logs_pkey PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at);
    
    -- Create indexes
    CREATE INDEX idx_audit_logs_user_date_part ON audit_logs(user_id, created_at DESC);
    CREATE INDEX idx_audit_logs_resource_part ON audit_logs(resource, resource_id, created_at DESC);
    CREATE INDEX idx_audit_logs_risk_part ON audit_logs(risk, created_at DESC) WHERE risk IN ('high', 'critical');
    
    -- Set up automatic partition management
    SELECT partman.create_parent(
      p_parent_table => 'public.audit_logs',
      p_control => 'created_at',
      p_type => 'range',
      p_interval => 'monthly',
      p_start_partition => date_trunc('month', CURRENT_DATE - interval '3 months')::text
    );
    
    -- Configure retention policy (keep 24 months for compliance)
    UPDATE partman.part_config 
    SET retention = '24 months',
        retention_keep_table = true,
        retention_schema = 'archive'
    WHERE parent_table = 'public.audit_logs';
    
    -- Migrate data
    INSERT INTO audit_logs SELECT * FROM audit_logs_old;
  END IF;
END $$;

-- Notifications Table Partitioning (Monthly)
-- -----------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'notifications' AND c.relkind = 'p'
  ) THEN
    ALTER TABLE notifications RENAME TO notifications_old;
    
    CREATE TABLE notifications (
      id UUID DEFAULT gen_random_uuid() NOT NULL,
      user_id UUID,
      channel VARCHAR(20) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      scheduled_at TIMESTAMP,
      sent_at TIMESTAMP,
      read_at TIMESTAMP,
      delivery_status VARCHAR(20) DEFAULT 'pending',
      error_message TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP,
      CONSTRAINT notifications_pkey PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at);
    
    -- Create indexes
    CREATE INDEX idx_notifications_user_unread_part ON notifications(user_id, created_at DESC) 
      WHERE read_at IS NULL AND deleted_at IS NULL;
    CREATE INDEX idx_notifications_delivery_part ON notifications(delivery_status, scheduled_at)
      WHERE delivery_status IN ('pending', 'retry');
    
    -- Set up automatic partition management
    SELECT partman.create_parent(
      p_parent_table => 'public.notifications',
      p_control => 'created_at',
      p_type => 'range',
      p_interval => 'monthly',
      p_start_partition => date_trunc('month', CURRENT_DATE - interval '2 months')::text
    );
    
    -- Configure retention policy (keep 3 months)
    UPDATE partman.part_config 
    SET retention = '3 months',
        retention_keep_table = false
    WHERE parent_table = 'public.notifications';
    
    -- Migrate data
    INSERT INTO notifications SELECT * FROM notifications_old;
  END IF;
END $$;

-- Create archive schema for old partitions
CREATE SCHEMA IF NOT EXISTS archive;

-- Maintenance Functions
-- --------------------
-- Function to run partition maintenance
CREATE OR REPLACE FUNCTION run_partition_maintenance()
RETURNS void AS $$
BEGIN
  -- Run maintenance on all partitioned tables
  CALL partman.run_maintenance();
  
  -- Update partition constraints
  PERFORM partman.partition_data_proc('public.events');
  PERFORM partman.partition_data_proc('public.access_logs');
  PERFORM partman.partition_data_proc('public.audit_logs');
  PERFORM partman.partition_data_proc('public.notifications');
  
  -- Analyze partitioned tables
  ANALYZE events;
  ANALYZE access_logs;
  ANALYZE audit_logs;
  ANALYZE notifications;
END;
$$ LANGUAGE plpgsql;

-- Schedule maintenance (requires pg_cron)
-- SELECT cron.schedule('partition-maintenance', '0 2 * * *', 'SELECT run_partition_maintenance();');

-- Manual partition creation for next 6 months
DO $$
DECLARE
  i INTEGER;
  start_date DATE;
  end_date DATE;
BEGIN
  -- Create future partitions for events (monthly)
  FOR i IN 0..5 LOOP
    start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::interval);
    end_date := date_trunc('month', start_date + interval '1 month');
    
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS events_%s PARTITION OF events
      FOR VALUES FROM (%L) TO (%L)',
      to_char(start_date, 'YYYY_MM'),
      start_date,
      end_date
    );
  END LOOP;
  
  -- Create future partitions for access_logs (weekly)
  FOR i IN 0..11 LOOP
    start_date := date_trunc('week', CURRENT_DATE + (i || ' weeks')::interval);
    end_date := date_trunc('week', start_date + interval '1 week');
    
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS access_logs_%s PARTITION OF access_logs
      FOR VALUES FROM (%L) TO (%L)',
      to_char(start_date, 'YYYY_MM_DD'),
      start_date,
      end_date
    );
  END LOOP;
END $$;

-- Query to check partition sizes
CREATE OR REPLACE VIEW partition_info AS
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename LIKE '%\_2%' ESCAPE '\'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;