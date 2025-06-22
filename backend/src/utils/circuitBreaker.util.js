/**
 * Circuit Breaker Utility
 * Implements circuit breaker pattern for external integrations
 * Provides fault tolerance and fallback mechanisms
 */

const CircuitBreaker = require('opossum');
const { logger } = require('../config/logger');
const { EventEmitter } = require('events');

class CircuitBreakerManager extends EventEmitter {
  constructor() {
    super();
    this.breakers = new Map();
    this.metrics = new Map();
    this.fallbackStrategies = new Map();
    this.notificationService = null;
    
    // Default circuit breaker options
    this.defaultOptions = {
      timeout: 30000, // 30 seconds timeout
      errorThresholdPercentage: 50, // 50% error threshold
      resetTimeout: 60000, // 1 minute reset timeout
      rollingCountTimeout: 10000, // 10 seconds rolling window
      rollingCountBuckets: 10, // Number of buckets in rolling window
      name: 'default',
      group: 'external-integrations',
      volumeThreshold: 10, // Minimum requests before circuit can open
      enabled: true
    };

    // Integration-specific configurations
    this.integrationConfigs = {
      hikcentral: {
        name: 'HikCentral Integration',
        timeout: 15000, // Shorter timeout for HikCentral
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        volumeThreshold: 10,
        group: 'access-control',
        fallbackStrategy: 'offline-mode',
        priority: 'high'
      },
      whatsapp: {
        name: 'WhatsApp Integration',
        timeout: 10000,
        errorThresholdPercentage: 50,
        resetTimeout: 45000,
        volumeThreshold: 10,
        group: 'notifications',
        fallbackStrategy: 'queue-retry',
        priority: 'medium'
      },
      email: {
        name: 'Email Service',
        timeout: 20000,
        errorThresholdPercentage: 60,
        resetTimeout: 120000,
        volumeThreshold: 5,
        group: 'notifications',
        fallbackStrategy: 'queue-retry',
        priority: 'low'
      },
      backup: {
        name: 'Backup Service',
        timeout: 300000, // 5 minutes for backups
        errorThresholdPercentage: 30,
        resetTimeout: 600000, // 10 minutes
        volumeThreshold: 3,
        group: 'maintenance',
        fallbackStrategy: 'delay-retry',
        priority: 'low'
      }
    };
  }

