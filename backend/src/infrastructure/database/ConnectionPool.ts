import { Sequelize, Options as SequelizeOptions } from 'sequelize';
import { Pool, PoolConfig } from 'pg';
import { Logger } from '../logging/Logger';
import { EventEmitter } from 'events';

export interface ConnectionPoolConfig {
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    dialect: 'postgres';
  };
  pool: {
    min: number;
    max: number;
    idle: number;
    acquire: number;
    evict: number;
    maxUses?: number;
    connectionTimeoutMillis?: number;
  };
  read?: {
    hosts: string[];
    loadBalancing?: 'random' | 'round-robin';
  };
  monitoring?: {
    enabled: boolean;
    interval: number;
    slowQueryThreshold: number;
  };
}

export interface PoolStats {
  total: number;
  idle: number;
  active: number;
  waiting: number;
  maxConnections: number;
  avgAcquireTime: number;
  avgActiveTime: number;
  errors: number;
  timeouts: number;
}

export class ConnectionPool extends EventEmitter {
  private readonly logger: Logger;
  private writePool: Sequelize;
  private readPools: Sequelize[] = [];
  private readPoolIndex = 0;
  private stats: Map<string, number> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  
  constructor(private readonly config: ConnectionPoolConfig) {
    super();
    this.logger = new Logger('ConnectionPool');
    this.initializePools();
  }

