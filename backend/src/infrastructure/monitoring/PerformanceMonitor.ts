import { EventEmitter } from 'events';
import { Logger } from '../logging/Logger';
import { Redis } from 'ioredis';
import * as os from 'os';
import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
  timestamp: Date;
  system: SystemMetrics;
  application: ApplicationMetrics;
  database: DatabaseMetrics;
  cache: CacheMetrics;
  api: APIMetrics;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  uptime: number;
}

export interface ApplicationMetrics {
  requests: {
    total: number;
    active: number;
    rate: number; // requests per second
  };
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  errors: {
    total: number;
    rate: number;
    by_type: Record<string, number>;
  };
  throughput: number; // bytes per second
}

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    total: number;
    waiting: number;
  };
  queries: {
    total: number;
    slow: number;
    failed: number;
    avgTime: number;
  };
  transactions: {
    total: number;
    committed: number;
    rolledBack: number;
    active: number;
  };
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  evictions: number;
  operations: {
    gets: number;
    sets: number;
    deletes: number;
  };
}

export interface APIMetrics {
  endpoints: Record<string, EndpointMetrics>;
  methods: Record<string, number>;
  statusCodes: Record<string, number>;
}

export interface EndpointMetrics {
  count: number;
  avgTime: number;
  errors: number;
  lastAccess: Date;
}

export class PerformanceMonitor extends EventEmitter {
  private readonly logger: Logger;
  private readonly metricsKey = 'performance:metrics';
  private readonly historyKey = 'performance:history';
  private metricsInterval?: NodeJS.Timeout;
  private requestMetrics: Map<string, number[]> = new Map();
  private errorCounts: Map<string, number> = new Map();
  
  constructor(
    private readonly redis: Redis,
    private readonly options: {
      interval?: number;
      historyRetention?: number;
      thresholds?: {
        cpu?: number;
        memory?: number;
        responseTime?: number;
        errorRate?: number;
      };
    } = {}
  ) {
    super();
    this.logger = new Logger('PerformanceMonitor');
  }

