// Service registry client for service discovery and health checks

import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import { Logger } from '../logger';

// Service instance information
export interface ServiceInstance {
  id: string;
  name: string;
  version: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  metadata?: Record<string, any>;
  healthCheckUrl?: string;
  status: 'UP' | 'DOWN' | 'STARTING' | 'STOPPING';
  lastHeartbeat: Date;
}

// Service registration configuration
export interface ServiceRegistrationConfig {
  name: string;
  version: string;
  host?: string;
  port: number;
  protocol?: 'http' | 'https';
  healthCheckUrl?: string;
  healthCheckInterval?: number;
  metadata?: Record<string, any>;
}

// Service discovery client configuration
export interface ServiceDiscoveryConfig {
  registryUrl: string;
  heartbeatInterval?: number;
  refreshInterval?: number;
  timeout?: number;
  logger?: Logger;
}

// Service registry events
export enum ServiceRegistryEvent {
  SERVICE_REGISTERED = 'service:registered',
  SERVICE_DEREGISTERED = 'service:deregistered',
  SERVICE_UPDATED = 'service:updated',
  SERVICE_HEALTHY = 'service:healthy',
  SERVICE_UNHEALTHY = 'service:unhealthy',
  REGISTRY_CONNECTED = 'registry:connected',
  REGISTRY_DISCONNECTED = 'registry:disconnected',
}

// Service discovery client
export class ServiceDiscoveryClient extends EventEmitter {
  private config: ServiceDiscoveryConfig;
  private client: AxiosInstance;
  private logger?: Logger;
  private serviceInstance?: ServiceInstance;
  private heartbeatTimer?: NodeJS.Timer;
  private refreshTimer?: NodeJS.Timer;
  private serviceCache: Map<string, ServiceInstance[]> = new Map();
  private isConnected = false;

  constructor(config: ServiceDiscoveryConfig) {
    super();
    
    this.config = {
      heartbeatInterval: 30000, // 30 seconds
      refreshInterval: 60000, // 60 seconds
      timeout: 5000, // 5 seconds
      ...config,
    };
    
    this.logger = config.logger;
    
    this.client = axios.create({
      baseURL: config.registryUrl,
      timeout: this.config.timeout,
    });
  }

  // Register a service
  async register(config: ServiceRegistrationConfig): Promise<void> {
    try {
      const host = config.host || this.getDefaultHost();
      
      this.serviceInstance = {
        id: `${config.name}-${host}-${config.port}`,
        name: config.name,
        version: config.version,
        host,
        port: config.port,
        protocol: config.protocol || 'http',
        metadata: config.metadata,
        healthCheckUrl: config.healthCheckUrl || `${config.protocol || 'http'}://${host}:${config.port}/health`,
        status: 'STARTING',
        lastHeartbeat: new Date(),
      };

      // Register with the registry
      await this.client.post('/services/register', this.serviceInstance);
      
      this.serviceInstance.status = 'UP';
      this.isConnected = true;
      
      this.logger?.info('Service registered', {
        service: this.serviceInstance.name,
        id: this.serviceInstance.id,
      });

      this.emit(ServiceRegistryEvent.SERVICE_REGISTERED, this.serviceInstance);
      this.emit(ServiceRegistryEvent.REGISTRY_CONNECTED);

      // Start heartbeat
      this.startHeartbeat();
      
      // Start service cache refresh
      this.startCacheRefresh();
    } catch (error) {
      this.logger?.error('Failed to register service', error as Error);
      throw error;
    }
  }

  // Deregister a service
  async deregister(): Promise<void> {
    if (!this.serviceInstance) {
      return;
    }

    try {
      this.stopHeartbeat();
      this.stopCacheRefresh();

      await this.client.post('/services/deregister', {
        id: this.serviceInstance.id,
      });

      this.logger?.info('Service deregistered', {
        service: this.serviceInstance.name,
        id: this.serviceInstance.id,
      });

      this.emit(ServiceRegistryEvent.SERVICE_DEREGISTERED, this.serviceInstance);
      
      this.serviceInstance = undefined;
      this.isConnected = false;
    } catch (error) {
      this.logger?.error('Failed to deregister service', error as Error);
    }
  }

  // Discover services
  async discover(serviceName: string, version?: string): Promise<ServiceInstance[]> {
    try {
      // Check cache first
      const cached = this.serviceCache.get(serviceName);
      if (cached && cached.length > 0) {
        const instances = version 
          ? cached.filter(instance => instance.version === version)
          : cached;
        
        if (instances.length > 0) {
          return instances.filter(instance => instance.status === 'UP');
        }
      }

      // Fetch from registry
      const response = await this.client.get('/services/discover', {
        params: { name: serviceName, version },
      });

      const instances = response.data as ServiceInstance[];
      
      // Update cache
      this.serviceCache.set(serviceName, instances);

      return instances.filter(instance => instance.status === 'UP');
    } catch (error) {
      this.logger?.error('Failed to discover services', error as Error, {
        serviceName,
        version,
      });
      
      // Return cached instances if available
      const cached = this.serviceCache.get(serviceName);
      return cached ? cached.filter(instance => instance.status === 'UP') : [];
    }
  }

