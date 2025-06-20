// HTTP client for service-to-service communication with circuit breaker and retry policies

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../logger';
import { ServiceDiscoveryClient } from '../service-discovery/service-registry';

// Circuit breaker states
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  resetTimeout?: number;
}

// Retry policy configuration
export interface RetryPolicyConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  retryableErrors?: number[];
}

// Service client configuration
export interface ServiceClientConfig {
  serviceName: string;
  version?: string;
  discovery?: ServiceDiscoveryClient;
  baseURL?: string;
  timeout?: number;
  circuitBreaker?: CircuitBreakerConfig;
  retryPolicy?: RetryPolicyConfig;
  headers?: Record<string, string>;
  logger?: Logger;
}

// Request options
export interface RequestOptions extends AxiosRequestConfig {
  correlationId?: string;
  skipRetry?: boolean;
  skipCircuitBreaker?: boolean;
}

// Circuit breaker events
export enum CircuitBreakerEvent {
  STATE_CHANGED = 'circuit:state_changed',
  REQUEST_SUCCESS = 'circuit:request_success',
  REQUEST_FAILURE = 'circuit:request_failure',
  REQUEST_TIMEOUT = 'circuit:request_timeout',
  REQUEST_REJECTED = 'circuit:request_rejected',
}

// Circuit breaker implementation
class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private config: Required<CircuitBreakerConfig>;
  private resetTimer?: NodeJS.Timer;

  constructor(config: CircuitBreakerConfig = {}) {
    super();
    
    this.config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 10000,
      resetTimeout: 60000,
      ...config,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (!this.shouldAttemptReset()) {
        const error = new Error('Circuit breaker is OPEN');
        this.emit(CircuitBreakerEvent.REQUEST_REJECTED);
        throw error;
      }
      
      this.state = CircuitState.HALF_OPEN;
      this.emit(CircuitBreakerEvent.STATE_CHANGED, CircuitState.HALF_OPEN);
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          const error = new Error('Request timeout');
          this.emit(CircuitBreakerEvent.REQUEST_TIMEOUT);
          reject(error);
        }, this.config.timeout);
      }),
    ]);
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        this.emit(CircuitBreakerEvent.STATE_CHANGED, CircuitState.CLOSED);
      }
    }
    
    this.emit(CircuitBreakerEvent.REQUEST_SUCCESS);
  }

  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.successCount = 0;
      this.emit(CircuitBreakerEvent.STATE_CHANGED, CircuitState.OPEN);
      this.startResetTimer();
    } else if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.emit(CircuitBreakerEvent.STATE_CHANGED, CircuitState.OPEN);
      this.startResetTimer();
    }
    
    this.emit(CircuitBreakerEvent.REQUEST_FAILURE, error);
  }

  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime !== undefined &&
      Date.now() - this.lastFailureTime.getTime() >= this.config.resetTimeout
    );
  }

  private startResetTimer(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    
    this.resetTimer = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        this.state = CircuitState.HALF_OPEN;
        this.emit(CircuitBreakerEvent.STATE_CHANGED, CircuitState.HALF_OPEN);
      }
    }, this.config.resetTimeout);
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
    
    this.emit(CircuitBreakerEvent.STATE_CHANGED, CircuitState.CLOSED);
  }
}

// Service HTTP client
export class ServiceClient {
  private config: ServiceClientConfig;
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private logger?: Logger;
  private discovery?: ServiceDiscoveryClient;

  constructor(config: ServiceClientConfig) {
    this.config = config;
    this.logger = config.logger;
    this.discovery = config.discovery;

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);

    // Initialize axios client
    this.client = axios.create({
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    // Add request interceptor
    this.client.interceptors.request.use(
      (config) => this.requestInterceptor(config),
      (error) => Promise.reject(error)
    );

    // Add response interceptor
    this.client.interceptors.response.use(
      (response) => this.responseInterceptor(response),
      (error) => this.errorInterceptor(error)
    );
  }

  // GET request
  async get<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>({ ...options, method: 'GET', url: path });
  }

  // POST request
  async post<T = any>(path: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>({ ...options, method: 'POST', url: path, data });
  }

  // PUT request
  async put<T = any>(path: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>({ ...options, method: 'PUT', url: path, data });
  }

  // PATCH request
  async patch<T = any>(path: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>({ ...options, method: 'PATCH', url: path, data });
  }