  /**
   * Initialize circuit breaker manager
   */
  async initialize(notificationService = null) {
    try {
      this.notificationService = notificationService;
      
      // Initialize circuit breakers for each integration
      for (const [integration, config] of Object.entries(this.integrationConfigs)) {
        await this.createCircuitBreaker(integration, config);
      }

      // Setup monitoring
      this.setupMetricsCollection();
      this.setupEventHandlers();

      logger.info('Circuit breaker manager initialized', {
        totalBreakers: this.breakers.size,
        integrations: Object.keys(this.integrationConfigs)
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize circuit breaker manager', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create circuit breaker for specific integration
   */
  async createCircuitBreaker(integration, config) {
    const options = {
      ...this.defaultOptions,
      ...config,
      name: integration
    };

    // Create the circuit breaker
    const breaker = new CircuitBreaker(this.createExecutor(integration), options);

    // Setup event handlers
    this.setupBreakerEvents(breaker, integration, config);

    // Store breaker
    this.breakers.set(integration, breaker);
    
    // Initialize metrics
    this.metrics.set(integration, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      circuitOpened: 0,
      circuitClosed: 0,
      fallbackExecuted: 0,
      lastFailure: null,
      lastSuccess: null,
      uptime: 100,
      averageResponseTime: 0,
      lastMetricsReset: new Date()
    });

    logger.info('Circuit breaker created', {
      integration,
      config: options
    });

    return breaker;
  }

  /**
   * Create executor function for integration
   */
  createExecutor(integration) {
    return async (operation, ...args) => {
      const startTime = Date.now();
      
      try {
        let result;
        
        // Execute the actual operation based on integration type
        switch (integration) {
          case 'hikcentral':
            result = await this.executeHikCentralOperation(operation, ...args);
            break;
          case 'whatsapp':
            result = await this.executeWhatsAppOperation(operation, ...args);
            break;
          case 'email':
            result = await this.executeEmailOperation(operation, ...args);
            break;
          case 'backup':
            result = await this.executeBackupOperation(operation, ...args);
            break;
          default:
            throw new Error(`Unknown integration: ${integration}`);
        }

        // Update metrics
        this.updateMetrics(integration, 'success', Date.now() - startTime);
        
        return result;
        
      } catch (error) {
        this.updateMetrics(integration, 'failure', Date.now() - startTime, error);
        throw error;
      }
    };
  }

  /**
   * Execute HikCentral operations
   */
  async executeHikCentralOperation(operation, ...args) {
    // Placeholder for actual HikCentral API calls
    // This would contain the actual integration logic
    
    switch (operation) {
      case 'openDoor':
        return await this.simulateApiCall('HikCentral Door Open', 2000);
      case 'getDoorStatus':
        return await this.simulateApiCall('HikCentral Door Status', 1000);
      case 'getEvents':
        return await this.simulateApiCall('HikCentral Events', 3000);
      default:
        throw new Error(`Unknown HikCentral operation: ${operation}`);
    }
  }

  /**
   * Execute WhatsApp operations
   */
  async executeWhatsAppOperation(operation, ...args) {
    switch (operation) {
      case 'sendMessage':
        return await this.simulateApiCall('WhatsApp Send Message', 1500);
      case 'getMessageStatus':
        return await this.simulateApiCall('WhatsApp Message Status', 800);
      default:
        throw new Error(`Unknown WhatsApp operation: ${operation}`);
    }
  }

  /**
   * Execute Email operations
   */
  async executeEmailOperation(operation, ...args) {
    switch (operation) {
      case 'sendEmail':
        return await this.simulateApiCall('Email Send', 2500);
      case 'checkConnection':
        return await this.simulateApiCall('Email Connection Check', 1000);
      default:
        throw new Error(`Unknown email operation: ${operation}`);
    }
  }

  /**
   * Execute Backup operations
   */
  async executeBackupOperation(operation, ...args) {
    switch (operation) {
      case 'createBackup':
        return await this.simulateApiCall('Database Backup', 10000);
      case 'uploadBackup':
        return await this.simulateApiCall('Backup Upload', 15000);
      default:
        throw new Error(`Unknown backup operation: ${operation}`);
    }
  }

  /**
   * Simulate API call for testing
   */
  async simulateApiCall(operationName, baseDelay = 1000) {
    const delay = baseDelay + Math.random() * 500;
    
    // Simulate random failures for testing
    const shouldFail = Math.random() < 0.1; // 10% failure rate
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (shouldFail) {
      throw new Error(`Simulated failure for ${operationName}`);
    }
    
    return {
      success: true,
      operation: operationName,
      timestamp: new Date().toISOString(),
      duration: delay
    };
  }

  /**
   * Setup event handlers for circuit breaker
   */
  setupBreakerEvents(breaker, integration, config) {
    // Circuit opened (fault tolerance activated)
    breaker.on('open', () => {
      const message = `Circuit breaker opened for ${integration}`;
      logger.warn(message, { integration, config });
      
      this.updateMetrics(integration, 'circuit-opened');
      this.sendNotification('circuit-opened', integration, message, 'warning');
      this.activateFallback(integration, config.fallbackStrategy);
    });

    // Circuit closed (service recovered)
    breaker.on('close', () => {
      const message = `Circuit breaker closed for ${integration}`;
      logger.info(message, { integration });
      
      this.updateMetrics(integration, 'circuit-closed');
      this.sendNotification('circuit-closed', integration, message, 'info');
      this.deactivateFallback(integration);
    });

    // Circuit half-open (testing if service recovered)
    breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-open for ${integration}`, { integration });
    });

    // Fallback executed
    breaker.on('fallback', (result) => {
      logger.info(`Fallback executed for ${integration}`, { 
        integration, 
        result: result?.message || 'fallback-result' 
      });
      this.updateMetrics(integration, 'fallback');
    });

    // Request failed
    breaker.on('failure', (error) => {
      logger.error(`Circuit breaker failure for ${integration}`, {
        integration,
        error: error.message
      });
    });

    // Request succeeded
    breaker.on('success', (result) => {
      logger.debug(`Circuit breaker success for ${integration}`, {
        integration,
        duration: result?.duration
      });
    });

    // Timeout occurred
    breaker.on('timeout', () => {
      logger.warn(`Circuit breaker timeout for ${integration}`, { integration });
      this.updateMetrics(integration, 'timeout');
    });

    // Setup fallback function
    breaker.fallback((error) => {
      return this.executeFallback(integration, config.fallbackStrategy, error);
    });
  }

  /**
   * Execute fallback strategy
   */
  executeFallback(integration, strategy, error) {
    logger.info(`Executing fallback strategy for ${integration}`, {
      integration,
      strategy,
      error: error.message
    });

    switch (strategy) {
      case 'offline-mode':
        return this.offlineModeFallback(integration, error);
      case 'queue-retry':
        return this.queueRetryFallback(integration, error);
      case 'delay-retry':
        return this.delayRetryFallback(integration, error);
      default:
        return this.defaultFallback(integration, error);
    }
  }

  /**
   * Offline mode fallback
   */
  offlineModeFallback(integration, error) {
    return {
      success: false,
      mode: 'offline',
      integration,
      message: `${integration} is temporarily unavailable. Operating in offline mode.`,
      fallbackExecuted: true,
      timestamp: new Date().toISOString(),
      originalError: error.message
    };
  }

  /**
   * Queue retry fallback
   */
  queueRetryFallback(integration, error) {
    // Add to retry queue (placeholder)
    return {
      success: false,
      mode: 'queued',
      integration,
      message: `Request queued for retry when ${integration} becomes available.`,
      fallbackExecuted: true,
      timestamp: new Date().toISOString(),
      originalError: error.message
    };
  }

  /**
   * Delay retry fallback
   */
  delayRetryFallback(integration, error) {
    return {
      success: false,
      mode: 'delayed',
      integration,
      message: `Request will be retried later when ${integration} becomes available.`,
      fallbackExecuted: true,
      timestamp: new Date().toISOString(),
      originalError: error.message
    };
  }

  /**
   * Default fallback
   */
  defaultFallback(integration, error) {
    return {
      success: false,
      mode: 'default',
      integration,
      message: `${integration} is temporarily unavailable.`,
      fallbackExecuted: true,
      timestamp: new Date().toISOString(),
      originalError: error.message
    };
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute(integration, operation, ...args) {
    const breaker = this.breakers.get(integration);
    
    if (!breaker) {
      throw new Error(`Circuit breaker not found for integration: ${integration}`);
    }

    try {
      return await breaker.fire(operation, ...args);
    } catch (error) {
      logger.error(`Circuit breaker execution failed`, {
        integration,
        operation,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update metrics
   */
  updateMetrics(integration, type, duration = 0, error = null) {
    const metrics = this.metrics.get(integration);
    if (!metrics) return;

    switch (type) {
      case 'success':
        metrics.totalRequests++;
        metrics.successfulRequests++;
        metrics.lastSuccess = new Date();
        if (duration > 0) {
          metrics.averageResponseTime = (metrics.averageResponseTime + duration) / 2;
        }
        break;
      case 'failure':
        metrics.totalRequests++;
        metrics.failedRequests++;
        metrics.lastFailure = new Date();
        if (error) {
          metrics.lastError = error.message;
        }
        break;
      case 'timeout':
        metrics.timeouts++;
        break;
      case 'circuit-opened':
        metrics.circuitOpened++;
        break;
      case 'circuit-closed':
        metrics.circuitClosed++;
        break;
      case 'fallback':
        metrics.fallbackExecuted++;
        break;
    }

    // Calculate uptime percentage
    if (metrics.totalRequests > 0) {
      metrics.uptime = (metrics.successfulRequests / metrics.totalRequests) * 100;
    }
  }

  /**
   * Send notification
   */
  async sendNotification(type, integration, message, level = 'info') {
    try {
      const notification = {
        type: 'circuit-breaker',
        level,
        integration,
        message,
        timestamp: new Date().toISOString(),
        details: {
          circuitBreakerEvent: type,
          metrics: this.metrics.get(integration)
        }
      };

      // Emit event for internal listeners
      this.emit('notification', notification);

      // Send through notification service if available
      if (this.notificationService) {
        await this.notificationService.send(notification);
      }

      logger.info('Circuit breaker notification sent', {
        type,
        integration,
        level
      });

    } catch (error) {
      logger.error('Failed to send circuit breaker notification', {
        error: error.message,
        type,
        integration
      });
    }
  }

  /**
   * Activate fallback mode
   */
  activateFallback(integration, strategy) {
    this.fallbackStrategies.set(integration, {
      strategy,
      activatedAt: new Date(),
      active: true
    });

    logger.info(`Fallback activated for ${integration}`, {
      integration,
      strategy
    });
  }

  /**
   * Deactivate fallback mode
   */
  deactivateFallback(integration) {
    const fallback = this.fallbackStrategies.get(integration);
    if (fallback) {
      fallback.active = false;
      fallback.deactivatedAt = new Date();
    }

    logger.info(`Fallback deactivated for ${integration}`, { integration });
  }

  /**
   * Setup metrics collection
   */
  setupMetricsCollection() {
    // Collect metrics every 5 minutes
    setInterval(() => {
      this.collectMetrics();
    }, 5 * 60 * 1000);
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.on('notification', (notification) => {
      // Handle notifications internally
      logger.debug('Circuit breaker notification received', notification);
    });
  }

  /**
   * Collect and emit metrics
   */
  collectMetrics() {
    const allMetrics = {};
    
    for (const [integration, metrics] of this.metrics.entries()) {
      const breaker = this.breakers.get(integration);
      
      allMetrics[integration] = {
        ...metrics,
        circuitState: breaker ? breaker.stats.state : 'unknown',
        circuitStats: breaker ? breaker.stats : null
      };
    }

    this.emit('metrics', allMetrics);
    
    logger.debug('Circuit breaker metrics collected', {
      integrations: Object.keys(allMetrics)
    });
  }

  /**
   * Get circuit breaker status
   */
  getStatus(integration = null) {
    if (integration) {
      const breaker = this.breakers.get(integration);
      const metrics = this.metrics.get(integration);
      const fallback = this.fallbackStrategies.get(integration);
      
      if (!breaker) return null;
      
      return {
        integration,
        state: breaker.stats.state,
        stats: breaker.stats,
        metrics,
        fallback,
        config: this.integrationConfigs[integration]
      };
    }

    // Return all statuses
    const statuses = {};
    for (const integration of this.breakers.keys()) {
      statuses[integration] = this.getStatus(integration);
    }
    
    return statuses;
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const health = {
      healthy: true,
      totalIntegrations: this.breakers.size,
      healthyIntegrations: 0,
      unhealthyIntegrations: 0,
      details: {}
    };

    for (const [integration, breaker] of this.breakers.entries()) {
      const metrics = this.metrics.get(integration);
      const isHealthy = breaker.stats.state === 'CLOSED' && metrics.uptime > 80;
      
      if (isHealthy) {
        health.healthyIntegrations++;
      } else {
        health.unhealthyIntegrations++;
        health.healthy = false;
      }
      
      health.details[integration] = {
        healthy: isHealthy,
        state: breaker.stats.state,
        uptime: metrics.uptime,
        lastFailure: metrics.lastFailure
      };
    }

    return health;
  }

  /**
   * Reset circuit breaker
   */
  async resetCircuitBreaker(integration) {
    const breaker = this.breakers.get(integration);
    if (breaker) {
      breaker.close();
      logger.info(`Circuit breaker manually reset for ${integration}`, { integration });
      return true;
    }
    return false;
  }

  /**
   * Shutdown circuit breaker manager
   */
  async shutdown() {
    for (const [integration, breaker] of this.breakers.entries()) {
      breaker.shutdown();
    }
    
    this.breakers.clear();
    this.metrics.clear();
    this.fallbackStrategies.clear();
    
    logger.info('Circuit breaker manager shut down');
  }
}

// Export singleton
module.exports = new CircuitBreakerManager();