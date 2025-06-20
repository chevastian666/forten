import { Pool, PoolConfig } from 'pg';
import { Logger } from '../utils/Logger';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export class DatabaseConnection {
  private pool: Pool;
  private logger: Logger;

  constructor(config: DatabaseConfig, logger: Logger) {
    this.logger = logger;
    
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
    };

    this.pool = new Pool(poolConfig);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client) => {
      this.logger.debug('New database client connected');
    });

    this.pool.on('acquire', (client) => {
      this.logger.debug('Database client acquired from pool');
    });

    this.pool.on('remove', (client) => {
      this.logger.debug('Database client removed from pool');
    });

    this.pool.on('error', (error, client) => {
      this.logger.error(`Database pool error: ${error.message}`);
    });
  }

  getPool(): Pool {
    return this.pool;
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      this.logger.info('Database connection test successful');
      return true;
    } catch (error) {
      this.logger.error(`Database connection test failed: ${error.message}`);
      return false;
    }
  }

  async createTables(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create buildings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS buildings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          address VARCHAR(500) NOT NULL,
          manager_id UUID NOT NULL,
          floors INTEGER NOT NULL DEFAULT 1,
          total_cameras INTEGER DEFAULT 0,
          total_devices INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'active',
          coordinates JSONB,
          configuration JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create cameras table
      await client.query(`
        CREATE TABLE IF NOT EXISTS cameras (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          model VARCHAR(100) NOT NULL,
          ip_address INET NOT NULL,
          port INTEGER NOT NULL,
          username VARCHAR(100) NOT NULL,
          password VARCHAR(100) NOT NULL,
          location VARCHAR(255) NOT NULL,
          floor INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'offline',
          capabilities JSONB NOT NULL,
          stream_urls JSONB NOT NULL,
          recording JSONB NOT NULL,
          motion_detection JSONB NOT NULL,
          hik_central_id VARCHAR(100),
          last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create devices table
      await client.query(`
        CREATE TABLE IF NOT EXISTS devices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(100) NOT NULL,
          model VARCHAR(100) NOT NULL,
          serial_number VARCHAR(100) NOT NULL UNIQUE,
          ip_address INET,
          port INTEGER,
          location VARCHAR(255) NOT NULL,
          floor INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'offline',
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
        )
      `);

      // Create events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
          camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL,
          device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
          type VARCHAR(100) NOT NULL,
          severity VARCHAR(50) NOT NULL,
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
        )
      `);

      // Create alerts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
          event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          recipient_id UUID NOT NULL,
          type VARCHAR(50) NOT NULL,
          method VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          priority VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          sent_at TIMESTAMP WITH TIME ZONE,
          delivered_at TIMESTAMP WITH TIME ZONE,
          read_at TIMESTAMP WITH TIME ZONE,
          failed_at TIMESTAMP WITH TIME ZONE,
          failure_reason TEXT,
          retry_count INTEGER DEFAULT 0,
          max_retries INTEGER DEFAULT 3,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create indexes for better performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_buildings_manager_id ON buildings(manager_id);
        CREATE INDEX IF NOT EXISTS idx_buildings_status ON buildings(status);
        CREATE INDEX IF NOT EXISTS idx_buildings_coordinates ON buildings USING GIN(coordinates);
        
        CREATE INDEX IF NOT EXISTS idx_cameras_building_id ON cameras(building_id);
        CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras(status);
        CREATE INDEX IF NOT EXISTS idx_cameras_floor ON cameras(building_id, floor);
        CREATE INDEX IF NOT EXISTS idx_cameras_heartbeat ON cameras(last_heartbeat);
        CREATE INDEX IF NOT EXISTS idx_cameras_hik_central_id ON cameras(hik_central_id);
        
        CREATE INDEX IF NOT EXISTS idx_devices_building_id ON devices(building_id);
        CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
        CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
        CREATE INDEX IF NOT EXISTS idx_devices_floor ON devices(building_id, floor);
        CREATE INDEX IF NOT EXISTS idx_devices_heartbeat ON devices(last_heartbeat);
        CREATE INDEX IF NOT EXISTS idx_devices_q_box_id ON devices(q_box_id);
        
        CREATE INDEX IF NOT EXISTS idx_events_building_id ON events(building_id);
        CREATE INDEX IF NOT EXISTS idx_events_camera_id ON events(camera_id);
        CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id);
        CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
        CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
        CREATE INDEX IF NOT EXISTS idx_events_acknowledged ON events(acknowledged);
        CREATE INDEX IF NOT EXISTS idx_events_resolved ON events(resolved);
        CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
        
        CREATE INDEX IF NOT EXISTS idx_alerts_building_id ON alerts(building_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_event_id ON alerts(event_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_recipient_id ON alerts(recipient_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
        CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);
        CREATE INDEX IF NOT EXISTS idx_alerts_scheduled_at ON alerts(scheduled_at);
      `);

      await client.query('COMMIT');
      this.logger.info('Database tables created successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Failed to create database tables: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    try {
      await this.pool.end();
      this.logger.info('Database pool closed');
    } catch (error) {
      this.logger.error(`Error closing database pool: ${error.message}`);
      throw error;
    }
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      totalConnections: number;
      idleConnections: number;
      waitingClients: number;
    };
  }> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      return {
        status: 'healthy',
        details: {
          totalConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingClients: this.pool.waitingCount
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          totalConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingClients: this.pool.waitingCount
        }
      };
    }
  }
}