  /**
   * Initialize connection pools
   */
  private initializePools(): void {
    // Initialize write pool
    this.writePool = this.createPool(this.config.database, 'write');

    // Initialize read pools
    if (this.config.read?.hosts && this.config.read.hosts.length > 0) {
      this.readPools = this.config.read.hosts.map((host, index) => 
        this.createPool({ ...this.config.database, host }, `read-${index}`)
      );
    } else {
      // Use write pool for reads if no read replicas configured
      this.readPools = [this.writePool];
    }

    // Start monitoring if enabled
    if (this.config.monitoring?.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Create a Sequelize connection pool
   */
  private createPool(dbConfig: any, name: string): Sequelize {
    const poolConfig: SequelizeOptions = {
      dialect: 'postgres',
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.username,
      password: dbConfig.password,
      pool: {
        min: this.config.pool.min,
        max: this.config.pool.max,
        idle: this.config.pool.idle,
        acquire: this.config.pool.acquire,
        evict: this.config.pool.evict
      },
      logging: (sql: string, timing?: number) => {
        this.logQuery(sql, timing, name);
      },
      benchmark: true,
      define: {
        timestamps: true,
        underscored: true,
        paranoid: true
      },
      hooks: {
        beforeConnect: async () => {
          this.emit('beforeConnect', { pool: name });
          this.incrementStat(`${name}:connection:attempts`);
        },
        afterConnect: async (connection: any) => {
          this.emit('afterConnect', { pool: name, connection });
          this.incrementStat(`${name}:connection:success`);
          
          // Set connection parameters for optimization
          await connection.query('SET statement_timeout = 30000'); // 30 seconds
          await connection.query('SET lock_timeout = 10000'); // 10 seconds
          await connection.query('SET idle_in_transaction_session_timeout = 60000'); // 1 minute
        },
        beforeDisconnect: async () => {
          this.emit('beforeDisconnect', { pool: name });
        }
      }
    };

    const sequelize = new Sequelize(poolConfig);

    // Add connection health check
    this.setupHealthCheck(sequelize, name);

    return sequelize;
  }

  /**
   * Get write connection
   */
  getWriteConnection(): Sequelize {
    return this.writePool;
  }

  /**
   * Get read connection with load balancing
   */
  getReadConnection(): Sequelize {
    if (this.readPools.length === 0) {
      return this.writePool;
    }

    if (this.config.read?.loadBalancing === 'round-robin') {
      const pool = this.readPools[this.readPoolIndex];
      this.readPoolIndex = (this.readPoolIndex + 1) % this.readPools.length;
      return pool;
    } else {
      // Random load balancing
      const index = Math.floor(Math.random() * this.readPools.length);
      return this.readPools[index];
    }
  }

  /**
   * Execute query with automatic pool selection
   */
  async query(
    sql: string,
    options?: any,
    forceWrite: boolean = false
  ): Promise<any> {
    const isWriteQuery = this.isWriteQuery(sql) || forceWrite;
    const pool = isWriteQuery ? this.getWriteConnection() : this.getReadConnection();
    
    const startTime = Date.now();
    
    try {
      const result = await pool.query(sql, options);
      
      const duration = Date.now() - startTime;
      this.trackQueryPerformance(sql, duration, isWriteQuery);
      
      return result;
    } catch (error) {
      this.incrementStat(isWriteQuery ? 'write:errors' : 'read:errors');
      this.logger.error('Query execution failed', error, { sql, isWriteQuery });
      throw error;
    }
  }

  /**
   * Execute transaction
   */
  async transaction<T>(
    callback: (t: any) => Promise<T>,
    options?: any
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await this.writePool.transaction(callback, options);
      
      const duration = Date.now() - startTime;
      this.incrementStat('transactions:success');
      this.logger.debug('Transaction completed', { duration });
      
      return result;
    } catch (error) {
      this.incrementStat('transactions:failed');
      this.logger.error('Transaction failed', error);
      throw error;
    }
  }

  /**
   * Get pool statistics
   */
  async getStats(): Promise<{
    write: PoolStats;
    read: PoolStats[];
    overall: {
      queries: number;
      errors: number;
      avgQueryTime: number;
      transactions: {
        success: number;
        failed: number;
      };
    };
  }> {
    const writeStats = await this.getPoolStats(this.writePool, 'write');
    const readStats = await Promise.all(
      this.readPools.map((pool, index) => 
        this.getPoolStats(pool, `read-${index}`)
      )
    );

    const queries = (this.stats.get('queries:total') || 0);
    const queryTime = (this.stats.get('queries:totalTime') || 0);
    
    return {
      write: writeStats,
      read: readStats,
      overall: {
        queries,
        errors: (this.stats.get('write:errors') || 0) + (this.stats.get('read:errors') || 0),
        avgQueryTime: queries > 0 ? queryTime / queries : 0,
        transactions: {
          success: this.stats.get('transactions:success') || 0,
          failed: this.stats.get('transactions:failed') || 0
        }
      }
    };
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    this.logger.info('Closing connection pools');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    await Promise.all([
      this.writePool.close(),
      ...this.readPools.map(pool => pool.close())
    ]);

    this.logger.info('All connection pools closed');
  }

  /**
   * Health check for all pools
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    pools: Array<{
      name: string;
      healthy: boolean;
      latency: number;
      error?: string;
    }>;
  }> {
    const checks = await Promise.all([
      this.checkPoolHealth(this.writePool, 'write'),
      ...this.readPools.map((pool, index) => 
        this.checkPoolHealth(pool, `read-${index}`)
      )
    ]);

    const healthy = checks.every(check => check.healthy);

    return { healthy, pools: checks };
  }

  // Private helper methods

  private setupHealthCheck(sequelize: Sequelize, name: string): void {
    // Add connection retry logic
    let retryCount = 0;
    const maxRetries = 3;
    
    sequelize.beforeConnect((config: any) => {
      config.retry = {
        max: maxRetries,
        backoffBase: 300,
        backoffExponent: 1.5
      };
    });

    sequelize.afterConnect(() => {
      retryCount = 0;
    });

    sequelize.connectionManager.on('connect:error', (error: Error) => {
      retryCount++;
      this.logger.warn(`Connection error for pool ${name}`, {
        error: error.message,
        retryCount,
        maxRetries
      });
      
      if (retryCount >= maxRetries) {
        this.emit('poolError', { pool: name, error, fatal: true });
      }
    });
  }

  private async getPoolStats(pool: Sequelize, name: string): Promise<PoolStats> {
    const poolInstance = (pool as any).connectionManager.pool;
    
    if (!poolInstance) {
      return {
        total: 0,
        idle: 0,
        active: 0,
        waiting: 0,
        maxConnections: this.config.pool.max,
        avgAcquireTime: 0,
        avgActiveTime: 0,
        errors: this.stats.get(`${name}:errors`) || 0,
        timeouts: this.stats.get(`${name}:timeouts`) || 0
      };
    }

    return {
      total: poolInstance.totalCount || 0,
      idle: poolInstance.idleCount || 0,
      active: poolInstance.activeCount || 0,
      waiting: poolInstance.waitingCount || 0,
      maxConnections: this.config.pool.max,
      avgAcquireTime: this.stats.get(`${name}:avgAcquireTime`) || 0,
      avgActiveTime: this.stats.get(`${name}:avgActiveTime`) || 0,
      errors: this.stats.get(`${name}:errors`) || 0,
      timeouts: this.stats.get(`${name}:timeouts`) || 0
    };
  }

  private async checkPoolHealth(pool: Sequelize, name: string): Promise<{
    name: string;
    healthy: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await pool.query('SELECT 1', { raw: true });
      const latency = Date.now() - startTime;
      
      return {
        name,
        healthy: true,
        latency
      };
    } catch (error: any) {
      return {
        name,
        healthy: false,
        latency: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private isWriteQuery(sql: string): boolean {
    const writeKeywords = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE'];
    const upperSql = sql.trim().toUpperCase();
    
    return writeKeywords.some(keyword => upperSql.startsWith(keyword));
  }

  private logQuery(sql: string, timing?: number, pool?: string): void {
    if (timing && this.config.monitoring?.slowQueryThreshold) {
      if (timing > this.config.monitoring.slowQueryThreshold) {
        this.logger.warn('Slow query detected', {
          sql: sql.substring(0, 200),
          timing,
          pool,
          threshold: this.config.monitoring.slowQueryThreshold
        });
        
        this.emit('slowQuery', { sql, timing, pool });
      }
    }

    this.logger.debug('Query executed', {
      pool,
      timing,
      type: this.isWriteQuery(sql) ? 'write' : 'read'
    });
  }

  private trackQueryPerformance(sql: string, duration: number, isWrite: boolean): void {
    this.incrementStat('queries:total');
    this.incrementStat('queries:totalTime', duration);
    this.incrementStat(isWrite ? 'write:queries' : 'read:queries');
    
    // Track query patterns
    const queryType = sql.trim().split(' ')[0].toUpperCase();
    this.incrementStat(`queries:${queryType}`);
  }

  private incrementStat(key: string, amount: number = 1): void {
    const current = this.stats.get(key) || 0;
    this.stats.set(key, current + amount);
  }

  private startMonitoring(): void {
    const interval = this.config.monitoring?.interval || 30000; // 30 seconds
    
    this.monitoringInterval = setInterval(async () => {
      try {
        const stats = await this.getStats();
        
        this.emit('stats', stats);
        
        // Check for issues
        if (stats.write.waiting > 5) {
          this.logger.warn('High connection wait count', {
            pool: 'write',
            waiting: stats.write.waiting
          });
        }
        
        // Reset rolling stats
        this.resetRollingStats();
      } catch (error) {
        this.logger.error('Monitoring error', error);
      }
    }, interval);
  }

  private resetRollingStats(): void {
    // Reset stats that should be calculated over intervals
    const rollingStats = [
      'queries:total',
      'queries:totalTime',
      'write:queries',
      'read:queries'
    ];
    
    rollingStats.forEach(stat => this.stats.delete(stat));
  }
}

// Factory function for creating optimized connection pools
export function createConnectionPool(config: Partial<ConnectionPoolConfig>): ConnectionPool {
  const defaultConfig: ConnectionPoolConfig = {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'forten',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      dialect: 'postgres'
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000'),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'),
      evict: parseInt(process.env.DB_POOL_EVICT || '1000'),
      maxUses: 1000, // Recreate connection after 1000 uses
      connectionTimeoutMillis: 30000
    },
    monitoring: {
      enabled: true,
      interval: 30000,
      slowQueryThreshold: 1000
    }
  };

  const mergedConfig = {
    ...defaultConfig,
    ...config,
    database: { ...defaultConfig.database, ...config.database },
    pool: { ...defaultConfig.pool, ...config.pool },
    monitoring: { ...defaultConfig.monitoring, ...config.monitoring }
  };

  return new ConnectionPool(mergedConfig);
}