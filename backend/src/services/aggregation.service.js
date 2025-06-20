/**
 * Data Aggregation Service
 * Pre-calculates statistics for fast reporting and dashboard performance
 */

const { Op } = require('sequelize');
const { logger } = require('../config/logger');
const CacheService = require('./cache.service');

class AggregationService {
  constructor() {
    this.models = null;
    this.isInitialized = false;
  }

  /**
   * Initialize service with required models
   */
  initialize(models) {
    this.models = models;
    this.isInitialized = true;
    logger.info('Aggregation service initialized');
  }

  /**
   * Aggregate daily statistics for a specific date and building
   */
  async aggregateDailyStats(date, buildingId) {
    const startTime = Date.now();
    const dateStr = date.toISOString().split('T')[0];
    
    try {
      logger.info('Starting daily aggregation', { date: dateStr, buildingId });

      // Get date boundaries
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Initialize statistics object
      const stats = {
        date: dateStr,
        building_id: buildingId,
        hourly_distribution: {},
        access_methods: {},
        top_users: [],
        device_status_summary: {}
      };

      // Initialize hourly distribution
      for (let i = 0; i < 24; i++) {
        stats.hourly_distribution[i] = 0;
      }

      // Aggregate access data
      if (this.models.Access) {
        const accessStats = await this.aggregateAccessData(dayStart, dayEnd, buildingId);
        Object.assign(stats, accessStats);
      }

      // Aggregate event data
      if (this.models.Event) {
        const eventStats = await this.aggregateEventData(dayStart, dayEnd, buildingId);
        Object.assign(stats, eventStats);
      }

      // Aggregate PIN data
      if (this.models.Pin) {
        const pinStats = await this.aggregatePinData(dayStart, dayEnd, buildingId);
        Object.assign(stats, pinStats);
      }

      // Aggregate device data
      if (this.models.Device) {
        const deviceStats = await this.aggregateDeviceData(dayStart, dayEnd, buildingId);
        Object.assign(stats, deviceStats);
      }

      // Calculate processing metadata
      stats.processing_time_ms = Date.now() - startTime;

      // Save or update statistics
      const [dailyStat, created] = await this.models.DailyStatistics.findOrCreate({
        where: { date: dateStr, building_id: buildingId },
        defaults: stats
      });

      if (!created) {
        await dailyStat.update(stats);
      }

      logger.info('Daily aggregation completed', {
        date: dateStr,
        buildingId,
        processingTime: stats.processing_time_ms,
        created
      });

      // Invalidate related cache
      await this.invalidateCache('daily', buildingId, date);

      return dailyStat;

    } catch (error) {
      logger.error('Daily aggregation failed', {
        error: error.message,
        date: dateStr,
        buildingId
      });
      throw error;
    }
  }

  /**
   * Aggregate access data for a time period
   */
  async aggregateAccessData(startDate, endDate, buildingId) {
    const stats = {
      total_access_attempts: 0,
      successful_access: 0,
      failed_access: 0,
      unique_users: new Set(),
      unique_visitors: new Set(),
      hourly_distribution: {},
      access_methods: {},
      top_users: []
    };

    if (!this.models.Access) {
      return stats;
    }

    // Get all access records for the period
    const accesses = await this.models.Access.findAll({
      where: {
        buildingId,
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'id', 'userId', 'personDocument', 'status', 
        'accessMethod', 'timestamp', 'isVisitor'
      ],
      raw: true
    });

    // Process each access record
    const userAccessCount = {};
    
    for (const access of accesses) {
      stats.total_access_attempts++;
      
      if (access.status === 'granted') {
        stats.successful_access++;
      } else {
        stats.failed_access++;
      }

      // Track unique users/visitors
      if (access.isVisitor) {
        stats.unique_visitors.add(access.personDocument);
      } else if (access.userId) {
        stats.unique_users.add(access.userId);
      }

      // Access methods
      const method = access.accessMethod || 'unknown';
      stats.access_methods[method] = (stats.access_methods[method] || 0) + 1;

      // Hourly distribution
      const hour = new Date(access.timestamp).getHours();
      stats.hourly_distribution[hour] = (stats.hourly_distribution[hour] || 0) + 1;

      // Count by user for top users
      if (access.userId && access.status === 'granted') {
        userAccessCount[access.userId] = (userAccessCount[access.userId] || 0) + 1;
      }
    }

    // Convert sets to counts
    stats.unique_users = stats.unique_users.size;
    stats.unique_visitors = stats.unique_visitors.size;

    // Get top users
    const topUserEntries = Object.entries(userAccessCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Get user details for top users
    if (topUserEntries.length > 0 && this.models.User) {
      const userIds = topUserEntries.map(([userId]) => userId);
      const users = await this.models.User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ['id', 'first_name', 'last_name', 'email']
      });

      const userMap = users.reduce((map, user) => {
        map[user.id] = user;
        return map;
      }, {});

      stats.top_users = topUserEntries.map(([userId, count]) => ({
        user_id: userId,
        name: userMap[userId] ? 
          `${userMap[userId].first_name} ${userMap[userId].last_name}` : 
          'Unknown',
        email: userMap[userId]?.email,
        access_count: count
      }));
    }

