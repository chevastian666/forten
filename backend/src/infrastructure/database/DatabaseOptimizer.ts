import { Sequelize } from 'sequelize';
import { ConnectionPool } from './ConnectionPool';
import { QueryOptimizer } from './QueryOptimizer';
import { PaginationService } from './PaginationService';
import { CacheService } from '../cache/CacheService';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import { HealthCheckService } from '../health/HealthCheckService';
import { Logger } from '../logging/Logger';
import { Redis } from 'ioredis';

export interface DatabaseOptimizerConfig {
  connectionPool: ConnectionPool;
  redis: Redis;
  cache: CacheService;
  monitoring?: {
    enabled: boolean;
    interval?: number;
    thresholds?: {
      slowQuery?: number;
      connectionPoolUtilization?: number;
      cacheHitRate?: number;
    };
  };
  optimization?: {
    autoVacuum?: boolean;
    autoAnalyze?: boolean;
    autoReindex?: boolean;
    schedule?: string; // cron expression
  };
}

export class DatabaseOptimizer {
  private readonly logger: Logger;
  private readonly queryOptimizer: QueryOptimizer;
  private readonly paginationService: PaginationService;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly healthCheck: HealthCheckService;
  private optimizationInterval?: NodeJS.Timeout;
  
  constructor(private readonly config: DatabaseOptimizerConfig) {
    this.logger = new Logger('DatabaseOptimizer');
    
    // Initialize services
    const sequelize = config.connectionPool.getWriteConnection();
    
    this.queryOptimizer = new QueryOptimizer(sequelize, config.cache);
    this.paginationService = new PaginationService(sequelize, config.cache);
    this.performanceMonitor = new PerformanceMonitor(config.redis, {
      interval: config.monitoring?.interval || 60000,
      thresholds: config.monitoring?.thresholds
    });
    
    this.healthCheck = new HealthCheckService({
      database: {
        sequelize,
        readReplicas: []
      },
      redis: {
        client: config.redis
      },
      disk: {
        path: process.cwd()
      },
      memory: {}
    });
    
    // Set up monitoring if enabled
    if (config.monitoring?.enabled) {
      this.setupMonitoring();
    }
    
    // Set up automatic optimization if configured
    if (config.optimization) {
      this.setupAutomaticOptimization();
    }
  }

  /**
   * Initialize all optimization features
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing database optimizer');
    
    // Start health checks
    this.healthCheck.startPeriodicChecks(60000);
    
    // Start performance monitoring
    if (this.config.monitoring?.enabled) {
      this.performanceMonitor.start();
    }
    
    // Warm up cache
    await this.config.cache.warmUp();
    
    // Run initial optimization
    await this.runOptimization();
    
    this.logger.info('Database optimizer initialized');
  }

  /**
   * Shutdown optimizer and cleanup resources
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down database optimizer');
    
    // Stop monitoring
    this.performanceMonitor.stop();
    this.healthCheck.stopPeriodicChecks();
    
    // Clear intervals
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }
    
    // Close connections
    await this.config.connectionPool.close();
    
    this.logger.info('Database optimizer shut down');
  }

  /**
   * Run comprehensive optimization
   */
  async runOptimization(): Promise<{
    vacuumed: boolean;
    analyzed: boolean;
    reindexed: boolean;
    slowQueries: number;
    suggestedIndexes: any[];
  }> {
    this.logger.info('Running database optimization');
    
    const results = {
      vacuumed: false,
      analyzed: false,
      reindexed: false,
      slowQueries: 0,
      suggestedIndexes: [] as any[]
    };
    
    try {
      // Identify slow queries
      const slowQueries = this.queryOptimizer.getSlowQueries();
      results.slowQueries = slowQueries.length;
      
      if (slowQueries.length > 0) {
        this.logger.warn(`Found ${slowQueries.length} slow queries`);
        
        // Analyze and optimize slow queries
        for (const query of slowQueries.slice(0, 5)) {
          await this.queryOptimizer.optimizeQuery(query.query);
        }
      }
      
      // Suggest missing indexes
      results.suggestedIndexes = await this.queryOptimizer.suggestIndexes();
      
      if (results.suggestedIndexes.length > 0) {
        this.logger.info(`Suggested ${results.suggestedIndexes.length} new indexes`);
      }
      
      // Run maintenance operations
      if (this.config.optimization?.autoVacuum) {
        await this.runVacuum();
        results.vacuumed = true;
      }
      
      if (this.config.optimization?.autoAnalyze) {
        await this.runAnalyze();
        results.analyzed = true;
      }
      
      if (this.config.optimization?.autoReindex) {
        await this.runReindex();
        results.reindexed = true;
      }
      
      this.logger.info('Database optimization completed', results);
      
      return results;
    } catch (error) {
      this.logger.error('Database optimization failed', error);
      throw error;
    }
  }

