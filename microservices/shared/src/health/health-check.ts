// Health check system for monitoring service health

import { EventEmitter } from 'events';
import axios from 'axios';
import { Logger } from '../logger';

// Health status
export enum HealthStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  DEGRADED = 'DEGRADED',
  UNKNOWN = 'UNKNOWN',
}

// Health check result
export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message?: string;
  duration?: number;
  details?: Record<string, any>;
  timestamp: Date;
}

// Health report
export interface HealthReport {
  status: HealthStatus;
  service: string;
  version: string;
  uptime: number;
  timestamp: Date;
  checks: HealthCheckResult[];
  dependencies?: HealthReport[];
}

// Health check function
export type HealthCheckFunction = () => Promise<HealthCheckResult>;

// Health check configuration
export interface HealthCheckConfig {
  name: string;
  check: HealthCheckFunction;
  critical?: boolean;
  timeout?: number;
  interval?: number;
  retries?: number;
}

// Health monitor configuration
export interface HealthMonitorConfig {
  serviceName: string;
  serviceVersion: string;
  checkInterval?: number;
  timeout?: number;
  logger?: Logger;
}

// Health events
export enum HealthEvent {
  CHECK_STARTED = 'health:check:started',
  CHECK_COMPLETED = 'health:check:completed',
  CHECK_FAILED = 'health:check:failed',
  STATUS_CHANGED = 'health:status:changed',
  DEGRADED = 'health:degraded',
  RECOVERED = 'health:recovered',
}

// Built-in health checks
export class HealthChecks {
  // Database health check
  static database(name: string, checkFn: () => Promise<boolean>): HealthCheckConfig {
    return {
      name: `${name}_database`,
      critical: true,
      check: async () => {
        const start = Date.now();
        
        try {
          const isHealthy = await checkFn();
          
          return {
            name: `${name}_database`,
            status: isHealthy ? HealthStatus.UP : HealthStatus.DOWN,
            duration: Date.now() - start,
            timestamp: new Date(),
          };
        } catch (error) {
          return {
            name: `${name}_database`,
            status: HealthStatus.DOWN,
            message: (error as Error).message,
            duration: Date.now() - start,
            timestamp: new Date(),
          };
        }
      },
    };
  }

  // Redis health check
  static redis(name: string, checkFn: () => Promise<boolean>): HealthCheckConfig {
    return {
      name: `${name}_redis`,
      critical: false,
      check: async () => {
        const start = Date.now();
        
        try {
          const isHealthy = await checkFn();
          
          return {
            name: `${name}_redis`,
            status: isHealthy ? HealthStatus.UP : HealthStatus.DOWN,
            duration: Date.now() - start,
            timestamp: new Date(),
          };
        } catch (error) {
          return {
            name: `${name}_redis`,
            status: HealthStatus.DOWN,
            message: (error as Error).message,
            duration: Date.now() - start,
            timestamp: new Date(),
          };
        }
      },
    };
  }

  // RabbitMQ health check
  static rabbitmq(name: string, checkFn: () => boolean): HealthCheckConfig {
    return {
      name: `${name}_rabbitmq`,
      critical: true,
      check: async () => {
        const isHealthy = checkFn();
        
        return {
          name: `${name}_rabbitmq`,
          status: isHealthy ? HealthStatus.UP : HealthStatus.DOWN,
          timestamp: new Date(),
        };
      },
    };
  }

  // HTTP service health check
  static httpService(name: string, url: string, timeout: number = 5000): HealthCheckConfig {
    return {
      name: `${name}_service`,
      critical: false,
      timeout,
      check: async () => {
        const start = Date.now();
        
        try {
          const response = await axios.get(`${url}/health`, { timeout });
          
          return {
            name: `${name}_service`,
            status: response.status === 200 ? HealthStatus.UP : HealthStatus.DOWN,
            duration: Date.now() - start,
            details: {
              statusCode: response.status,
              url,
            },
            timestamp: new Date(),
          };
        } catch (error) {
          return {
            name: `${name}_service`,
            status: HealthStatus.DOWN,
            message: (error as Error).message,
            duration: Date.now() - start,
            details: { url },
            timestamp: new Date(),
          };
        }
      },
    };
  }