    // Find peak hour
    const peakHour = Object.entries(stats.hourly_distribution)
      .reduce((max, [hour, count]) => 
        count > max.count ? { hour: parseInt(hour), count } : max,
      { hour: 0, count: 0 });

    stats.peak_hour = peakHour.hour;
    stats.peak_hour_access_count = peakHour.count;

    return stats;
  }

  /**
   * Aggregate event data for alerts
   */
  async aggregateEventData(startDate, endDate, buildingId) {
    const stats = {
      security_alerts: 0,
      maintenance_alerts: 0,
      emergency_alerts: 0,
      device_errors: 0
    };

    if (!this.models.Event) {
      return stats;
    }

    const events = await this.models.Event.findAll({
      where: {
        buildingId,
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['type', 'severity'],
      raw: true
    });

    for (const event of events) {
      switch (event.type) {
        case 'security_alert':
        case 'unauthorized_access':
        case 'forced_entry':
          stats.security_alerts++;
          break;
        case 'maintenance_required':
        case 'device_malfunction':
          stats.maintenance_alerts++;
          break;
        case 'emergency':
        case 'fire_alarm':
        case 'panic_button':
          stats.emergency_alerts++;
          break;
        case 'device_error':
        case 'device_offline':
          stats.device_errors++;
          break;
      }
    }

    return stats;
  }

  /**
   * Aggregate PIN statistics
   */
  async aggregatePinData(startDate, endDate, buildingId) {
    const stats = {
      pins_generated: 0,
      pins_used: 0,
      pins_expired: 0
    };

    if (!this.models.Pin) {
      return stats;
    }

    // Count PINs generated
    stats.pins_generated = await this.models.Pin.count({
      where: {
        building_id: buildingId,
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Count PINs used
    stats.pins_used = await this.models.Pin.count({
      where: {
        building_id: buildingId,
        used_at: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Count PINs expired
    stats.pins_expired = await this.models.Pin.count({
      where: {
        building_id: buildingId,
        expires_at: {
          [Op.between]: [startDate, endDate]
        },
        used_at: null
      }
    });

    return stats;
  }

  /**
   * Aggregate device statistics
   */
  async aggregateDeviceData(startDate, endDate, buildingId) {
    const stats = {
      devices_online: 0,
      device_status_summary: {}
    };

    if (!this.models.Device) {
      return stats;
    }

    // Get device status counts
    const devices = await this.models.Device.findAll({
      where: { building_id: buildingId },
      attributes: ['status']
    });

    for (const device of devices) {
      const status = device.status || 'unknown';
      stats.device_status_summary[status] = (stats.device_status_summary[status] || 0) + 1;
      
      if (status === 'online') {
        stats.devices_online++;
      }
    }

    return stats;
  }

  /**
   * Aggregate weekly statistics
   */
  async aggregateWeeklyStats(weekStart, buildingId) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting weekly aggregation', { 
        weekStart: weekStart.toISOString().split('T')[0], 
        buildingId 
      });

      // Calculate week boundaries
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Get daily statistics for the week
      const dailyStats = await this.models.DailyStatistics.findAll({
        where: {
          building_id: buildingId,
          date: {
            [Op.between]: [weekStart, weekEnd]
          }
        },
        order: [['date', 'ASC']]
      });

      if (dailyStats.length === 0) {
        logger.warn('No daily statistics found for weekly aggregation', {
          weekStart: weekStart.toISOString().split('T')[0],
          buildingId
        });
        return null;
      }

      // Initialize weekly stats
      const stats = {
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        year: weekStart.getFullYear(),
        week_number: this.getISOWeekNumber(weekStart),
        building_id: buildingId,
        daily_summary: {},
        hourly_heatmap: {},
        top_users: {},
        device_availability: {}
      };

      // Aggregate from daily statistics
      let totalAccess = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;
      const uniqueUsers = new Set();
      const uniqueVisitors = new Set();
      const userAccessCounts = {};
      let totalDevicesOnline = 0;
      let deviceDaysCount = 0;

      // Process each day
      for (const day of dailyStats) {
        const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
        
        // Basic totals
        totalAccess += day.total_access_attempts;
        totalSuccessful += day.successful_access;
        totalFailed += day.failed_access;

        // Collect unique users/visitors
        if (day.top_users) {
          day.top_users.forEach(user => {
            uniqueUsers.add(user.user_id);
            userAccessCounts[user.user_id] = 
              (userAccessCounts[user.user_id] || 0) + user.access_count;
          });
        }

        // Device statistics
        if (day.devices_online > 0) {
          totalDevicesOnline += day.devices_online;
          deviceDaysCount++;
        }

        // Daily summary
        stats.daily_summary[dayName] = {
          date: day.date,
          access_count: day.total_access_attempts,
          success_rate: day.total_access_attempts > 0 
            ? (day.successful_access / day.total_access_attempts * 100).toFixed(2)
            : 0,
          peak_hour: day.peak_hour,
          alerts: day.security_alerts + day.maintenance_alerts + day.emergency_alerts
        };

        // Build hourly heatmap
        if (day.hourly_distribution) {
          for (const [hour, count] of Object.entries(day.hourly_distribution)) {
            if (!stats.hourly_heatmap[hour]) {
              stats.hourly_heatmap[hour] = {};
            }
            stats.hourly_heatmap[hour][dayName] = count;
          }
        }
      }

      // Set aggregate values
      stats.total_access_attempts = totalAccess;
      stats.successful_access = totalSuccessful;
      stats.failed_access = totalFailed;
      stats.unique_users = uniqueUsers.size;
      stats.unique_visitors = uniqueVisitors.size;
      stats.avg_daily_access = totalAccess / dailyStats.length;
      stats.avg_devices_online = deviceDaysCount > 0 ? totalDevicesOnline / deviceDaysCount : 0;

      // Calculate other aggregates
      stats.security_alerts = dailyStats.reduce((sum, day) => sum + day.security_alerts, 0);
      stats.maintenance_alerts = dailyStats.reduce((sum, day) => sum + day.maintenance_alerts, 0);
      stats.total_alerts = stats.security_alerts + stats.maintenance_alerts;
      stats.pins_generated = dailyStats.reduce((sum, day) => sum + day.pins_generated, 0);
      stats.pins_used = dailyStats.reduce((sum, day) => sum + day.pins_used, 0);
      stats.pin_usage_rate = stats.pins_generated > 0 
        ? (stats.pins_used / stats.pins_generated * 100).toFixed(2)
        : 0;

      // Find busiest day and hour
      const busiestDay = Object.entries(stats.daily_summary)
        .reduce((max, [day, data]) => 
          data.access_count > max.count ? { day, count: data.access_count } : max,
        { day: null, count: 0 });
      stats.busiest_day = busiestDay.day;

      // Top users for the week
      stats.top_users = Object.entries(userAccessCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([userId, count]) => ({ user_id: userId, access_count: count }));

      // Calculate trends (compare with previous week if available)
      const previousWeekStart = new Date(weekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);
      
      const previousWeek = await this.models.WeeklyStatistics.findOne({
        where: {
          week_start: previousWeekStart.toISOString().split('T')[0],
          building_id: buildingId
        }
      });

      if (previousWeek) {
        stats.access_trend = previousWeek.total_access_attempts > 0
          ? ((totalAccess - previousWeek.total_access_attempts) / 
             previousWeek.total_access_attempts * 100).toFixed(2)
          : 0;
        stats.alert_trend = previousWeek.total_alerts > 0
          ? ((stats.total_alerts - previousWeek.total_alerts) / 
             previousWeek.total_alerts * 100).toFixed(2)
          : 0;
      }

      // Performance metrics
      stats.avg_response_time = dailyStats.reduce((sum, day) => 
        sum + (day.avg_response_time || 0), 0) / dailyStats.length;
      stats.system_uptime_percentage = dailyStats.reduce((sum, day) => 
        sum + day.system_uptime_percentage, 0) / dailyStats.length;

      // Metadata
      stats.processed_days = dailyStats.length;
      stats.processing_time_ms = Date.now() - startTime;

      // Save or update statistics
      const [weeklyStat, created] = await this.models.WeeklyStatistics.findOrCreate({
        where: { 
          week_start: weekStart.toISOString().split('T')[0], 
          building_id: buildingId 
        },
        defaults: stats
      });

      if (!created) {
        await weeklyStat.update(stats);
      }

      logger.info('Weekly aggregation completed', {
        weekStart: weekStart.toISOString().split('T')[0],
        buildingId,
        processingTime: stats.processing_time_ms,
        processedDays: stats.processed_days
      });

      // Invalidate cache
      await this.invalidateCache('weekly', buildingId, weekStart);

      return weeklyStat;

    } catch (error) {
      logger.error('Weekly aggregation failed', {
        error: error.message,
        weekStart: weekStart.toISOString().split('T')[0],
        buildingId
      });
      throw error;
    }
  }

  /**
   * Aggregate monthly statistics
   */
  async aggregateMonthlyStats(year, month, buildingId) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting monthly aggregation', { year, month, buildingId });

      // Calculate month boundaries
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      // Get weekly statistics for the month
      const weeklyStats = await this.models.WeeklyStatistics.findAll({
        where: {
          building_id: buildingId,
          week_start: {
            [Op.lte]: monthEnd
          },
          week_end: {
            [Op.gte]: monthStart
          }
        },
        order: [['week_start', 'ASC']]
      });

      // Get daily statistics for more detailed data
      const dailyStats = await this.models.DailyStatistics.findAll({
        where: {
          building_id: buildingId,
          date: {
            [Op.between]: [monthStart, monthEnd]
          }
        },
        order: [['date', 'ASC']]
      });

      if (dailyStats.length === 0) {
        logger.warn('No daily statistics found for monthly aggregation', {
          year, month, buildingId
        });
        return null;
      }

      // Initialize monthly stats
      const stats = {
        year,
        month,
        month_start: monthStart.toISOString().split('T')[0],
        month_end: monthEnd.toISOString().split('T')[0],
        building_id: buildingId,
        weekly_summary: {},
        daily_distribution: {},
        user_retention: {},
        top_users: {},
        access_methods_breakdown: {},
        alert_categories: {}
      };

      // Process daily data
      const userFirstSeen = {};
      const userLastSeen = {};
      const userAccessCounts = {};
      let totalApiCalls = 0;
      let busiest = { day: null, count: 0 };
      let quietest = { day: null, count: Infinity };
      let weekendAccess = 0;
      let weekdayAccess = 0;

      for (const day of dailyStats) {
        const dayOfMonth = new Date(day.date).getDate();
        const dayOfWeek = new Date(day.date).getDay();
        
        // Daily distribution
        stats.daily_distribution[dayOfMonth] = day.total_access_attempts;

        // Track busiest/quietest days
        if (day.total_access_attempts > busiest.count) {
          busiest = { day: dayOfMonth, count: day.total_access_attempts };
        }
        if (day.total_access_attempts < quietest.count) {
          quietest = { day: dayOfMonth, count: day.total_access_attempts };
        }

        // Weekend vs weekday
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendAccess += day.total_access_attempts;
        } else {
          weekdayAccess += day.total_access_attempts;
        }

        // Aggregate access methods
        if (day.access_methods) {
          for (const [method, count] of Object.entries(day.access_methods)) {
            stats.access_methods_breakdown[method] = 
              (stats.access_methods_breakdown[method] || 0) + count;
          }
        }

        // Track user activity for retention
        if (day.top_users) {
          for (const user of day.top_users) {
            if (!userFirstSeen[user.user_id]) {
              userFirstSeen[user.user_id] = day.date;
            }
            userLastSeen[user.user_id] = day.date;
            userAccessCounts[user.user_id] = 
              (userAccessCounts[user.user_id] || 0) + user.access_count;
          }
        }

        // Estimate API calls
        totalApiCalls += day.total_access_attempts + 
                        (day.pins_generated || 0) + 
                        (day.security_alerts || 0);
      }

      // Aggregate from weekly statistics
      let weekNumber = 1;
      for (const week of weeklyStats) {
        stats.weekly_summary[`Week ${weekNumber}`] = {
          start: week.week_start,
          end: week.week_end,
          total_access: week.total_access_attempts,
          avg_daily: week.avg_daily_access,
          unique_users: week.unique_users,
          alerts: week.total_alerts
        };
        weekNumber++;
      }

      // Calculate totals and averages
      stats.total_access_attempts = dailyStats.reduce((sum, day) => 
        sum + day.total_access_attempts, 0);
      stats.successful_access = dailyStats.reduce((sum, day) => 
        sum + day.successful_access, 0);
      stats.failed_access = dailyStats.reduce((sum, day) => 
        sum + day.failed_access, 0);
      stats.unique_users = Object.keys(userAccessCounts).length;
      stats.avg_daily_access = stats.total_access_attempts / dailyStats.length;
      stats.avg_weekly_access = stats.total_access_attempts / weeklyStats.length;

      // Alert totals
      stats.security_alerts = dailyStats.reduce((sum, day) => 
        sum + day.security_alerts, 0);
      stats.maintenance_alerts = dailyStats.reduce((sum, day) => 
        sum + day.maintenance_alerts, 0);
      stats.emergency_alerts = dailyStats.reduce((sum, day) => 
        sum + day.emergency_alerts, 0);
      stats.total_alerts = stats.security_alerts + 
                          stats.maintenance_alerts + 
                          stats.emergency_alerts;

      // PIN statistics
      stats.pins_generated = dailyStats.reduce((sum, day) => 
        sum + day.pins_generated, 0);
      stats.pins_used = dailyStats.reduce((sum, day) => 
        sum + day.pins_used, 0);
      stats.pin_usage_rate = stats.pins_generated > 0
        ? (stats.pins_used / stats.pins_generated * 100).toFixed(2)
        : 0;

      // Set busiest/quietest days
      stats.busiest_day_of_month = busiest.day;
      stats.quietest_day_of_month = quietest.day;
      stats.weekend_vs_weekday_ratio = weekdayAccess > 0
        ? (weekendAccess / weekdayAccess).toFixed(2)
        : 0;

      // User retention calculation
      const activeUsers = Object.keys(userLastSeen).length;
      const retainedUsers = Object.entries(userLastSeen)
        .filter(([userId, lastDate]) => {
          const daysSinceLastSeen = 
            (monthEnd - new Date(lastDate)) / (1000 * 60 * 60 * 24);
          return daysSinceLastSeen <= 7; // Active in last week of month
        }).length;

      stats.user_retention = {
        total_users: activeUsers,
        retained_users: retainedUsers,
        retention_rate: activeUsers > 0 
          ? (retainedUsers / activeUsers * 100).toFixed(2)
          : 0
      };

      // Top users
      stats.top_users = Object.entries(userAccessCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 50)
        .map(([userId, count]) => ({ user_id: userId, access_count: count }));

      // Calculate growth metrics (compare with previous month)
      const previousMonth = month === 1 ? 12 : month - 1;
      const previousYear = month === 1 ? year - 1 : year;
      
      const previousMonthStats = await this.models.MonthlyStatistics.findOne({
        where: {
          year: previousYear,
          month: previousMonth,
          building_id: buildingId
        }
      });

      if (previousMonthStats) {
        stats.access_growth_rate = previousMonthStats.total_access_attempts > 0
          ? ((stats.total_access_attempts - previousMonthStats.total_access_attempts) / 
             previousMonthStats.total_access_attempts * 100).toFixed(2)
          : 0;
        stats.user_growth_rate = previousMonthStats.unique_users > 0
          ? ((stats.unique_users - previousMonthStats.unique_users) / 
             previousMonthStats.unique_users * 100).toFixed(2)
          : 0;
      }

      // Performance metrics
      stats.avg_response_time = dailyStats.reduce((sum, day) => 
        sum + (day.avg_response_time || 0), 0) / dailyStats.length;
      stats.system_uptime_percentage = dailyStats.reduce((sum, day) => 
        sum + day.system_uptime_percentage, 0) / dailyStats.length;
      stats.total_downtime_minutes = Math.round(
        (100 - stats.system_uptime_percentage) * 43200 / 100 // Minutes in month
      );

      // Cost metrics
      stats.total_api_calls = totalApiCalls;
      stats.data_storage_mb = (stats.total_access_attempts * 0.001 + 
                               stats.total_alerts * 0.005).toFixed(2);

      // Metadata
      stats.processed_days = dailyStats.length;
      stats.processed_weeks = weeklyStats.length;
      stats.processing_time_ms = Date.now() - startTime;

      // Save or update statistics
      const [monthlyStat, created] = await this.models.MonthlyStatistics.findOrCreate({
        where: { year, month, building_id: buildingId },
        defaults: stats
      });

      if (!created) {
        await monthlyStat.update(stats);
      }

      logger.info('Monthly aggregation completed', {
        year,
        month,
        buildingId,
        processingTime: stats.processing_time_ms,
        processedDays: stats.processed_days
      });

      // Invalidate cache
      await this.invalidateCache('monthly', buildingId, new Date(year, month - 1));

      return monthlyStat;

    } catch (error) {
      logger.error('Monthly aggregation failed', {
        error: error.message,
        year,
        month,
        buildingId
      });
      throw error;
    }
  }

  /**
   * Rollup old data to save space
   */
  async rollupOldData(daysToKeep = 90) {
    try {
      logger.info('Starting data rollup', { daysToKeep });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Archive old access logs
      if (this.models.Access) {
        const archivedCount = await this.archiveOldAccessLogs(cutoffDate);
        logger.info('Archived access logs', { count: archivedCount });
      }

      // Archive old events
      if (this.models.Event) {
        const archivedCount = await this.archiveOldEvents(cutoffDate);
        logger.info('Archived events', { count: archivedCount });
      }

      // Clean up old PIN records
      if (this.models.Pin) {
        const deletedCount = await this.models.Pin.destroy({
          where: {
            expires_at: {
              [Op.lt]: cutoffDate
            },
            used_at: null
          }
        });
        logger.info('Deleted expired PINs', { count: deletedCount });
      }

      // Clean up old webhook deliveries
      if (this.models.WebhookDelivery) {
        const deletedCount = await this.models.WebhookDelivery.cleanOldDeliveries(30);
        logger.info('Cleaned webhook deliveries', { count: deletedCount });
      }

      return {
        success: true,
        cutoffDate,
        message: 'Data rollup completed'
      };

    } catch (error) {
      logger.error('Data rollup failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Archive old access logs (move to archive table or compress)
   */
  async archiveOldAccessLogs(cutoffDate) {
    // In a real implementation, this would move data to an archive table
    // or compress and store in object storage
    // For now, we'll just count the records that would be archived
    
    const count = await this.models.Access.count({
      where: {
        timestamp: {
          [Op.lt]: cutoffDate
        }
      }
    });

    // In production, you would:
    // 1. Copy records to archive table
    // 2. Compress data
    // 3. Delete original records
    // 4. Update aggregated statistics if needed

    return count;
  }

  /**
   * Archive old events
   */
  async archiveOldEvents(cutoffDate) {
    const count = await this.models.Event.count({
      where: {
        timestamp: {
          [Op.lt]: cutoffDate
        }
      }
    });

    return count;
  }

  /**
   * Get ISO week number
   */
  getISOWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * Get start of week (Monday)
   */
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  /**
   * Invalidate related cache entries
   */
  async invalidateCache(type, buildingId, date) {
    const patterns = [
      `stats:${type}:${buildingId}:*`,
      `dashboard:${buildingId}:*`,
      `reports:${buildingId}:*`
    ];

    for (const pattern of patterns) {
      await CacheService.deletePattern(pattern);
    }

    logger.debug('Cache invalidated', { type, buildingId, patterns });
  }

  /**
   * Get aggregated statistics for a date range
   */
  async getAggregatedStats(buildingId, startDate, endDate, granularity = 'daily') {
    const cacheKey = `stats:${granularity}:${buildingId}:${startDate}-${endDate}`;
    
    // Check cache first
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    let stats;
    switch (granularity) {
      case 'daily':
        stats = await this.models.DailyStatistics.getDateRange(
          buildingId, startDate, endDate
        );
        break;
      case 'weekly':
        stats = await this.models.WeeklyStatistics.findAll({
          where: {
            building_id: buildingId,
            week_start: {
              [Op.gte]: startDate,
              [Op.lte]: endDate
            }
          },
          order: [['week_start', 'ASC']]
        });
        break;
      case 'monthly':
        stats = await this.models.MonthlyStatistics.findAll({
          where: {
            building_id: buildingId,
            month_start: {
              [Op.gte]: startDate,
              [Op.lte]: endDate
            }
          },
          order: [['year', 'ASC'], ['month', 'ASC']]
        });
        break;
    }

    // Cache for 1 hour
    await CacheService.set(cacheKey, stats, 3600);

    return stats;
  }
}

// Export singleton
module.exports = new AggregationService();