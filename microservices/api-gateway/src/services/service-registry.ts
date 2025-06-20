import axios from 'axios';
import { config, ServiceConfig } from '../config';
import logger from '../utils/logger';

export interface ServiceHealth {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime?: number;
}

export class ServiceRegistry {
  private services: Map<string, ServiceConfig>;
  private healthStatus: Map<string, ServiceHealth>;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.services = new Map();
    this.healthStatus = new Map();
    this.initializeServices();
  }

  private initializeServices(): void {
    config.services.forEach(service => {
      this.services.set(service.name, service);
      this.healthStatus.set(service.name, {
        name: service.name,
        url: service.url,
        status: 'unknown',
        lastCheck: new Date()
      });
    });
  }

  public getService(name: string): ServiceConfig | undefined {
    return this.services.get(name);
  }

  public getAllServices(): ServiceConfig[] {
    return Array.from(this.services.values());
  }

  public getHealthStatus(): ServiceHealth[] {
    return Array.from(this.healthStatus.values());
  }

  public async checkServiceHealth(service: ServiceConfig): Promise<ServiceHealth> {
    const startTime = Date.now();
    const healthCheckUrl = `${service.url}${service.healthCheckPath}`;
    
    try {
      const response = await axios.get(healthCheckUrl, {
        timeout: service.timeout || 5000
      });
      
      const responseTime = Date.now() - startTime;
      const health: ServiceHealth = {
        name: service.name,
        url: service.url,
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        responseTime
      };
      
      this.healthStatus.set(service.name, health);
      logger.debug(`Health check for ${service.name}: ${health.status} (${responseTime}ms)`);
      
      return health;
    } catch (error) {
      const health: ServiceHealth = {
        name: service.name,
        url: service.url,
        status: 'unhealthy',
        lastCheck: new Date()
      };
      
      this.healthStatus.set(service.name, health);
      logger.error(`Health check failed for ${service.name}:`, error);
      
      return health;
    }
  }

  public async checkAllServices(): Promise<ServiceHealth[]> {
    const healthChecks = Array.from(this.services.values()).map(service => 
      this.checkServiceHealth(service)
    );
    
    return Promise.all(healthChecks);
  }

  public startHealthChecks(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Initial health check
    this.checkAllServices();

    // Set up periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.checkAllServices();
    }, intervalMs);

    logger.info(`Started health checks with interval: ${intervalMs}ms`);
  }

  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Stopped health checks');
    }
  }

  public isServiceHealthy(serviceName: string): boolean {
    const health = this.healthStatus.get(serviceName);
    return health?.status === 'healthy';
  }

  public getServiceUrl(serviceName: string): string | undefined {
    return this.services.get(serviceName)?.url;
  }
}

export default new ServiceRegistry();