/**
 * Scheduler Service
 * Manages automated tasks using node-cron
 * Handles log cleanup, report generation, backups, and maintenance tasks
 */

const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../config/logger');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
    this.models = null;
    this.timezone = 'America/Montevideo'; // Uruguay timezone
    
    // Job configurations
    this.jobConfigs = {
      logCleanup: {
        name: 'Log Cleanup',
        schedule: '0 3 * * *', // Daily at 3 AM
        enabled: true,
        timeout: 30 * 60 * 1000, // 30 minutes
        retryAttempts: 3,
        description: 'Clean up old log files and audit records'
      },
      reportGeneration: {
        name: 'Weekly Reports',
        schedule: '0 6 * * 1', // Mondays at 6 AM
        enabled: true,
        timeout: 60 * 60 * 1000, // 1 hour
        retryAttempts: 2,
        description: 'Generate weekly activity and security reports'
      },
      databaseBackup: {
        name: 'Database Backup',
        schedule: '0 2 * * *', // Daily at 2 AM
        enabled: process.env.NODE_ENV === 'production',
        timeout: 2 * 60 * 60 * 1000, // 2 hours
        retryAttempts: 2,
        description: 'Create database backups'
      },
      pinCleanup: {
        name: 'PIN Cleanup',
        schedule: '0 * * * *', // Every hour
        enabled: true,
        timeout: 10 * 60 * 1000, // 10 minutes
        retryAttempts: 3,
        description: 'Remove expired PINs and cleanup related data'
      },
      cacheCleanup: {
        name: 'Cache Cleanup',
        schedule: '0 4 * * *', // Daily at 4 AM
        enabled: true,
        timeout: 15 * 60 * 1000, // 15 minutes
        retryAttempts: 2,
        description: 'Clean expired cache entries and optimize memory'
      },
      metricsAggregation: {
        name: 'Metrics Aggregation',
        schedule: '*/30 * * * *', // Every 30 minutes
        enabled: true,
        timeout: 5 * 60 * 1000, // 5 minutes
        retryAttempts: 3,
        description: 'Aggregate and calculate system metrics'
      },
      healthCheck: {
        name: 'System Health Check',
        schedule: '*/15 * * * *', // Every 15 minutes
        enabled: true,
        timeout: 2 * 60 * 1000, // 2 minutes
        retryAttempts: 1,
        description: 'Perform comprehensive system health checks'
      },
      sessionCleanup: {
        name: 'Session Cleanup',
        schedule: '0 1 * * *', // Daily at 1 AM
        enabled: true,
        timeout: 10 * 60 * 1000, // 10 minutes
        retryAttempts: 2,
        description: 'Clean expired user sessions and tokens'
      }
    };
  }

  /**
   * Initialize the scheduler service
   */
  async initialize(models = null) {
    try {
      this.models = models;
      this.isInitialized = true;

      // Start all enabled jobs
      for (const [jobId, config] of Object.entries(this.jobConfigs)) {
        if (config.enabled) {
          await this.scheduleJob(jobId, config);
        }
      }

      logger.info('Scheduler service initialized', {
        totalJobs: Object.keys(this.jobConfigs).length,
        enabledJobs: Object.values(this.jobConfigs).filter(j => j.enabled).length,
        timezone: this.timezone
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize scheduler service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Schedule a job
   */
  async scheduleJob(jobId, config) {
    try {
      const job = cron.schedule(config.schedule, async () => {
        await this.executeJob(jobId, config);
      }, {
        scheduled: true,
        timezone: this.timezone
      });

      this.jobs.set(jobId, {
        ...config,
        cronJob: job,
        lastRun: null,
        nextRun: job.nextDate(),
        runCount: 0,
        errorCount: 0,
        lastError: null
      });

      logger.info('Job scheduled successfully', {
        jobId,
        name: config.name,
        schedule: config.schedule,
        nextRun: job.nextDate()
      });

    } catch (error) {
      logger.error('Failed to schedule job', {
        jobId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute a job with error handling and retries
   */
  async executeJob(jobId, config) {
    const startTime = Date.now();
    let attempts = 0;
    let lastError = null;

    logger.info('Starting scheduled job', {
      jobId,
      name: config.name,
      attempt: attempts + 1
    });

    while (attempts < config.retryAttempts) {
      try {
        // Set timeout for job execution
        const jobPromise = this.runJobFunction(jobId);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Job timeout')), config.timeout)
        );

        await Promise.race([jobPromise, timeoutPromise]);

        // Job completed successfully
        const duration = Date.now() - startTime;
        const jobData = this.jobs.get(jobId);
        
        if (jobData) {
          jobData.lastRun = new Date();
          jobData.runCount++;
          jobData.lastError = null;
          jobData.nextRun = jobData.cronJob.nextDate();
        }

        logger.info('Scheduled job completed successfully', {
          jobId,
          name: config.name,
          duration,
          attempts: attempts + 1
        });

        return;

      } catch (error) {
        attempts++;
        lastError = error;

        logger.warn('Scheduled job failed', {
          jobId,
          name: config.name,
          attempt: attempts,
          maxAttempts: config.retryAttempts,
          error: error.message
        });

        if (attempts < config.retryAttempts) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempts - 1), 30000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    const duration = Date.now() - startTime;
    const jobData = this.jobs.get(jobId);
    
    if (jobData) {
      jobData.errorCount++;
      jobData.lastError = lastError.message;
    }

    logger.error('Scheduled job failed after all retry attempts', {
      jobId,
      name: config.name,
      duration,
      attempts,
      error: lastError.message
    });

    // Emit event for monitoring systems
    this.emit?.('jobFailed', {
      jobId,
      config,
      error: lastError,
      attempts
    });
  }

  /**
   * Run the actual job function based on job ID
   */
  async runJobFunction(jobId) {
    switch (jobId) {
      case 'logCleanup':
        return await this.runLogCleanup();
      case 'reportGeneration':
        return await this.runReportGeneration();
      case 'databaseBackup':
        return await this.runDatabaseBackup();
      case 'pinCleanup':
        return await this.runPinCleanup();
      case 'cacheCleanup':
        return await this.runCacheCleanup();
      case 'metricsAggregation':
        return await this.runMetricsAggregation();
      case 'healthCheck':
        return await this.runHealthCheck();
      case 'sessionCleanup':
        return await this.runSessionCleanup();
      default:
        throw new Error(`Unknown job ID: ${jobId}`);
    }
  }

  /**
   * Log cleanup job implementation
   */
  async runLogCleanup() {
    const retentionDays = 30; // Configurable retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let cleanedCount = 0;

    try {
      // Clean audit logs
      if (this.models && this.models.AuditLog) {
        const result = await this.models.AuditLog.destroy({
          where: {
            created_at: {
              [this.models.Sequelize.Op.lt]: cutoffDate
            }
          }
        });
        cleanedCount += result;
      }

      // Clean log files
      const logsDir = path.join(process.cwd(), 'logs');
      try {
        const files = await fs.readdir(logsDir);
        for (const file of files) {
          const filePath = path.join(logsDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        }
      } catch (error) {
        // Logs directory might not exist
        logger.debug('Log directory not found or inaccessible');
      }

      logger.info('Log cleanup completed', {
        retentionDays,
        cutoffDate,
        cleanedCount
      });

    } catch (error) {
      logger.error('Log cleanup failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Report generation job implementation
   */
  async runReportGeneration() {
    try {
      const reportData = {
        week: this.getWeekNumber(new Date()),
        year: new Date().getFullYear(),
        generatedAt: new Date(),
        stats: {}
      };

      // Generate weekly statistics
      if (this.models) {
        // Access statistics
        if (this.models.AuditLog) {
          const weekStart = this.getWeekStart(new Date());
          const accessCount = await this.models.AuditLog.count({
            where: {
              action: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
              created_at: {
                [this.models.Sequelize.Op.gte]: weekStart
              }
            }
          });
          reportData.stats.weeklyAccess = accessCount;
        }

        // Security events
        const securityEvents = await this.getSecurityEvents();
        reportData.stats.securityEvents = securityEvents;
      }

      // Store or send report (implementation depends on requirements)
      logger.info('Weekly report generated', {
        week: reportData.week,
        year: reportData.year,
        stats: reportData.stats
      });

    } catch (error) {
      logger.error('Report generation failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Database backup job implementation
   */
  async runDatabaseBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `forten_backup_${timestamp}`;

      // This would typically use pg_dump for PostgreSQL
      // Implementation depends on your backup strategy
      logger.info('Database backup initiated', {
        backupName,
        timestamp
      });

      // Placeholder for actual backup implementation
      // In production, you might use:
      // - pg_dump command
      // - Cloud database backup services
      // - Custom backup solutions

    } catch (error) {
      logger.error('Database backup failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * PIN cleanup job implementation
   */
  async runPinCleanup() {
    let cleanedCount = 0;

    try {
      if (this.models && this.models.Pin) {
        // Remove expired PINs
        const result = await this.models.Pin.destroy({
          where: {
            expires_at: {
              [this.models.Sequelize.Op.lt]: new Date()
            }
          }
        });
        cleanedCount = result;
      }

      logger.info('PIN cleanup completed', {
        cleanedCount
      });

    } catch (error) {
      logger.error('PIN cleanup failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cache cleanup job implementation
   */
  async runCacheCleanup() {
    try {
      // Clean Redis cache if available
      const redis = require('../config/redis');
      const redisClient = redis.getClient();

      if (redisClient) {
        // Clean expired keys (Redis handles this automatically, but we can force it)
        const info = await redisClient.info('memory');
        logger.info('Cache cleanup completed', {
          redisInfo: info
        });
      }

    } catch (error) {
      logger.error('Cache cleanup failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Metrics aggregation job implementation
   */
  async runMetricsAggregation() {
    try {
      // Trigger metrics service aggregation
      const metricsService = require('./metrics.service');
      if (metricsService && typeof metricsService.updateMetrics === 'function') {
        await metricsService.updateMetrics();
      }

      logger.info('Metrics aggregation completed');

    } catch (error) {
      logger.error('Metrics aggregation failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Health check job implementation
   */
  async runHealthCheck() {
    try {
      const healthStatus = {
        database: false,
        redis: false,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      };

      // Check database health
      if (this.models && this.models.sequelize) {
        try {
          await this.models.sequelize.authenticate();
          healthStatus.database = true;
        } catch (error) {
          healthStatus.database = false;
        }
      }

      // Check Redis health
      try {
        const redis = require('../config/redis');
        const redisClient = redis.getClient();
        if (redisClient) {
          await redisClient.ping();
          healthStatus.redis = true;
        }
      } catch (error) {
        healthStatus.redis = false;
      }

      logger.info('System health check completed', healthStatus);

    } catch (error) {
      logger.error('Health check failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Session cleanup job implementation
   */
  async runSessionCleanup() {
    try {
      // Clean expired sessions from Redis
      const redis = require('../config/redis');
      const redisClient = redis.getClient();

      if (redisClient) {
        const sessionKeys = await redisClient.keys('session:*');
        let cleanedCount = 0;

        for (const key of sessionKeys) {
          const ttl = await redisClient.ttl(key);
          if (ttl <= 0) {
            await redisClient.del(key);
            cleanedCount++;
          }
        }

        logger.info('Session cleanup completed', {
          totalSessions: sessionKeys.length,
          cleanedCount
        });
      }

    } catch (error) {
      logger.error('Session cleanup failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Utility methods
   */
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  async getSecurityEvents() {
    // Implementation would depend on your security event tracking
    return {
      highRiskLogins: 0,
      suspiciousActivities: 0,
      blockedRequests: 0
    };
  }

  /**
   * Management methods
   */
  getJobStatus(jobId) {
    return this.jobs.get(jobId) || null;
  }

  getAllJobStatuses() {
    const statuses = {};
    for (const [jobId, jobData] of this.jobs.entries()) {
      statuses[jobId] = {
        name: jobData.name,
        enabled: jobData.enabled,
        schedule: jobData.schedule,
        lastRun: jobData.lastRun,
        nextRun: jobData.nextRun,
        runCount: jobData.runCount,
        errorCount: jobData.errorCount,
        lastError: jobData.lastError
      };
    }
    return statuses;
  }

  async startJob(jobId) {
    const jobData = this.jobs.get(jobId);
    if (jobData) {
      jobData.cronJob.start();
      logger.info('Job started manually', { jobId });
    }
  }

  async stopJob(jobId) {
    const jobData = this.jobs.get(jobId);
    if (jobData) {
      jobData.cronJob.stop();
      logger.info('Job stopped manually', { jobId });
    }
  }

  async executeJobNow(jobId) {
    const config = this.jobConfigs[jobId];
    if (config) {
      await this.executeJob(jobId, config);
    }
  }

  /**
   * Shutdown the scheduler service
   */
  async shutdown() {
    for (const [jobId, jobData] of this.jobs.entries()) {
      jobData.cronJob.stop();
    }
    this.jobs.clear();
    this.isInitialized = false;
    logger.info('Scheduler service shut down');
  }
}

// Export singleton
module.exports = new SchedulerService();