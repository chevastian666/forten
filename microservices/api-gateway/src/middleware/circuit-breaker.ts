import { Request, Response, NextFunction } from 'express';
import CircuitBreaker from 'opossum';
import axios, { AxiosRequestConfig } from 'axios';
import { config } from '../config';
import logger from '../utils/logger';

interface CircuitBreakerRequest {
  method: string;
  url: string;
  headers?: any;
  data?: any;
  params?: any;
}

const circuitBreakerOptions = {
  timeout: config.circuitBreaker.timeout,
  errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
  resetTimeout: config.circuitBreaker.resetTimeout
};

// Store circuit breakers for each service
const breakers = new Map<string, CircuitBreaker>();

// Function to make HTTP requests
async function makeRequest(options: CircuitBreakerRequest): Promise<any> {
  const axiosConfig: AxiosRequestConfig = {
    method: options.method as any,
    url: options.url,
    headers: options.headers,
    data: options.data,
    params: options.params,
    timeout: config.circuitBreaker.timeout
  };

  const response = await axios(axiosConfig);
  return response;
}

// Get or create circuit breaker for a service
export function getCircuitBreaker(serviceName: string): CircuitBreaker {
  if (!breakers.has(serviceName)) {
    const breaker = new CircuitBreaker(makeRequest, circuitBreakerOptions);
    
    // Event listeners
    breaker.on('open', () => {
      logger.warn(`Circuit breaker opened for service: ${serviceName}`);
    });
    
    breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-open for service: ${serviceName}`);
    });
    
    breaker.on('close', () => {
      logger.info(`Circuit breaker closed for service: ${serviceName}`);
    });
    
    breaker.on('failure', (error) => {
      logger.error(`Circuit breaker failure for service ${serviceName}:`, error);
    });
    
    breakers.set(serviceName, breaker);
  }
  
  return breakers.get(serviceName)!;
}

// Middleware to wrap requests with circuit breaker
export function circuitBreakerMiddleware(serviceName: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const breaker = getCircuitBreaker(serviceName);
    
    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalStatus = res.status;
    
    // Track if response has been sent
    let responseSent = false;
    
    // Override response methods to track if response is sent
    res.send = function(...args: any[]): Response {
      responseSent = true;
      return originalSend.apply(res, args);
    };
    
    res.json = function(...args: any[]): Response {
      responseSent = true;
      return originalJson.apply(res, args);
    };
    
    res.status = function(code: number): Response {
      if (code >= 200 && code < 300) {
        responseSent = true;
      }
      return originalStatus.call(res, code);
    };
    
    // Check circuit breaker state
    if (breaker.opened) {
      logger.warn(`Circuit breaker is open for ${serviceName}`);
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: serviceName,
        retryAfter: Math.ceil(config.circuitBreaker.resetTimeout / 1000)
      });
      return;
    }
    
    // Continue with the request
    next();
  };
}

// Get circuit breaker stats
export function getCircuitBreakerStats(): any {
  const stats: any = {};
  
  breakers.forEach((breaker, serviceName) => {
    stats[serviceName] = {
      state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
      stats: breaker.stats
    };
  });
  
  return stats;
}