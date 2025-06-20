/**
 * Aggregation Cron Jobs
 * Scheduled tasks for data aggregation
 */

const cron = require('node-cron');
const { logger } = require('../config/logger');
const AggregationService = require('../services/aggregation.service');

class AggregationJobs {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Initialize and start all aggregation jobs
   */
  start(models) {
    if (this.isRunning) {
      logger.warn('Aggregation jobs already running');
      return;
    }

    // Initialize aggregation service
    AggregationService.initialize(models);

    // Daily aggregation - runs at 2:00 AM every day
    const dailyJob = cron.schedule('0 2 * * *', async () => {
      await this.runDailyAggregation();
    }, {
      scheduled: true,
      timezone: 'America/Montevideo'
    });
    this.jobs.push({ name: 'daily', job: dailyJob });

    // Weekly aggregation - runs at 2:30 AM every Monday
    const weeklyJob = cron.schedule('30 2 * * 1', async () => {
      await this.runWeeklyAggregation();
    }, {
      scheduled: true,
      timezone: 'America/Montevideo'
    });
    this.jobs.push({ name: 'weekly', job: weeklyJob });

    // Monthly aggregation - runs at 3:00 AM on the first day of each month
    const monthlyJob = cron.schedule('0 3 1 * *', async () => {
      await this.runMonthlyAggregation();
    }, {
      scheduled: true,
      timezone: 'America/Montevideo'
    });
    this.jobs.push({ name: 'monthly', job: monthlyJob });

    // Data rollup - runs at 4:00 AM every Sunday
    const rollupJob = cron.schedule('0 4 * * 0', async () => {
      await this.runDataRollup();
    }, {
      scheduled: true,
      timezone: 'America/Montevideo'
    });
    this.jobs.push({ name: 'rollup', job: rollupJob });

    // Hourly quick stats update (for current day) - runs every hour at :05
    const hourlyJob = cron.schedule('5 * * * *', async () => {
      await this.runHourlyUpdate();
    }, {
      scheduled: true,
      timezone: 'America/Montevideo'
    });
    this.jobs.push({ name: 'hourly', job: hourlyJob });

    this.isRunning = true;
    logger.info('Aggregation jobs started', {
      jobs: this.jobs.map(j => j.name)
    });

    // Run initial aggregation for today if needed
    this.runInitialAggregation();
  }

