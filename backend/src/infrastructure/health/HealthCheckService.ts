import { Logger } from '../logging/Logger';
import { Sequelize } from 'sequelize';
import { Redis } from 'ioredis';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as os from 'os';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    disk: ComponentHealth;
    memory: ComponentHealth;
    externalServices: Record<string, ComponentHealth>;
  };
  details?: any;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  details?: any;
}

export interface HealthCheckConfig {
  database: {
    sequelize: Sequelize;
    timeout?: number;
    readReplicas?: Sequelize[];
  };
  redis: {
    client: Redis;
    timeout?: number;
  };
  disk: {
    path: string;
    thresholdPercentage?: number;
  };
  memory: {
    thresholdPercentage?: number;
  };
  externalServices?: Array<{
    name: string;
    url: string;
    timeout?: number;
    required?: boolean;
  }>;
  version?: string;
}

export class HealthCheckService {
  private readonly logger: Logger;
  private lastHealthCheck?: HealthCheckResult;
  private healthCheckInterval?: NodeJS.Timeout;
  
  constructor(private readonly config: HealthCheckConfig) {
    this.logger = new Logger('HealthCheckService');
  }

  /**
   * Perform comprehensive health check
   */
  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const [database, redis, disk, memory, externalServices] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkDisk(),
        this.checkMemory(),
        this.checkExternalServices()
      ]);

      const checks = { database, redis, disk, memory, externalServices };
      const status = this.determineOverallStatus(checks);

      const result: HealthCheckResult = {
        status,
        timestamp: new Date(),
        version: this.config.version || process.env.npm_package_version || 'unknown',
        uptime: process.uptime(),
        checks
      };

      this.lastHealthCheck = result;
      
      const duration = Date.now() - startTime;
      this.logger.info('Health check completed', { status, duration });
      
      return result;
    } catch (error) {
      this.logger.error('Health check failed', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        version: this.config.version || 'unknown',
        uptime: process.uptime(),
        checks: {
          database: { status: 'unhealthy', message: 'Check failed' },
          redis: { status: 'unhealthy', message: 'Check failed' },
          disk: { status: 'unhealthy', message: 'Check failed' },
          memory: { status: 'unhealthy', message: 'Check failed' },
          externalServices: {}
        },
        details: { error: error.message }
      };
    }
  }

  /**
   * Get last health check result
   */
  getLastCheck(): HealthCheckResult | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(intervalMs: number = 60000): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.check();
      } catch (error) {
        this.logger.error('Periodic health check failed', error);
      }
    }, intervalMs);
    
    // Run initial check
    this.check().catch(error => {
      this.logger.error('Initial health check failed', error);
    });
    
    this.logger.info('Periodic health checks started', { interval: intervalMs });
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    
    this.logger.info('Periodic health checks stopped');
  }

  /**
   * Express middleware for health endpoint
   */
  middleware() {
    return async (req: any, res: any) => {
      try {
        const result = await this.check();
        
        const httpStatus = result.status === 'healthy' ? 200 : 
                          result.status === 'degraded' ? 200 : 503;
        
        res.status(httpStatus).json(result);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date(),
          error: 'Health check failed'
        });
      }
    };
  }

  /**
   * Simple liveness check middleware
   */
  livenessMiddleware() {
    return (req: any, res: any) => {
      res.status(200).json({
        status: 'alive',
        timestamp: new Date(),
        uptime: process.uptime()
      });
    };
  }

  /**
   * Readiness check middleware
   */
  readinessMiddleware() {
    return async (req: any, res: any) => {
      const lastCheck = this.getLastCheck();
      
      if (!lastCheck) {
        const result = await this.check();
        const isReady = result.status !== 'unhealthy';
        res.status(isReady ? 200 : 503).json({
          ready: isReady,
          status: result.status,
          timestamp: result.timestamp
        });
      } else {
        const isReady = lastCheck.status !== 'unhealthy';
        res.status(isReady ? 200 : 503).json({
          ready: isReady,
          status: lastCheck.status,
          timestamp: lastCheck.timestamp
        });
      }
    };
  }

  // Private health check methods

  private async checkDatabase(): Promise<ComponentHealth> {
    const timeout = this.config.database.timeout || 5000;
    const startTime = Date.now();
    
    try {
      // Check main database
      await Promise.race([
        this.config.database.sequelize.authenticate(),
        this.createTimeout(timeout, 'Database connection timeout')
      ]);
      
      const mainLatency = Date.now() - startTime;
      
      // Check read replicas if configured
      const replicaResults = await this.checkReadReplicas();
      
      if (replicaResults.some(r => r.status === 'unhealthy')) {
        return {
          status: 'degraded',
          latency: mainLatency,
          message: 'Some read replicas are unhealthy',
          details: { replicas: replicaResults }
        };
      }
      
      return {
        status: 'healthy',
        latency: mainLatency,
        details: { replicas: replicaResults }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        message: error.message
      };
    }
  }

  private async checkReadReplicas(): Promise<ComponentHealth[]> {
    if (!this.config.database.readReplicas || this.config.database.readReplicas.length === 0) {
      return [];
    }
    
    return Promise.all(
      this.config.database.readReplicas.map(async (replica, index) => {
        const startTime = Date.now();
        try {
          await replica.authenticate();
          return {
            status: 'healthy' as const,
            latency: Date.now() - startTime,
            details: { replica: index }
          };
        } catch (error: any) {
          return {
            status: 'unhealthy' as const,
            latency: Date.now() - startTime,
            message: error.message,
            details: { replica: index }
          };
        }
      })
    );
  }

  private async checkRedis(): Promise<ComponentHealth> {
    const timeout = this.config.redis.timeout || 5000;
    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        this.config.redis.client.ping(),
        this.createTimeout(timeout, 'Redis connection timeout')
      ]);
      
      if (result !== 'PONG') {
        throw new Error('Invalid Redis response');
      }
      
      // Get Redis info
      const info = await this.config.redis.client.info();
      const memory = this.parseRedisInfo(info);
      
      return {
        status: 'healthy',
        latency: Date.now() - startTime,
        details: { memory }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        message: error.message
      };
    }
  }

  private async checkDisk(): Promise<ComponentHealth> {
    try {
      const stats = await fs.stat(this.config.disk.path);
      
      // This is a simplified check - in production you'd use df or similar
      const threshold = this.config.disk.thresholdPercentage || 90;
      
      return {
        status: 'healthy',
        details: {
          path: this.config.disk.path,
          threshold: `${threshold}%`
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Failed to check disk: ${error.message}`
      };
    }
  }

  private async checkMemory(): Promise<ComponentHealth> {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const usagePercentage = (usedMemory / totalMemory) * 100;
    const threshold = this.config.memory.thresholdPercentage || 90;
    
    const status = usagePercentage > threshold ? 'degraded' : 'healthy';
    
    return {
      status,
      details: {
        total: this.formatBytes(totalMemory),
        used: this.formatBytes(usedMemory),
        free: this.formatBytes(freeMemory),
        percentage: usagePercentage.toFixed(2) + '%',
        threshold: threshold + '%'
      }
    };
  }

  private async checkExternalServices(): Promise<Record<string, ComponentHealth>> {
    if (!this.config.externalServices || this.config.externalServices.length === 0) {
      return {};
    }
    
    const results: Record<string, ComponentHealth> = {};
    
    await Promise.all(
      this.config.externalServices.map(async service => {
        const startTime = Date.now();
        const timeout = service.timeout || 5000;
        
        try {
          await Promise.race([
            axios.get(service.url, { timeout }),
            this.createTimeout(timeout, `${service.name} timeout`)
          ]);
          
          results[service.name] = {
            status: 'healthy',
            latency: Date.now() - startTime
          };
        } catch (error: any) {
          results[service.name] = {
            status: service.required ? 'unhealthy' : 'degraded',
            latency: Date.now() - startTime,
            message: error.message
          };
        }
      })
    );
    
    return results;
  }

  private determineOverallStatus(checks: any): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = [
      checks.database.status,
      checks.redis.status,
      checks.disk.status,
      checks.memory.status,
      ...Object.values(checks.externalServices).map((s: any) => s.status)
    ];
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private createTimeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const memory: any = {};
    
    lines.forEach(line => {
      if (line.startsWith('used_memory_human:')) {
        memory.used = line.split(':')[1];
      }
      if (line.startsWith('maxmemory_human:')) {
        memory.max = line.split(':')[1];
      }
    });
    
    return memory;
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Utility function to create health check service
export function createHealthCheckService(
  sequelize: Sequelize,
  redis: Redis,
  options?: Partial<HealthCheckConfig>
): HealthCheckService {
  const config: HealthCheckConfig = {
    database: {
      sequelize,
      timeout: 5000,
      ...options?.database
    },
    redis: {
      client: redis,
      timeout: 5000,
      ...options?.redis
    },
    disk: {
      path: process.cwd(),
      thresholdPercentage: 90,
      ...options?.disk
    },
    memory: {
      thresholdPercentage: 90,
      ...options?.memory
    },
    externalServices: options?.externalServices,
    version: options?.version
  };
  
  return new HealthCheckService(config);
}