  // Get a single service instance (with load balancing)
  async getServiceInstance(serviceName: string, version?: string): Promise<ServiceInstance | null> {
    const instances = await this.discover(serviceName, version);
    
    if (instances.length === 0) {
      return null;
    }

    // Simple round-robin load balancing
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }

  // Get service URL
  async getServiceUrl(serviceName: string, version?: string): Promise<string | null> {
    const instance = await this.getServiceInstance(serviceName, version);
    
    if (!instance) {
      return null;
    }

    return `${instance.protocol}://${instance.host}:${instance.port}`;
  }

  // Update service metadata
  async updateMetadata(metadata: Record<string, any>): Promise<void> {
    if (!this.serviceInstance) {
      throw new Error('Service not registered');
    }

    try {
      this.serviceInstance.metadata = {
        ...this.serviceInstance.metadata,
        ...metadata,
      };

      await this.client.put(`/services/${this.serviceInstance.id}`, {
        metadata: this.serviceInstance.metadata,
      });

      this.emit(ServiceRegistryEvent.SERVICE_UPDATED, this.serviceInstance);
    } catch (error) {
      this.logger?.error('Failed to update service metadata', error as Error);
      throw error;
    }
  }

  // Start heartbeat
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(async () => {
      if (!this.serviceInstance) {
        return;
      }

      try {
        await this.client.post(`/services/${this.serviceInstance.id}/heartbeat`, {
          status: this.serviceInstance.status,
          timestamp: new Date(),
        });

        this.serviceInstance.lastHeartbeat = new Date();
      } catch (error) {
        this.logger?.error('Heartbeat failed', error as Error);
        this.handleDisconnection();
      }
    }, this.config.heartbeatInterval);
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  // Start cache refresh
  private startCacheRefresh(): void {
    if (this.refreshTimer) {
      return;
    }

    this.refreshTimer = setInterval(async () => {
      try {
        const response = await this.client.get('/services');
        const allServices = response.data as ServiceInstance[];

        // Group by service name
        const serviceMap = new Map<string, ServiceInstance[]>();
        
        for (const instance of allServices) {
          const instances = serviceMap.get(instance.name) || [];
          instances.push(instance);
          serviceMap.set(instance.name, instances);
        }

        this.serviceCache = serviceMap;
      } catch (error) {
        this.logger?.error('Failed to refresh service cache', error as Error);
      }
    }, this.config.refreshInterval);

    // Initial refresh
    this.refreshTimer.refresh();
  }

  // Stop cache refresh
  private stopCacheRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  // Handle disconnection
  private handleDisconnection(): void {
    if (this.isConnected) {
      this.isConnected = false;
      this.emit(ServiceRegistryEvent.REGISTRY_DISCONNECTED);
      
      // Attempt reconnection
      setTimeout(async () => {
        if (this.serviceInstance) {
          try {
            await this.register({
              name: this.serviceInstance.name,
              version: this.serviceInstance.version,
              host: this.serviceInstance.host,
              port: this.serviceInstance.port,
              protocol: this.serviceInstance.protocol,
              metadata: this.serviceInstance.metadata,
              healthCheckUrl: this.serviceInstance.healthCheckUrl,
            });
          } catch (error) {
            this.logger?.error('Reconnection failed', error as Error);
            this.handleDisconnection();
          }
        }
      }, 5000);
    }
  }

  // Get default host
  private getDefaultHost(): string {
    if (process.env.KUBERNETES_SERVICE_HOST) {
      return process.env.HOSTNAME || 'localhost';
    }
    
    const os = require('os');
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    
    return 'localhost';
  }

  // Check if connected
  isRegistered(): boolean {
    return this.isConnected && this.serviceInstance !== undefined;
  }

  // Get current service instance
  getCurrentInstance(): ServiceInstance | undefined {
    return this.serviceInstance;
  }
}

// Singleton instance management
let defaultClient: ServiceDiscoveryClient | null = null;

export const createServiceDiscoveryClient = (config: ServiceDiscoveryConfig): ServiceDiscoveryClient => {
  const client = new ServiceDiscoveryClient(config);
  
  if (!defaultClient) {
    defaultClient = client;
  }
  
  return client;
};

export const getDefaultServiceDiscovery = (): ServiceDiscoveryClient => {
  if (!defaultClient) {
    throw new Error('Service discovery client not initialized. Call createServiceDiscoveryClient first.');
  }
  
  return defaultClient;
};