  /**
   * Stop all aggregation jobs
   */
  stop() {
    for (const { name, job } of this.jobs) {
      job.stop();
      logger.info(`Stopped aggregation job: ${name}`);
    }
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Run initial aggregation on startup
   */
  async runInitialAggregation() {
    try {
      logger.info('Running initial aggregation check');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Check if yesterday's stats exist
      const buildings = await this.getAllBuildings();
      
      for (const building of buildings) {
        const stats = await AggregationService.models.DailyStatistics.findOne({
          where: {
            date: yesterday.toISOString().split('T')[0],
            building_id: building.id
          }
        });

        if (!stats) {
          logger.info('Missing daily stats for yesterday, running aggregation', {
            date: yesterday.toISOString().split('T')[0],
            buildingId: building.id
          });
          await AggregationService.aggregateDailyStats(yesterday, building.id);
        }
      }
    } catch (error) {
      logger.error('Initial aggregation failed', { error: error.message });
    }
  }

  /**
   * Run daily aggregation for all buildings
   */
  async runDailyAggregation() {
    const startTime = Date.now();
    logger.info('Starting daily aggregation job');

    try {
      // Aggregate for yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const buildings = await this.getAllBuildings();
      const results = {
        success: 0,
        failed: 0,
        buildings: []
      };

      // Process each building
      for (const building of buildings) {
        try {
          await AggregationService.aggregateDailyStats(yesterday, building.id);
          results.success++;
          results.buildings.push({
            id: building.id,
            name: building.name,
            status: 'success'
          });
        } catch (error) {
          results.failed++;
          results.buildings.push({
            id: building.id,
            name: building.name,
            status: 'failed',
            error: error.message
          });
          logger.error('Daily aggregation failed for building', {
            buildingId: building.id,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Daily aggregation job completed', {
        duration,
        results,
        date: yesterday.toISOString().split('T')[0]
      });

      // Send notification if any failures
      if (results.failed > 0) {
        await this.notifyAggregationFailure('daily', results);
      }

    } catch (error) {
      logger.error('Daily aggregation job failed', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Run weekly aggregation
   */
  async runWeeklyAggregation() {
    const startTime = Date.now();
    logger.info('Starting weekly aggregation job');

    try {
      // Get start of last week
      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const weekStart = AggregationService.getWeekStart(lastWeekStart);

      const buildings = await this.getAllBuildings();
      const results = {
        success: 0,
        failed: 0,
        buildings: []
      };

      for (const building of buildings) {
        try {
          await AggregationService.aggregateWeeklyStats(weekStart, building.id);
          results.success++;
        } catch (error) {
          results.failed++;
          logger.error('Weekly aggregation failed for building', {
            buildingId: building.id,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Weekly aggregation job completed', {
        duration,
        results,
        weekStart: weekStart.toISOString().split('T')[0]
      });

    } catch (error) {
      logger.error('Weekly aggregation job failed', {
        error: error.message
      });
    }
  }

  /**
   * Run monthly aggregation
   */
  async runMonthlyAggregation() {
    const startTime = Date.now();
    logger.info('Starting monthly aggregation job');

    try {
      // Get last month
      const now = new Date();
      const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      const buildings = await this.getAllBuildings();
      const results = {
        success: 0,
        failed: 0,
        buildings: []
      };

      for (const building of buildings) {
        try {
          await AggregationService.aggregateMonthlyStats(year, lastMonth, building.id);
          results.success++;
        } catch (error) {
          results.failed++;
          logger.error('Monthly aggregation failed for building', {
            buildingId: building.id,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Monthly aggregation job completed', {
        duration,
        results,
        year,
        month: lastMonth
      });

    } catch (error) {
      logger.error('Monthly aggregation job failed', {
        error: error.message
      });
    }
  }

  /**
   * Run data rollup
   */
  async runDataRollup() {
    const startTime = Date.now();
    logger.info('Starting data rollup job');

    try {
      const result = await AggregationService.rollupOldData(90); // Keep 90 days
      
      const duration = Date.now() - startTime;
      logger.info('Data rollup job completed', {
        duration,
        result
      });

    } catch (error) {
      logger.error('Data rollup job failed', {
        error: error.message
      });
    }
  }

  /**
   * Run hourly update for current day
   */
  async runHourlyUpdate() {
    try {
      const today = new Date();
      const buildings = await this.getAllBuildings();

      for (const building of buildings) {
        try {
          // Only update today's stats
          await AggregationService.aggregateDailyStats(today, building.id);
        } catch (error) {
          logger.error('Hourly update failed for building', {
            buildingId: building.id,
            error: error.message
          });
        }
      }

      logger.debug('Hourly update completed');

    } catch (error) {
      logger.error('Hourly update job failed', {
        error: error.message
      });
    }
  }

  /**
   * Get all active buildings
   */
  async getAllBuildings() {
    // In a real implementation, this would query the Building model
    // For now, return mock data
    return [
      { id: 'building-1', name: 'Torre Ejecutiva' },
      { id: 'building-2', name: 'Edificio Central' },
      { id: 'building-3', name: 'Plaza Independencia' }
    ];

    // Real implementation:
    // if (AggregationService.models.Building) {
    //   return AggregationService.models.Building.findAll({
    //     where: { is_active: true },
    //     attributes: ['id', 'name']
    //   });
    // }
  }

  /**
   * Notify about aggregation failures
   */
  async notifyAggregationFailure(type, results) {
    // In a real implementation, this would send notifications
    // via email, Slack, or monitoring system
    logger.warn('Aggregation failures detected', {
      type,
      failed: results.failed,
      buildings: results.buildings.filter(b => b.status === 'failed')
    });
  }

  /**
   * Force run aggregation (for manual triggers)
   */
  async forceRunAggregation(type, date, buildingId) {
    logger.info('Force running aggregation', { type, date, buildingId });

    try {
      switch (type) {
        case 'daily':
          return await AggregationService.aggregateDailyStats(
            new Date(date), 
            buildingId
          );
        case 'weekly':
          const weekStart = AggregationService.getWeekStart(new Date(date));
          return await AggregationService.aggregateWeeklyStats(
            weekStart, 
            buildingId
          );
        case 'monthly':
          const d = new Date(date);
          return await AggregationService.aggregateMonthlyStats(
            d.getFullYear(), 
            d.getMonth() + 1, 
            buildingId
          );
        default:
          throw new Error(`Unknown aggregation type: ${type}`);
      }
    } catch (error) {
      logger.error('Force aggregation failed', {
        type,
        date,
        buildingId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      running: this.isRunning,
      jobs: this.jobs.map(({ name, job }) => ({
        name,
        running: job.running || false,
        nextRun: job.nextDates ? job.nextDates(1)[0] : null
      }))
    };
  }
}

// Export singleton
module.exports = new AggregationJobs();