  // Memory health check
  static memory(threshold: number = 0.9): HealthCheckConfig {
    return {
      name: 'memory',
      critical: false,
      check: async () => {
        const usage = process.memoryUsage();
        const heapUsedRatio = usage.heapUsed / usage.heapTotal;
        
        return {
          name: 'memory',
          status: heapUsedRatio < threshold ? HealthStatus.UP : HealthStatus.DEGRADED,
          details: {
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            rss: usage.rss,
            external: usage.external,
            heapUsedRatio,
            threshold,
          },
          timestamp: new Date(),
        };
      },
    };
  }

  // Disk space health check
  static diskSpace(path: string = '/', threshold: number = 0.1): HealthCheckConfig {
    return {
      name: 'disk_space',
      critical: false,
      check: async () => {
        const checkDiskSpace = require('check-disk-space').default;
        
        try {
          const diskSpace = await checkDiskSpace(path);
          const freeRatio = diskSpace.free / diskSpace.size;
          
          return {
            name: 'disk_space',
            status: freeRatio > threshold ? HealthStatus.UP : HealthStatus.DEGRADED,
            details: {
              path,
              size: diskSpace.size,
              free: diskSpace.free,
              used: diskSpace.size - diskSpace.free,
              freeRatio,
              threshold,
            },
            timestamp: new Date(),
          };
        } catch (error) {
          return {
            name: 'disk_space',
            status: HealthStatus.UNKNOWN,
            message: (error as Error).message,
            timestamp: new Date(),
          };
        }
      },
    };
  }
}

// Health monitor
export class HealthMonitor extends EventEmitter {
  private config: HealthMonitorConfig;
  private logger?: Logger;
  private checks: Map<string, HealthCheckConfig> = new Map();
  private checkResults: Map<string, HealthCheckResult> = new Map();
  private checkTimers: Map<string, NodeJS.Timer> = new Map();
  private startTime: Date;
  private currentStatus: HealthStatus = HealthStatus.UP;

  constructor(config: HealthMonitorConfig) {
    super();
    
    this.config = {
      checkInterval: 30000, // 30 seconds
      timeout: 10000, // 10 seconds
      ...config,
    };
    
    this.logger = config.logger;
    this.startTime = new Date();
  }

  // Register health check
  register(check: HealthCheckConfig): void {
    this.checks.set(check.name, {
      timeout: this.config.timeout,
      interval: this.config.checkInterval,
      retries: 3,
      ...check,
    });

    this.logger?.info('Health check registered', { name: check.name });

    // Start checking
    this.startCheck(check.name);
  }

  // Unregister health check
  unregister(name: string): void {
    this.checks.delete(name);
    this.checkResults.delete(name);
    
    const timer = this.checkTimers.get(name);
    if (timer) {
      clearInterval(timer);
      this.checkTimers.delete(name);
    }

    this.logger?.info('Health check unregistered', { name });
  }

  // Get health report
  async getReport(): Promise<HealthReport> {
    // Run all checks
    await this.runAllChecks();

    const checks = Array.from(this.checkResults.values());
    const status = this.calculateOverallStatus(checks);

    return {
      status,
      service: this.config.serviceName,
      version: this.config.serviceVersion,
      uptime: Date.now() - this.startTime.getTime(),
      timestamp: new Date(),
      checks,
    };
  }

  // Get liveness status (is service alive?)
  getLiveness(): { status: HealthStatus; timestamp: Date } {
    return {
      status: this.currentStatus === HealthStatus.DOWN ? HealthStatus.DOWN : HealthStatus.UP,
      timestamp: new Date(),
    };
  }

  // Get readiness status (is service ready to accept traffic?)
  getReadiness(): { status: HealthStatus; timestamp: Date; checks: string[] } {
    const criticalChecks = Array.from(this.checks.entries())
      .filter(([_, config]) => config.critical)
      .map(([name, _]) => name);

    const failedCritical = criticalChecks.filter(name => {
      const result = this.checkResults.get(name);
      return !result || result.status !== HealthStatus.UP;
    });

    return {
      status: failedCritical.length > 0 ? HealthStatus.DOWN : HealthStatus.UP,
      timestamp: new Date(),
      checks: failedCritical,
    };
  }