  /**
   * Get optimization report
   */
  async getOptimizationReport(): Promise<{
    performance: any;
    health: any;
    recommendations: string[];
    issues: string[];
  }> {
    const [performanceReport, healthCheck, poolStats, cacheStats] = await Promise.all([
      this.performanceMonitor.getPerformanceReport(),
      this.healthCheck.check(),
      this.config.connectionPool.getStats(),
      this.config.cache.getStats()
    ]);
    
    const recommendations: string[] = [];
    const issues: string[] = [];
    
    // Analyze performance metrics
    if (performanceReport.summary.health !== 'good') {
      issues.push(...performanceReport.summary.issues);
      recommendations.push(...performanceReport.summary.recommendations);
    }
    
    // Check connection pool utilization
    const poolUtilization = poolStats.write.active / poolStats.write.maxConnections;
    if (poolUtilization > 0.8) {
      issues.push('High connection pool utilization');
      recommendations.push('Consider increasing max connections or optimizing query performance');
    }
    
    // Check cache effectiveness
    if (cacheStats.hitRate < 0.5) {
      issues.push('Low cache hit rate');
      recommendations.push('Review cache TTL values and caching strategy');
    }
    
    // Check for slow queries
    const slowQueries = this.queryOptimizer.getSlowQueries();
    if (slowQueries.length > 10) {
      issues.push(`${slowQueries.length} slow queries detected`);
      recommendations.push('Run query optimization to identify and fix slow queries');
    }
    
    return {
      performance: performanceReport,
      health: healthCheck,
      recommendations,
      issues
    };
  }

  /**
   * Export optimization metrics
   */
  async exportMetrics(format: 'json' | 'prometheus' = 'json'): Promise<string> {
    const [performanceMetrics, poolStats, cacheStats] = await Promise.all([
      this.performanceMonitor.getCurrentMetrics(),
      this.config.connectionPool.getStats(),
      this.config.cache.getStats()
    ]);
    
    const metrics = {
      timestamp: new Date(),
      performance: performanceMetrics,
      connectionPool: poolStats,
      cache: cacheStats,
      queryStats: this.queryOptimizer.getQueryStats()
    };
    
    if (format === 'prometheus') {
      return this.formatPrometheusMetrics(metrics);
    }
    
    return JSON.stringify(metrics, null, 2);
  }

  // Getter methods for services
  get query(): QueryOptimizer {
    return this.queryOptimizer;
  }
  
  get pagination(): PaginationService {
    return this.paginationService;
  }
  