  /**
   * Start monitoring
   */
  start(): void {
    const interval = this.options.interval || 60000; // 1 minute default
    
    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        await this.storeMetrics(metrics);
        await this.checkThresholds(metrics);
        
        this.emit('metrics', metrics);
      } catch (error) {
        this.logger.error('Failed to collect metrics', error);
      }
    }, interval);

    this.logger.info('Performance monitoring started', { interval });
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
    
    this.logger.info('Performance monitoring stopped');
  }

  /**
   * Track API request
   */
  trackRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    error?: Error
  ): void {
    // Update request metrics
    const key = `${method}:${endpoint}`;
    const times = this.requestMetrics.get(key) || [];
    times.push(responseTime);
    
    // Keep only last 1000 measurements
    if (times.length > 1000) {
      times.shift();
    }
    
    this.requestMetrics.set(key, times);

    // Track errors
    if (error || statusCode >= 400) {
      const errorType = error?.name || `HTTP_${statusCode}`;
      this.errorCounts.set(errorType, (this.errorCounts.get(errorType) || 0) + 1);
    }
  }

  /**
   * Get current metrics
   */
  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    return this.collectMetrics();
  }

  /**
   * Get metrics history
   */
  async getMetricsHistory(
    duration: number = 3600000 // 1 hour
  ): Promise<PerformanceMetrics[]> {
    const now = Date.now();
    const start = now - duration;
    
    const history = await this.redis.zrangebyscore(
      this.historyKey,
      start,
      now,
      'WITHSCORES'
    );

    const metrics: PerformanceMetrics[] = [];
    
    for (let i = 0; i < history.length; i += 2) {
      const data = JSON.parse(history[i]);
      metrics.push({
        ...data,
        timestamp: new Date(parseInt(history[i + 1]))
      });
    }

    return metrics;
  }

  /**
   * Get performance report
   */
  async getPerformanceReport(): Promise<{
    summary: {
      health: 'good' | 'warning' | 'critical';
      issues: string[];
      recommendations: string[];
    };
    current: PerformanceMetrics;
    trends: {
      cpu: number; // percentage change
      memory: number;
      responseTime: number;
      errorRate: number;
    };
  }> {
    const current = await this.getCurrentMetrics();
    const history = await this.getMetricsHistory(3600000); // Last hour
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze current metrics
    if (current.system.cpu.usage > 80) {
      issues.push('High CPU usage detected');
      recommendations.push('Consider scaling horizontally or optimizing CPU-intensive operations');
    }

    if (current.system.memory.percentage > 85) {
      issues.push('High memory usage detected');
      recommendations.push('Review memory leaks or increase available memory');
    }

    if (current.database.queries.slow > 10) {
      issues.push('Multiple slow queries detected');
      recommendations.push('Review and optimize slow queries');
    }

    if (current.cache.hitRate < 0.5) {
      issues.push('Low cache hit rate');
      recommendations.push('Review cache strategy and TTL values');
    }

    // Calculate trends
    const trends = this.calculateTrends(current, history);
    
    // Determine health status
    let health: 'good' | 'warning' | 'critical' = 'good';
    if (issues.length > 2 || current.system.cpu.usage > 90) {
      health = 'critical';
    } else if (issues.length > 0) {
      health = 'warning';
    }

    return {
      summary: { health, issues, recommendations },
      current,
      trends
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  async exportMetrics(format: 'prometheus' | 'json' = 'json'): Promise<string> {
    const metrics = await this.getCurrentMetrics();
    
    if (format === 'prometheus') {
      return this.formatPrometheus(metrics);
    }
    
    return JSON.stringify(metrics, null, 2);
  }

  // Private helper methods

  private async collectMetrics(): Promise<PerformanceMetrics> {
    const [system, application, database, cache, api] = await Promise.all([
      this.collectSystemMetrics(),
      this.collectApplicationMetrics(),
      this.collectDatabaseMetrics(),
      this.collectCacheMetrics(),
      this.collectAPIMetrics()
    ]);

    return {
      timestamp: new Date(),
      system,
      application,
      database,
      cache,
      api
    };
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    
    const cpuUsage = 100 - ~~(100 * totalIdle / totalTick);

    return {
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg()
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentage: (usedMemory / totalMemory) * 100
      },
      disk: {
        // This would require additional system calls or libraries
        total: 0,
        used: 0,
        free: 0,
        percentage: 0
      },
      uptime: os.uptime()
    };
  }

  private async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    // Calculate response time percentiles
    const allResponseTimes: number[] = [];
    this.requestMetrics.forEach(times => {
      allResponseTimes.push(...times);
    });
    
    allResponseTimes.sort((a, b) => a - b);
    
    const percentile = (p: number) => {
      const index = Math.ceil(allResponseTimes.length * p / 100);
      return allResponseTimes[index - 1] || 0;
    };

    // Calculate error rate
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    const totalRequests = allResponseTimes.length;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return {
      requests: {
        total: totalRequests,
        active: 0, // Would need request tracking middleware
        rate: totalRequests / 60 // Rough estimate
      },
      responseTime: {
        avg: allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length || 0,
        p50: percentile(50),
        p95: percentile(95),
        p99: percentile(99),
        max: Math.max(...allResponseTimes, 0)
      },
      errors: {
        total: totalErrors,
        rate: errorRate,
        by_type: Object.fromEntries(this.errorCounts)
      },
      throughput: 0 // Would need request size tracking
    };
  }

  private async collectDatabaseMetrics(): Promise<DatabaseMetrics> {
    // This would be populated by the ConnectionPool stats
    const dbStats = await this.redis.get('db:stats');
    
    if (dbStats) {
      return JSON.parse(dbStats);
    }

    return {
      connections: {
        active: 0,
        idle: 0,
        total: 0,
        waiting: 0
      },
      queries: {
        total: 0,
        slow: 0,
        failed: 0,
        avgTime: 0
      },
      transactions: {
        total: 0,
        committed: 0,
        rolledBack: 0,
        active: 0
      }
    };
  }

  private async collectCacheMetrics(): Promise<CacheMetrics> {
    const stats = await this.redis.get('cache:stats');
    
    if (stats) {
      return JSON.parse(stats);
    }

    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      evictions: 0,
      operations: {
        gets: 0,
        sets: 0,
        deletes: 0
      }
    };
  }

  private async collectAPIMetrics(): Promise<APIMetrics> {
    const endpoints: Record<string, EndpointMetrics> = {};
    const methods: Record<string, number> = {};
    const statusCodes: Record<string, number> = {};

    // Process request metrics
    this.requestMetrics.forEach((times, key) => {
      const [method, ...pathParts] = key.split(':');
      const endpoint = pathParts.join(':');
      
      endpoints[endpoint] = {
        count: times.length,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
        errors: 0,
        lastAccess: new Date()
      };
      
      methods[method] = (methods[method] || 0) + times.length;
    });

    return { endpoints, methods, statusCodes };
  }

  private async storeMetrics(metrics: PerformanceMetrics): Promise<void> {
    const timestamp = metrics.timestamp.getTime();
    
    // Store current metrics
    await this.redis.set(
      this.metricsKey,
      JSON.stringify(metrics),
      'EX',
      300 // 5 minutes
    );

    // Store in history
    await this.redis.zadd(
      this.historyKey,
      timestamp,
      JSON.stringify(metrics)
    );

    // Cleanup old history
    const retention = this.options.historyRetention || 86400000; // 24 hours
    await this.redis.zremrangebyscore(
      this.historyKey,
      '-inf',
      timestamp - retention
    );
  }

  private async checkThresholds(metrics: PerformanceMetrics): Promise<void> {
    const thresholds = this.options.thresholds || {};
    
    if (thresholds.cpu && metrics.system.cpu.usage > thresholds.cpu) {
      this.emit('threshold:cpu', metrics.system.cpu.usage);
      this.logger.warn('CPU threshold exceeded', {
        current: metrics.system.cpu.usage,
        threshold: thresholds.cpu
      });
    }

    if (thresholds.memory && metrics.system.memory.percentage > thresholds.memory) {
      this.emit('threshold:memory', metrics.system.memory.percentage);
      this.logger.warn('Memory threshold exceeded', {
        current: metrics.system.memory.percentage,
        threshold: thresholds.memory
      });
    }

    if (thresholds.responseTime && metrics.application.responseTime.avg > thresholds.responseTime) {
      this.emit('threshold:responseTime', metrics.application.responseTime.avg);
      this.logger.warn('Response time threshold exceeded', {
        current: metrics.application.responseTime.avg,
        threshold: thresholds.responseTime
      });
    }

    if (thresholds.errorRate && metrics.application.errors.rate > thresholds.errorRate) {
      this.emit('threshold:errorRate', metrics.application.errors.rate);
      this.logger.warn('Error rate threshold exceeded', {
        current: metrics.application.errors.rate,
        threshold: thresholds.errorRate
      });
    }
  }

  private calculateTrends(
    current: PerformanceMetrics,
    history: PerformanceMetrics[]
  ): {
    cpu: number;
    memory: number;
    responseTime: number;
    errorRate: number;
  } {
    if (history.length === 0) {
      return { cpu: 0, memory: 0, responseTime: 0, errorRate: 0 };
    }

    const avgHistory = {
      cpu: history.reduce((sum, m) => sum + m.system.cpu.usage, 0) / history.length,
      memory: history.reduce((sum, m) => sum + m.system.memory.percentage, 0) / history.length,
      responseTime: history.reduce((sum, m) => sum + m.application.responseTime.avg, 0) / history.length,
      errorRate: history.reduce((sum, m) => sum + m.application.errors.rate, 0) / history.length
    };

    return {
      cpu: ((current.system.cpu.usage - avgHistory.cpu) / avgHistory.cpu) * 100,
      memory: ((current.system.memory.percentage - avgHistory.memory) / avgHistory.memory) * 100,
      responseTime: ((current.application.responseTime.avg - avgHistory.responseTime) / avgHistory.responseTime) * 100,
      errorRate: ((current.application.errors.rate - avgHistory.errorRate) / avgHistory.errorRate) * 100
    };
  }

  private formatPrometheus(metrics: PerformanceMetrics): string {
    const lines: string[] = [];
    
    // System metrics
    lines.push(`# HELP system_cpu_usage CPU usage percentage`);
    lines.push(`# TYPE system_cpu_usage gauge`);
    lines.push(`system_cpu_usage ${metrics.system.cpu.usage}`);
    
    lines.push(`# HELP system_memory_usage Memory usage percentage`);
    lines.push(`# TYPE system_memory_usage gauge`);
    lines.push(`system_memory_usage ${metrics.system.memory.percentage}`);
    
    // Application metrics
    lines.push(`# HELP app_response_time_avg Average response time in ms`);
    lines.push(`# TYPE app_response_time_avg gauge`);
    lines.push(`app_response_time_avg ${metrics.application.responseTime.avg}`);
    
    lines.push(`# HELP app_error_rate Application error rate`);
    lines.push(`# TYPE app_error_rate gauge`);
    lines.push(`app_error_rate ${metrics.application.errors.rate}`);
    
    // Cache metrics
    lines.push(`# HELP cache_hit_rate Cache hit rate`);
    lines.push(`# TYPE cache_hit_rate gauge`);
    lines.push(`cache_hit_rate ${metrics.cache.hitRate}`);
    
    return lines.join('\n');
  }
}