  // Start health check
  private startCheck(name: string): void {
    const config = this.checks.get(name);
    if (!config) return;

    // Run initial check
    this.runCheck(name);

    // Schedule periodic checks
    const timer = setInterval(() => this.runCheck(name), config.interval!);
    this.checkTimers.set(name, timer);
  }

  // Run single health check
  private async runCheck(name: string): Promise<void> {
    const config = this.checks.get(name);
    if (!config) return;

    this.emit(HealthEvent.CHECK_STARTED, name);

    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt < config.retries!) {
      try {
        const result = await Promise.race([
          config.check(),
          new Promise<HealthCheckResult>((_, reject) => {
            setTimeout(() => reject(new Error('Health check timeout')), config.timeout);
          }),
        ]);

        this.checkResults.set(name, result);
        this.emit(HealthEvent.CHECK_COMPLETED, result);
        
        this.updateOverallStatus();
        return;
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        if (attempt < config.retries!) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // All retries failed
    const result: HealthCheckResult = {
      name,
      status: HealthStatus.DOWN,
      message: lastError?.message || 'Health check failed',
      timestamp: new Date(),
    };

    this.checkResults.set(name, result);
    this.emit(HealthEvent.CHECK_FAILED, result);
    
    this.updateOverallStatus();
  }

  // Run all health checks
  private async runAllChecks(): Promise<void> {
    const promises = Array.from(this.checks.keys()).map(name => this.runCheck(name));
    await Promise.allSettled(promises);
  }

  // Calculate overall status
  private calculateOverallStatus(checks: HealthCheckResult[]): HealthStatus {
    if (checks.length === 0) {
      return HealthStatus.UP;
    }

    const criticalChecks = Array.from(this.checks.entries())
      .filter(([_, config]) => config.critical)
      .map(([name, _]) => name);

    // Check critical services
    for (const check of checks) {
      if (criticalChecks.includes(check.name) && check.status === HealthStatus.DOWN) {
        return HealthStatus.DOWN;
      }
    }

    // Check for degraded state
    const downCount = checks.filter(c => c.status === HealthStatus.DOWN).length;
    const degradedCount = checks.filter(c => c.status === HealthStatus.DEGRADED).length;

    if (downCount > 0 || degradedCount > 0) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.UP;
  }

  // Update overall status
  private updateOverallStatus(): void {
    const checks = Array.from(this.checkResults.values());
    const newStatus = this.calculateOverallStatus(checks);

    if (newStatus !== this.currentStatus) {
      const oldStatus = this.currentStatus;
      this.currentStatus = newStatus;

      this.emit(HealthEvent.STATUS_CHANGED, { old: oldStatus, new: newStatus });

      if (newStatus === HealthStatus.DEGRADED) {
        this.emit(HealthEvent.DEGRADED);
      } else if (oldStatus === HealthStatus.DEGRADED && newStatus === HealthStatus.UP) {
        this.emit(HealthEvent.RECOVERED);
      }
    }
  }

  // Stop all health checks
  stop(): void {
    for (const timer of this.checkTimers.values()) {
      clearInterval(timer);
    }
    
    this.checkTimers.clear();
    this.removeAllListeners();
  }
}

// Express health check routes
export const createHealthRoutes = (monitor: HealthMonitor) => {
  const router = require('express').Router();

  // Full health report
  router.get('/health', async (req: any, res: any) => {
    try {
      const report = await monitor.getReport();
      const statusCode = report.status === HealthStatus.UP ? 200 : 503;
      
      res.status(statusCode).json(report);
    } catch (error) {
      res.status(500).json({
        status: HealthStatus.DOWN,
        error: (error as Error).message,
      });
    }
  });

  // Liveness probe
  router.get('/health/live', (req: any, res: any) => {
    const liveness = monitor.getLiveness();
    const statusCode = liveness.status === HealthStatus.UP ? 200 : 503;
    
    res.status(statusCode).json(liveness);
  });

  // Readiness probe
  router.get('/health/ready', (req: any, res: any) => {
    const readiness = monitor.getReadiness();
    const statusCode = readiness.status === HealthStatus.UP ? 200 : 503;
    
    res.status(statusCode).json(readiness);
  });

  return router;
};

// Create health monitor
export const createHealthMonitor = (config: HealthMonitorConfig): HealthMonitor => {
  return new HealthMonitor(config);
};