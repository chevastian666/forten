/**
 * Dynamic Configuration Service
 * Manages system configuration parameters with Redis storage
 * Allows real-time configuration changes without server restart
 */

const EventEmitter = require('events');
const { logger } = require('../config/logger');
const redis = require('../config/redis');

class ConfigService extends EventEmitter {
  constructor() {
    super();
    this.redisClient = null;
    this.config = new Map();
    this.configSchema = new Map();
    this.isInitialized = false;
    this.watchedKeys = new Set();
    this.cacheTimeout = 5000; // 5 seconds cache
    this.lastFetch = new Map();
    
    // Define configuration schema with validation rules
    this.defineConfigSchema();
  }

  /**
   * Initialize the configuration service
   */
  async initialize(redisClient = null) {
    try {
      this.redisClient = redisClient || redis.getClient();
      
      if (!this.redisClient) {
        throw new Error('Redis client not available');
      }

      // Load initial configuration from Redis
      await this.loadConfiguration();
      
      // Set up Redis key expiration notifications if supported
      this.setupRedisWatcher();
      
      this.isInitialized = true;
      logger.info('Dynamic configuration service initialized', {
        configKeys: Array.from(this.config.keys()).length,
        schemaKeys: Array.from(this.configSchema.keys()).length
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize configuration service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Define configuration schema with validation rules
   */
  defineConfigSchema() {
    // System configuration
    this.configSchema.set('system.maintenance_mode', {
      type: 'boolean',
      default: false,
      description: 'Enable maintenance mode',
      category: 'system',
      requiresRestart: false,
      validation: (value) => typeof value === 'boolean'
    });

    this.configSchema.set('system.debug_mode', {
      type: 'boolean',
      default: false,
      description: 'Enable debug logging',
      category: 'system',
      requiresRestart: false,
      validation: (value) => typeof value === 'boolean'
    });

    this.configSchema.set('system.max_file_upload_mb', {
      type: 'number',
      default: 10,
      min: 1,
      max: 100,
      description: 'Maximum file upload size in MB',
      category: 'system',
      requiresRestart: false,
      validation: (value) => typeof value === 'number' && value >= 1 && value <= 100
    });

    // Rate limiting configuration
    this.configSchema.set('rate_limit.global_requests_per_minute', {
      type: 'number',
      default: 1000,
      min: 10,
      max: 10000,
      description: 'Global rate limit requests per minute',
      category: 'security',
      requiresRestart: false,
      validation: (value) => typeof value === 'number' && value >= 10 && value <= 10000
    });

    this.configSchema.set('rate_limit.auth_requests_per_minute', {
      type: 'number',
      default: 10,
      min: 1,
      max: 100,
      description: 'Authentication rate limit per minute',
      category: 'security',
      requiresRestart: false,
      validation: (value) => typeof value === 'number' && value >= 1 && value <= 100
    });

    this.configSchema.set('rate_limit.api_requests_per_minute', {
      type: 'number',
      default: 200,
      min: 10,
      max: 2000,
      description: 'API rate limit requests per minute',
      category: 'security',
      requiresRestart: false,
      validation: (value) => typeof value === 'number' && value >= 10 && value <= 2000
    });

    // Cache configuration
    this.configSchema.set('cache.default_ttl_seconds', {
      type: 'number',
      default: 300,
      min: 30,
      max: 3600,
      description: 'Default cache TTL in seconds',
      category: 'performance',
      requiresRestart: false,
      validation: (value) => typeof value === 'number' && value >= 30 && value <= 3600
    });

    this.configSchema.set('cache.max_memory_mb', {
      type: 'number',
      default: 256,
      min: 64,
      max: 2048,
      description: 'Maximum cache memory in MB',
      category: 'performance',
      requiresRestart: true,
      validation: (value) => typeof value === 'number' && value >= 64 && value <= 2048
    });

    // Security configuration
    this.configSchema.set('security.jwt_expiry_hours', {
      type: 'number',
      default: 24,
      min: 1,
      max: 168,
      description: 'JWT token expiry in hours',
      category: 'security',
      requiresRestart: false,
      validation: (value) => typeof value === 'number' && value >= 1 && value <= 168
    });

    this.configSchema.set('security.max_login_attempts', {
      type: 'number',
      default: 5,
      min: 3,
      max: 20,
      description: 'Maximum login attempts before lockout',
      category: 'security',
      requiresRestart: false,
      validation: (value) => typeof value === 'number' && value >= 3 && value <= 20
    });

    this.configSchema.set('security.session_timeout_minutes', {
      type: 'number',
      default: 30,
      min: 5,
      max: 480,
      description: 'Session timeout in minutes',
      category: 'security',
      requiresRestart: false,
      validation: (value) => typeof value === 'number' && value >= 5 && value <= 480
    });

    // Notification configuration
    this.configSchema.set('notifications.email_enabled', {
      type: 'boolean',
      default: true,
      description: 'Enable email notifications',
      category: 'notifications',
      requiresRestart: false,
      validation: (value) => typeof value === 'boolean'
    });

    this.configSchema.set('notifications.sms_enabled', {
      type: 'boolean',
      default: false,
      description: 'Enable SMS notifications',
      category: 'notifications',
      requiresRestart: false,
      validation: (value) => typeof value === 'boolean'
    });

    this.configSchema.set('notifications.webhook_timeout_seconds', {
      type: 'number',
      default: 30,
      min: 5,
      max: 120,
      description: 'Webhook timeout in seconds',
      category: 'notifications',
      requiresRestart: false,
      validation: (value) => typeof value === 'number' && value >= 5 && value <= 120
    });

    this.configSchema.set('notifications.max_retry_attempts', {
      type: 'number',
      default: 3,
      min: 1,
      max: 10,
      description: 'Maximum notification retry attempts',
      category: 'notifications',
      requiresRestart: false,
      validation: (value) => typeof value === 'number' && value >= 1 && value <= 10
    });

    // Database configuration
    this.configSchema.set('database.connection_pool_max', {
      type: 'number',
      default: 10,
      min: 5,
      max: 50,
      description: 'Maximum database connections in pool',
      category: 'database',
      requiresRestart: true,
      validation: (value) => typeof value === 'number' && value >= 5 && value <= 50
    });

    this.configSchema.set('database.query_timeout_seconds', {
      type: 'number',
      default: 30,
      min: 5,
      max: 300,
      description: 'Database query timeout in seconds',
      category: 'database',
      requiresRestart: false,
      validation: (value) => typeof value === 'number' && value >= 5 && value <= 300
    });

    // Audit configuration
    this.configSchema.set('audit.retention_days', {
      type: 'number',
      default: 90,
      min: 30,
      max: 365,
      description: 'Audit log retention in days',
      category: 'audit',
      requiresRestart: false,
      validation: (value) => typeof value === 'number' && value >= 30 && value <= 365
    });

    this.configSchema.set('audit.detailed_logging', {
      type: 'boolean',
      default: true,
      description: 'Enable detailed audit logging',
      category: 'audit',
      requiresRestart: false,
      validation: (value) => typeof value === 'boolean'
    });

    // Feature flags
    this.configSchema.set('features.aggregation_enabled', {
      type: 'boolean',
      default: true,
      description: 'Enable statistics aggregation',
      category: 'features',
      requiresRestart: false,
      validation: (value) => typeof value === 'boolean'
    });

    this.configSchema.set('features.webhooks_enabled', {
      type: 'boolean',
      default: true,
      description: 'Enable webhook functionality',
      category: 'features',
      requiresRestart: false,
      validation: (value) => typeof value === 'boolean'
    });

    this.configSchema.set('features.soft_deletes_enabled', {
      type: 'boolean',
      default: true,
      description: 'Enable soft delete functionality',
      category: 'features',
      requiresRestart: false,
      validation: (value) => typeof value === 'boolean'
    });

    // Performance tuning
    this.configSchema.set('performance.compression_enabled', {
      type: 'boolean',
      default: true,
      description: 'Enable response compression',
      category: 'performance',
      requiresRestart: false,
      validation: (value) => typeof value === 'boolean'
    });

    this.configSchema.set('performance.request_timeout_seconds', {
      type: 'number',
      default: 30,
      min: 5,
      max: 300,
      description: 'Request timeout in seconds',
      category: 'performance',
      requiresRestart: false,
      validation: (value) => typeof value === 'number' && value >= 5 && value <= 300
    });
  }

  /**
   * Load configuration from Redis
   */
  async loadConfiguration() {
    try {
      const keys = await this.redisClient.keys('config:*');
      
      for (const key of keys) {
        const configKey = key.replace('config:', '');
        const value = await this.redisClient.get(key);
        
        if (value !== null) {
          try {
            const parsedValue = JSON.parse(value);
            this.config.set(configKey, parsedValue);
            this.lastFetch.set(configKey, Date.now());
          } catch (parseError) {
            logger.warn('Failed to parse config value', {
              key: configKey,
              value,
              error: parseError.message
            });
          }
        }
      }

      // Set defaults for missing configurations
      for (const [key, schema] of this.configSchema.entries()) {
        if (!this.config.has(key)) {
          this.config.set(key, schema.default);
          await this.setConfig(key, schema.default, { skipValidation: true });
        }
      }

      logger.info('Configuration loaded from Redis', {
        keysLoaded: keys.length,
        totalConfigs: this.config.size
      });
    } catch (error) {
      logger.error('Error loading configuration', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get configuration value with caching
   */
  async get(key, useCache = true) {
    if (!this.isInitialized) {
      throw new Error('Configuration service not initialized');
    }

    // Check if we should fetch from Redis (cache expired or forced refresh)
    const lastFetchTime = this.lastFetch.get(key) || 0;
    const shouldFetch = !useCache || (Date.now() - lastFetchTime) > this.cacheTimeout;

    if (shouldFetch) {
      try {
        const redisKey = `config:${key}`;
        const value = await this.redisClient.get(redisKey);
        
        if (value !== null) {
          const parsedValue = JSON.parse(value);
          this.config.set(key, parsedValue);
          this.lastFetch.set(key, Date.now());
        }
      } catch (error) {
        logger.warn('Error fetching config from Redis, using cached value', {
          key,
          error: error.message
        });
      }
    }

    // Return cached value or default
    if (this.config.has(key)) {
      return this.config.get(key);
    }

    // Return default if defined in schema
    const schema = this.configSchema.get(key);
    if (schema) {
      return schema.default;
    }

    return null;
  }

  /**
   * Set configuration value with validation
   */
  async setConfig(key, value, options = {}) {
    if (!this.isInitialized && !options.skipValidation) {
      throw new Error('Configuration service not initialized');
    }

    // Validate against schema
    if (!options.skipValidation) {
      const validation = await this.validateConfig(key, value);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.error}`);
      }
    }

    try {
      // Store in Redis
      const redisKey = `config:${key}`;
      await this.redisClient.set(redisKey, JSON.stringify(value));

      // Update local cache
      const oldValue = this.config.get(key);
      this.config.set(key, value);
      this.lastFetch.set(key, Date.now());

      // Emit change event
      this.emit('configChanged', {
        key,
        oldValue,
        newValue: value,
        timestamp: new Date(),
        requiresRestart: this.requiresRestart(key)
      });

      logger.info('Configuration updated', {
        key,
        oldValue,
        newValue: value,
        requiresRestart: this.requiresRestart(key)
      });

      return true;
    } catch (error) {
      logger.error('Error setting configuration', {
        key,
        value,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate configuration value
   */
  async validateConfig(key, value) {
    const schema = this.configSchema.get(key);
    
    if (!schema) {
      return {
        valid: false,
        error: `Unknown configuration key: ${key}`
      };
    }

    // Type validation
    if (schema.validation && !schema.validation(value)) {
      return {
        valid: false,
        error: `Invalid value type or range for ${key}`
      };
    }

    // Range validation for numbers
    if (schema.type === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        return {
          valid: false,
          error: `Value ${value} is below minimum ${schema.min} for ${key}`
        };
      }
      if (schema.max !== undefined && value > schema.max) {
        return {
          valid: false,
          error: `Value ${value} is above maximum ${schema.max} for ${key}`
        };
      }
    }

    // String length validation
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength && value.length < schema.minLength) {
        return {
          valid: false,
          error: `String too short for ${key}, minimum length: ${schema.minLength}`
        };
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        return {
          valid: false,
          error: `String too long for ${key}, maximum length: ${schema.maxLength}`
        };
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      return {
        valid: false,
        error: `Invalid value for ${key}, allowed values: ${schema.enum.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Get all configurations
   */
  async getAllConfigs() {
    const configs = {};
    
    for (const [key, schema] of this.configSchema.entries()) {
      try {
        configs[key] = {
          value: await this.get(key),
          schema: {
            type: schema.type,
            default: schema.default,
            description: schema.description,
            category: schema.category,
            requiresRestart: schema.requiresRestart,
            min: schema.min,
            max: schema.max,
            enum: schema.enum
          }
        };
      } catch (error) {
        logger.warn('Error getting config', { key, error: error.message });
        configs[key] = {
          value: schema.default,
          schema: {
            type: schema.type,
            default: schema.default,
            description: schema.description,
            category: schema.category,
            requiresRestart: schema.requiresRestart,
            error: error.message
          }
        };
      }
    }

    return configs;
  }

  /**
   * Get configurations by category
   */
  async getConfigsByCategory(category) {
    const configs = {};
    
    for (const [key, schema] of this.configSchema.entries()) {
      if (schema.category === category) {
        try {
          configs[key] = {
            value: await this.get(key),
            schema
          };
        } catch (error) {
          configs[key] = {
            value: schema.default,
            schema,
            error: error.message
          };
        }
      }
    }

    return configs;
  }

  /**
   * Check if configuration change requires restart
   */
  requiresRestart(key) {
    const schema = this.configSchema.get(key);
    return schema ? schema.requiresRestart : false;
  }

  /**
   * Reset configuration to default
   */
  async resetConfig(key) {
    const schema = this.configSchema.get(key);
    if (!schema) {
      throw new Error(`Unknown configuration key: ${key}`);
    }

    return await this.setConfig(key, schema.default);
  }

  /**
   * Reset all configurations to defaults
   */
  async resetAllConfigs() {
    const results = {};
    
    for (const [key, schema] of this.configSchema.entries()) {
      try {
        await this.setConfig(key, schema.default);
        results[key] = { success: true, value: schema.default };
      } catch (error) {
        results[key] = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Bulk update configurations
   */
  async bulkUpdateConfigs(configs) {
    const results = {};
    const errors = [];

    // Validate all first
    for (const [key, value] of Object.entries(configs)) {
      const validation = await this.validateConfig(key, value);
      if (!validation.valid) {
        errors.push({ key, error: validation.error });
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation errors: ${JSON.stringify(errors)}`);
    }

    // Apply all changes
    for (const [key, value] of Object.entries(configs)) {
      try {
        await this.setConfig(key, value);
        results[key] = { success: true, value };
      } catch (error) {
        results[key] = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Export configuration as JSON
   */
  async exportConfig() {
    const configs = await this.getAllConfigs();
    const exportData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      configs: {}
    };

    for (const [key, config] of Object.entries(configs)) {
      exportData.configs[key] = config.value;
    }

    return exportData;
  }

  /**
   * Import configuration from JSON
   */
  async importConfig(configData) {
    if (!configData.configs) {
      throw new Error('Invalid configuration data format');
    }

    const results = await this.bulkUpdateConfigs(configData.configs);
    
    logger.info('Configuration imported', {
      timestamp: configData.timestamp,
      version: configData.version,
      keysImported: Object.keys(configData.configs).length
    });

    return results;
  }

  /**
   * Setup Redis watcher for configuration changes
   */
  setupRedisWatcher() {
    try {
      // This would require Redis keyspace notifications to be enabled
      // For now, we'll rely on the application-level change events
      logger.debug('Redis watcher setup (requires keyspace notifications)');
    } catch (error) {
      logger.warn('Could not setup Redis watcher', {
        error: error.message
      });
    }
  }

  /**
   * Get configuration statistics
   */
  getStats() {
    return {
      totalConfigs: this.configSchema.size,
      loadedConfigs: this.config.size,
      categories: [...new Set(Array.from(this.configSchema.values()).map(s => s.category))],
      requiresRestartCount: Array.from(this.configSchema.values()).filter(s => s.requiresRestart).length,
      lastUpdate: Math.max(...Array.from(this.lastFetch.values())),
      isInitialized: this.isInitialized
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    this.isInitialized = false;
    this.config.clear();
    this.lastFetch.clear();
    this.removeAllListeners();
    logger.info('Configuration service shut down');
  }
}

// Export singleton
module.exports = new ConfigService();