  // DELETE request
  async delete<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>({ ...options, method: 'DELETE', url: path });
  }

  // Generic request
  private async request<T = any>(options: RequestOptions): Promise<T> {
    const correlationId = options.correlationId || uuidv4();
    
    // Get service URL
    const baseURL = await this.getBaseURL();
    if (!baseURL) {
      throw new Error(`Service ${this.config.serviceName} not found`);
    }

    // Prepare request config
    const requestConfig: AxiosRequestConfig = {
      ...options,
      baseURL,
      headers: {
        ...options.headers,
        'X-Correlation-ID': correlationId,
      },
    };

    // Execute request with circuit breaker
    if (options.skipCircuitBreaker) {
      return this.executeRequest<T>(requestConfig, options);
    }

    return this.circuitBreaker.execute(() => 
      this.executeRequest<T>(requestConfig, options)
    );
  }

  // Execute request with retry policy
  private async executeRequest<T>(config: AxiosRequestConfig, options: RequestOptions): Promise<T> {
    const retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      factor: 2,
      retryableErrors: [408, 429, 500, 502, 503, 504],
      ...this.config.retryPolicy,
    };

    let lastError: Error | undefined;
    let delay = retryConfig.initialDelay;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.client.request<T>(config);
        return response.data;
      } catch (error) {
        lastError = error as Error;
        
        if (options.skipRetry || attempt === retryConfig.maxRetries) {
          throw error;
        }

        const axiosError = error as AxiosError;
        
        // Check if error is retryable
        if (!this.isRetryableError(axiosError, retryConfig.retryableErrors)) {
          throw error;
        }

        this.logger?.warn('Request failed, retrying', {
          service: this.config.serviceName,
          attempt: attempt + 1,
          maxRetries: retryConfig.maxRetries,
          delay,
          error: axiosError.message,
        });

        // Wait before retry
        await this.sleep(delay);
        
        // Calculate next delay
        delay = Math.min(delay * retryConfig.factor, retryConfig.maxDelay);
      }
    }

    throw lastError;
  }

  // Get base URL from service discovery or config
  private async getBaseURL(): Promise<string | null> {
    if (this.config.baseURL) {
      return this.config.baseURL;
    }

    if (this.discovery) {
      return this.discovery.getServiceUrl(this.config.serviceName, this.config.version);
    }

    return null;
  }

  // Request interceptor
  private requestInterceptor(config: AxiosRequestConfig): AxiosRequestConfig {
    const startTime = Date.now();
    
    // Add request metadata
    config.metadata = { startTime };

    this.logger?.debug('Outgoing request', {
      service: this.config.serviceName,
      method: config.method,
      url: config.url,
      correlationId: config.headers?.['X-Correlation-ID'],
    });

    return config;
  }

  // Response interceptor
  private responseInterceptor(response: AxiosResponse): AxiosResponse {
    const duration = Date.now() - (response.config.metadata?.startTime || 0);

    this.logger?.debug('Request completed', {
      service: this.config.serviceName,
      method: response.config.method,
      url: response.config.url,
      status: response.status,
      duration,
      correlationId: response.config.headers?.['X-Correlation-ID'],
    });

    return response;
  }

  // Error interceptor
  private errorInterceptor(error: AxiosError): Promise<never> {
    const duration = Date.now() - (error.config?.metadata?.startTime || 0);

    this.logger?.error('Request failed', error, {
      service: this.config.serviceName,
      method: error.config?.method,
      url: error.config?.url,
      status: error.response?.status,
      duration,
      correlationId: error.config?.headers?.['X-Correlation-ID'],
    });

    return Promise.reject(error);
  }

  // Check if error is retryable
  private isRetryableError(error: AxiosError, retryableErrors: number[]): boolean {
    if (!error.response) {
      // Network errors are retryable
      return true;
    }

    return retryableErrors.includes(error.response.status);
  }

  // Sleep helper
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get circuit breaker state
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  // Reset circuit breaker
  resetCircuit(): void {
    this.circuitBreaker.reset();
  }

  // Listen to circuit breaker events
  onCircuitEvent(event: CircuitBreakerEvent, listener: (...args: any[]) => void): void {
    this.circuitBreaker.on(event, listener);
  }
}

// Factory function for creating service clients
export const createServiceClient = (config: ServiceClientConfig): ServiceClient => {
  return new ServiceClient(config);
};