  get monitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }
  
  get health(): HealthCheckService {
    return this.healthCheck;
  }

  // Private helper methods

  private setupMonitoring(): void {
    // Monitor slow queries
    this.config.connectionPool.on('slowQuery', async ({ sql, timing }) => {
      await this.queryOptimizer.trackQuery(sql, timing);
    });
    
    // Monitor connection pool events
    this.config.connectionPool.on('poolError', ({ pool, error }) => {
      this.logger.error(`Connection pool error: ${pool}`, error);
    });
    
    // Monitor performance thresholds
    this.performanceMonitor.on('threshold:cpu', (usage) => {
      this.logger.warn(`CPU usage threshold exceeded: ${usage}%`);
    });
    
    this.performanceMonitor.on('threshold:memory', (usage) => {
      this.logger.warn(`Memory usage threshold exceeded: ${usage}%`);
    });
  }

  private setupAutomaticOptimization(): void {
    // Run optimization daily at 2 AM by default
    const interval = 24 * 60 * 60 * 1000; // 24 hours
    
    this.optimizationInterval = setInterval(async () => {
      try {
        await this.runOptimization();
      } catch (error) {
        this.logger.error('Automatic optimization failed', error);
      }
    }, interval);
  }

  private async runVacuum(): Promise<void> {
    const sequelize = this.config.connectionPool.getWriteConnection();
    
    try {
      await sequelize.query('VACUUM ANALYZE');
      this.logger.info('Database vacuum completed');
    } catch (error) {
      this.logger.error('Vacuum failed', error);
    }
  }

  private async runAnalyze(): Promise<void> {
    const sequelize = this.config.connectionPool.getWriteConnection();
    
    try {
      await sequelize.query('ANALYZE');
      this.logger.info('Database analyze completed');
    } catch (error) {
      this.logger.error('Analyze failed', error);
    }
  }

  private async runReindex(): Promise<void> {
    const sequelize = this.config.connectionPool.getWriteConnection();
    
    try {
      // Get all indexes
      const indexes = await sequelize.query(`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname NOT LIKE 'pg_%'
      `, { type: 'SELECT' });
      
      // Reindex each table
      const tables = new Set(indexes.map((idx: any) => idx.tablename));
      
      for (const table of tables) {
        await sequelize.query(`REINDEX TABLE ${table}`);
        this.logger.debug(`Reindexed table: ${table}`);
      }
      
      this.logger.info(`Database reindex completed for ${tables.size} tables`);
    } catch (error) {
      this.logger.error('Reindex failed', error);
    }
  }

  private formatPrometheusMetrics(metrics: any): string {
    const lines: string[] = [];
    
    // Connection pool metrics
    lines.push(`# HELP db_connections_active Active database connections`);
    lines.push(`# TYPE db_connections_active gauge`);
    lines.push(`db_connections_active{pool="write"} ${metrics.connectionPool.write.active}`);
    
    lines.push(`# HELP db_connections_idle Idle database connections`);
    lines.push(`# TYPE db_connections_idle gauge`);
    lines.push(`db_connections_idle{pool="write"} ${metrics.connectionPool.write.idle}`);
    
    // Cache metrics
    lines.push(`# HELP cache_hit_rate Cache hit rate`);
    lines.push(`# TYPE cache_hit_rate gauge`);
    lines.push(`cache_hit_rate ${metrics.cache.hitRate}`);
    
    lines.push(`# HELP cache_operations_total Total cache operations`);
    lines.push(`# TYPE cache_operations_total counter`);
    lines.push(`cache_operations_total{type="hits"} ${metrics.cache.hits}`);
    lines.push(`cache_operations_total{type="misses"} ${metrics.cache.misses}`);
    
    // Query metrics
    const queryStats = metrics.queryStats.slice(0, 10);
    lines.push(`# HELP db_query_duration_seconds Query execution time`);
    lines.push(`# TYPE db_query_duration_seconds summary`);
    
    queryStats.forEach((stat: any, index: number) => {
      lines.push(`db_query_duration_seconds{query="query_${index}"} ${stat.avgTime / 1000}`);
    });
    
    return lines.join('\n');
  }
}

// Factory function to create database optimizer
export function createDatabaseOptimizer(
  connectionPool: ConnectionPool,
  redis: Redis,
  options?: Partial<DatabaseOptimizerConfig>
): DatabaseOptimizer {
  const cache = new CacheService(redis);
  
  const config: DatabaseOptimizerConfig = {
    connectionPool,
    redis,
    cache,
    monitoring: {
      enabled: true,
      interval: 60000,
      thresholds: {
        slowQuery: 1000,
        connectionPoolUtilization: 0.8,
        cacheHitRate: 0.5
      },
      ...options?.monitoring
    },
    optimization: {
      autoVacuum: true,
      autoAnalyze: true,
      autoReindex: false,
      ...options?.optimization
    }
  };
  
  return new DatabaseOptimizer(config);
}