-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create buildings table
CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    manager_id UUID NOT NULL,
    floors INTEGER NOT NULL DEFAULT 1,
    total_cameras INTEGER DEFAULT 0,
    total_devices INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
    coordinates JSONB,
    configuration JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cameras table
CREATE TABLE IF NOT EXISTS cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(100) NOT NULL,
    ip_address INET NOT NULL,
    port INTEGER NOT NULL CHECK (port > 0 AND port <= 65535),
    username VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    floor INTEGER NOT NULL CHECK (floor >= 0),
    status VARCHAR(50) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'maintenance', 'error')),
    capabilities JSONB NOT NULL,
    stream_urls JSONB NOT NULL,
    recording JSONB NOT NULL,
    motion_detection JSONB NOT NULL,
    hik_central_id VARCHAR(100),
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL CHECK (type IN (
        'door_controller', 'access_reader', 'alarm_panel', 'motion_sensor',
        'smoke_detector', 'temperature_sensor', 'elevator_controller',
        'lighting_controller', 'hvac_controller', 'intercom', 'barrier_gate'
    )),
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    ip_address INET,
    port INTEGER CHECK (port > 0 AND port <= 65535),
    location VARCHAR(255) NOT NULL,
    floor INTEGER NOT NULL CHECK (floor >= 0),
    status VARCHAR(50) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'maintenance', 'error', 'disabled')),
    health JSONB,
    configuration JSONB DEFAULT '{}',
    capabilities TEXT[],
    q_box_id VARCHAR(100),
    hik_central_id VARCHAR(100),
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_maintenance TIMESTAMP WITH TIME ZONE,
    next_maintenance TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    type VARCHAR(100) NOT NULL CHECK (type IN (
        'motion_detected', 'camera_offline', 'camera_online', 'recording_failed',
        'device_offline', 'device_online', 'door_opened', 'door_closed',
        'access_granted', 'access_denied', 'alarm_triggered', 'system_error',
        'maintenance_required', 'face_recognized', 'license_plate_read'
    )),
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    location VARCHAR(255) NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('motion', 'offline', 'maintenance', 'security', 'system', 'emergency')),
    method VARCHAR(50) NOT NULL CHECK (method IN ('email', 'sms', 'push', 'webhook', 'in_app')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled')),
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
    max_retries INTEGER DEFAULT 3 CHECK (max_retries >= 0),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_buildings_manager_id ON buildings(manager_id);
CREATE INDEX IF NOT EXISTS idx_buildings_status ON buildings(status);
CREATE INDEX IF NOT EXISTS idx_buildings_coordinates ON buildings USING GIN(coordinates) WHERE coordinates IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cameras_building_id ON cameras(building_id);
CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras(status);
CREATE INDEX IF NOT EXISTS idx_cameras_building_floor ON cameras(building_id, floor);
CREATE INDEX IF NOT EXISTS idx_cameras_heartbeat ON cameras(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_cameras_hik_central_id ON cameras(hik_central_id) WHERE hik_central_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cameras_ip_port ON cameras(ip_address, port);

CREATE INDEX IF NOT EXISTS idx_devices_building_id ON devices(building_id);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_building_floor ON devices(building_id, floor);
CREATE INDEX IF NOT EXISTS idx_devices_heartbeat ON devices(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_devices_q_box_id ON devices(q_box_id) WHERE q_box_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_serial_number ON devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_devices_maintenance ON devices(next_maintenance) WHERE next_maintenance IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_building_id ON events(building_id);
CREATE INDEX IF NOT EXISTS idx_events_camera_id ON events(camera_id) WHERE camera_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
CREATE INDEX IF NOT EXISTS idx_events_acknowledged ON events(acknowledged);
CREATE INDEX IF NOT EXISTS idx_events_resolved ON events(resolved);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_building_created ON events(building_id, created_at);

CREATE INDEX IF NOT EXISTS idx_alerts_building_id ON alerts(building_id);
CREATE INDEX IF NOT EXISTS idx_alerts_event_id ON alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_alerts_recipient_id ON alerts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_scheduled_at ON alerts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_alerts_recipient_created ON alerts(recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_status_retry ON alerts(status, retry_count) WHERE status = 'failed';

-- Create triggers for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cameras_updated_at BEFORE UPDATE ON cameras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update building counts
CREATE OR REPLACE FUNCTION update_building_camera_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE buildings 
        SET total_cameras = total_cameras + 1 
        WHERE id = NEW.building_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE buildings 
        SET total_cameras = total_cameras - 1 
        WHERE id = OLD.building_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' AND OLD.building_id != NEW.building_id THEN
        UPDATE buildings 
        SET total_cameras = total_cameras - 1 
        WHERE id = OLD.building_id;
        UPDATE buildings 
        SET total_cameras = total_cameras + 1 
        WHERE id = NEW.building_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_building_device_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE buildings 
        SET total_devices = total_devices + 1 
        WHERE id = NEW.building_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE buildings 
        SET total_devices = total_devices - 1 
        WHERE id = OLD.building_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' AND OLD.building_id != NEW.building_id THEN
        UPDATE buildings 
        SET total_devices = total_devices - 1 
        WHERE id = OLD.building_id;
        UPDATE buildings 
        SET total_devices = total_devices + 1 
        WHERE id = NEW.building_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create triggers to maintain building counts
CREATE TRIGGER camera_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON cameras
    FOR EACH ROW EXECUTE FUNCTION update_building_camera_count();

CREATE TRIGGER device_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_building_device_count();

-- Create views for common queries
CREATE OR REPLACE VIEW building_summary AS
SELECT 
    b.*,
    COUNT(DISTINCT c.id) as active_cameras,
    COUNT(DISTINCT d.id) as active_devices,
    COUNT(DISTINCT CASE WHEN e.acknowledged = false THEN e.id END) as unacknowledged_events
FROM buildings b
LEFT JOIN cameras c ON b.id = c.building_id AND c.status = 'online'
LEFT JOIN devices d ON b.id = d.building_id AND d.status = 'online'
LEFT JOIN events e ON b.id = e.building_id AND e.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY b.id;

CREATE OR REPLACE VIEW camera_health_summary AS
SELECT 
    c.*,
    b.name as building_name,
    CASE 
        WHEN c.last_heartbeat > NOW() - INTERVAL '5 minutes' THEN 'healthy'
        WHEN c.last_heartbeat > NOW() - INTERVAL '15 minutes' THEN 'warning'
        ELSE 'critical'
    END as health_status
FROM cameras c
JOIN buildings b ON c.building_id = b.id;

CREATE OR REPLACE VIEW device_health_summary AS
SELECT 
    d.*,
    b.name as building_name,
    CASE 
        WHEN d.last_heartbeat > NOW() - INTERVAL '10 minutes' THEN 'healthy'
        WHEN d.last_heartbeat > NOW() - INTERVAL '30 minutes' THEN 'warning'
        ELSE 'critical'
    END as health_status
FROM devices d
JOIN buildings b ON d.building_id = b.id;

-- Insert sample configuration data
INSERT INTO buildings (name, address, manager_id, floors, configuration) VALUES
('Main Office Building', '123 Business Ave, City, State 12345', uuid_generate_v4(), 5, 
 '{"timezone": "America/New_York", "workingHours": {"start": "08:00", "end": "18:00"}, "alertSettings": {"motion": true, "offline": true, "maintenance": true}}'),
('Warehouse Facility', '456 Industrial Blvd, City, State 12345', uuid_generate_v4(), 2,
 '{"timezone": "America/New_York", "workingHours": {"start": "06:00", "end": "22:00"}, "alertSettings": {"motion": true, "offline": true, "maintenance": false}}')
ON CONFLICT DO NOTHING;