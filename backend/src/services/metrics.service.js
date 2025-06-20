/**
 * Metrics Service
 * Real-time KPI calculation service for dashboard using PostgreSQL aggregations
 * Stores results in Redis with 30-second updates
 */

const { sequelize } = require('../models');
const CacheService = require('./cache.service');
const { QueryTypes } = require('sequelize');

// Metrics update interval (30 seconds)
const METRICS_UPDATE_INTERVAL = 30 * 1000;

// Cache keys for different metrics
const METRICS_CACHE_KEYS = {
  DASHBOARD_OVERVIEW: 'metrics:dashboard:overview',
  EVENTS_HOURLY: 'metrics:events:hourly',
  ACCESS_DAILY: 'metrics:access:daily',
  ALERTS_ACTIVE: 'metrics:alerts:active',
  DEVICES_STATUS: 'metrics:devices:status',
  COMPARISONS: 'metrics:comparisons',
  REAL_TIME: 'metrics:realtime'
};

class MetricsService {
  constructor() {
    this.updateTimer = null;
    this.isUpdating = false;
    this.lastUpdate = null;
  }

  /**
   * Start automatic metrics updates
   */
  startAutoUpdate() {
    if (this.updateTimer) {
      console.log('⚠️  Metrics auto-update already running');
      return;
    }

    console.log('🚀 Starting metrics auto-update service...');
    
    // Initial update
    this.updateAllMetrics().catch(error => {
      console.error('Initial metrics update failed:', error);
    });

    // Schedule periodic updates
    this.updateTimer = setInterval(async () => {
      try {
        await this.updateAllMetrics();
      } catch (error) {
        console.error('Scheduled metrics update failed:', error);
      }
    }, METRICS_UPDATE_INTERVAL);

    console.log(`✅ Metrics auto-update started (interval: ${METRICS_UPDATE_INTERVAL}ms)`);
  }

  /**
   * Stop automatic metrics updates
   */
  stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      console.log('🛑 Metrics auto-update stopped');
    }
  }

  /**
   * Update all metrics and store in cache
   */
  async updateAllMetrics() {
    if (this.isUpdating) {
      console.log('⏳ Metrics update already in progress, skipping...');
      return;
    }

    this.isUpdating = true;
    const startTime = Date.now();

    try {
      console.log('🔄 Updating dashboard metrics...');

      // Parallelize all metrics calculations
      const [
        dashboardOverview,
        eventsHourly,
        accessDaily,
        alertsActive,
        devicesStatus,
        comparisons
      ] = await Promise.all([
        this.calculateDashboardOverview(),
        this.calculateEventsHourly(),
        this.calculateAccessDaily(),
        this.calculateActiveAlerts(),
        this.calculateDevicesStatus(),
        this.calculateComparisons()
      ]);

      // Store all metrics in cache
      await Promise.all([
        CacheService.set(METRICS_CACHE_KEYS.DASHBOARD_OVERVIEW, dashboardOverview, CacheService.TTL.METRICS),
        CacheService.set(METRICS_CACHE_KEYS.EVENTS_HOURLY, eventsHourly, CacheService.TTL.METRICS),
        CacheService.set(METRICS_CACHE_KEYS.ACCESS_DAILY, accessDaily, CacheService.TTL.METRICS),
        CacheService.set(METRICS_CACHE_KEYS.ALERTS_ACTIVE, alertsActive, CacheService.TTL.METRICS),
        CacheService.set(METRICS_CACHE_KEYS.DEVICES_STATUS, devicesStatus, CacheService.TTL.METRICS),
        CacheService.set(METRICS_CACHE_KEYS.COMPARISONS, comparisons, CacheService.TTL.METRICS)
      ]);

      // Store combined real-time metrics
      const realTimeMetrics = {
        overview: dashboardOverview,
        events: eventsHourly,
        access: accessDaily,
        alerts: alertsActive,
        devices: devicesStatus,
        comparisons: comparisons,
        lastUpdate: new Date().toISOString(),
        updateDuration: Date.now() - startTime
      };

      await CacheService.set(METRICS_CACHE_KEYS.REAL_TIME, realTimeMetrics, CacheService.TTL.METRICS);

      this.lastUpdate = new Date();
      const duration = Date.now() - startTime;
      
      console.log(`✅ Metrics updated successfully in ${duration}ms`);

    } catch (error) {
      console.error('❌ Failed to update metrics:', error);
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Calculate dashboard overview metrics
   */
  async calculateDashboardOverview() {
    const query = `
      WITH today_stats AS (
        SELECT 
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as events_today,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE AND status = 'active' THEN 1 END) as active_events_today,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE AND priority = 'high' THEN 1 END) as high_priority_today
        FROM events
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      ),
      access_stats AS (
        SELECT 
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as access_today,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE AND status = 'granted' THEN 1 END) as access_granted_today,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE AND status = 'denied' THEN 1 END) as access_denied_today
        FROM accesses
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      ),
      user_stats AS (
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as new_users_today
        FROM users
      ),
      building_stats AS (
        SELECT 
          COUNT(*) as total_buildings,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_buildings
        FROM buildings
      )
      SELECT 
        e.events_today,
        e.active_events_today,
        e.high_priority_today,
        a.access_today,
        a.access_granted_today,
        a.access_denied_today,
        u.total_users,
        u.active_users,
        u.new_users_today,
        b.total_buildings,
        b.active_buildings,
        ROUND((a.access_granted_today::numeric / NULLIF(a.access_today, 0) * 100), 2) as access_success_rate
      FROM today_stats e
      CROSS JOIN access_stats a
      CROSS JOIN user_stats u
      CROSS JOIN building_stats b;
    `;

    const [result] = await sequelize.query(query, { type: QueryTypes.SELECT });
    
    return {
      events: {
        total: parseInt(result.events_today) || 0,
        active: parseInt(result.active_events_today) || 0,
        highPriority: parseInt(result.high_priority_today) || 0
      },
      access: {
        total: parseInt(result.access_today) || 0,
        granted: parseInt(result.access_granted_today) || 0,
        denied: parseInt(result.access_denied_today) || 0,
        successRate: parseFloat(result.access_success_rate) || 0
      },
      users: {
        total: parseInt(result.total_users) || 0,
        active: parseInt(result.active_users) || 0,
        newToday: parseInt(result.new_users_today) || 0
      },
      buildings: {
        total: parseInt(result.total_buildings) || 0,
        active: parseInt(result.active_buildings) || 0
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate events per hour for the last 24 hours
   */
  async calculateEventsHourly() {
    const query = `
      WITH hour_series AS (
        SELECT generate_series(
          date_trunc('hour', NOW() - INTERVAL '23 hours'),
          date_trunc('hour', NOW()),
          INTERVAL '1 hour'
        ) as hour
      )
      SELECT 
        hs.hour,
        COALESCE(COUNT(e.id), 0) as event_count,
        COALESCE(COUNT(CASE WHEN e.priority = 'high' THEN 1 END), 0) as high_priority_count,
        COALESCE(COUNT(CASE WHEN e.status = 'resolved' THEN 1 END), 0) as resolved_count
      FROM hour_series hs
      LEFT JOIN events e ON date_trunc('hour', e.created_at) = hs.hour
      GROUP BY hs.hour
      ORDER BY hs.hour;
    `;

    const results = await sequelize.query(query, { type: QueryTypes.SELECT });
    
    return {
      data: results.map(row => ({
        hour: row.hour,
        total: parseInt(row.event_count),
        highPriority: parseInt(row.high_priority_count),
        resolved: parseInt(row.resolved_count),
        timestamp: new Date(row.hour).toISOString()
      })),
      summary: {
        totalEvents: results.reduce((sum, row) => sum + parseInt(row.event_count), 0),
        totalHighPriority: results.reduce((sum, row) => sum + parseInt(row.high_priority_count), 0),
        totalResolved: results.reduce((sum, row) => sum + parseInt(row.resolved_count), 0),
        averagePerHour: Math.round(results.reduce((sum, row) => sum + parseInt(row.event_count), 0) / 24)
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate daily access patterns for the last 7 days
   */
  async calculateAccessDaily() {
    const query = `
      WITH day_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date as day
      )
      SELECT 
        ds.day,
        COALESCE(COUNT(a.id), 0) as total_access,
        COALESCE(COUNT(CASE WHEN a.status = 'granted' THEN 1 END), 0) as granted_access,
        COALESCE(COUNT(CASE WHEN a.status = 'denied' THEN 1 END), 0) as denied_access,
        COALESCE(COUNT(CASE WHEN a.method = 'pin' THEN 1 END), 0) as pin_access,
        COALESCE(COUNT(CASE WHEN a.method = 'card' THEN 1 END), 0) as card_access,
        COALESCE(COUNT(DISTINCT a.user_id), 0) as unique_users
      FROM day_series ds
      LEFT JOIN accesses a ON DATE(a.created_at) = ds.day
      GROUP BY ds.day
      ORDER BY ds.day;
    `;

    const results = await sequelize.query(query, { type: QueryTypes.SELECT });
    
    return {
      data: results.map(row => ({
        date: row.day,
        total: parseInt(row.total_access),
        granted: parseInt(row.granted_access),
        denied: parseInt(row.denied_access),
        byMethod: {
          pin: parseInt(row.pin_access),
          card: parseInt(row.card_access)
        },
        uniqueUsers: parseInt(row.unique_users),
        successRate: row.total_access > 0 ? 
          Math.round((row.granted_access / row.total_access) * 100) : 0
      })),
      summary: {
        totalAccess: results.reduce((sum, row) => sum + parseInt(row.total_access), 0),
        totalGranted: results.reduce((sum, row) => sum + parseInt(row.granted_access), 0),
        totalDenied: results.reduce((sum, row) => sum + parseInt(row.denied_access), 0),
        averageDaily: Math.round(results.reduce((sum, row) => sum + parseInt(row.total_access), 0) / 7)
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate active alerts and their distribution
   */
  async calculateActiveAlerts() {
    const query = `
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority,
        COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
        COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_priority,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_alerts,
        COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) as acknowledged_alerts,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as new_last_hour,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_last_24h,
        AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at))/60) as avg_resolution_time_minutes
      FROM events 
      WHERE status IN ('active', 'acknowledged', 'investigating')
        AND created_at >= NOW() - INTERVAL '30 days';
    `;

    const [result] = await sequelize.query(query, { type: QueryTypes.SELECT });
    
    // Get alert distribution by building
    const buildingQuery = `
      SELECT 
        b.name as building_name,
        b.id as building_id,
        COUNT(e.id) as alert_count,
        COUNT(CASE WHEN e.priority IN ('high', 'critical') THEN 1 END) as critical_count
      FROM buildings b
      LEFT JOIN events e ON e.building_id = b.id 
        AND e.status IN ('active', 'acknowledged') 
        AND e.created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY b.id, b.name
      ORDER BY alert_count DESC
      LIMIT 10;
    `;

    const buildingResults = await sequelize.query(buildingQuery, { type: QueryTypes.SELECT });
    
    return {
      summary: {
        total: parseInt(result.total_alerts) || 0,
        active: parseInt(result.active_alerts) || 0,
        acknowledged: parseInt(result.acknowledged_alerts) || 0,
        newLastHour: parseInt(result.new_last_hour) || 0,
        newLast24h: parseInt(result.new_last_24h) || 0,
        avgResolutionTime: parseFloat(result.avg_resolution_time_minutes) || 0
      },
      byPriority: {
        low: parseInt(result.low_priority) || 0,
        medium: parseInt(result.medium_priority) || 0,
        high: parseInt(result.high_priority) || 0,
        critical: parseInt(result.critical_priority) || 0
      },
      byBuilding: buildingResults.map(row => ({
        buildingId: row.building_id,
        buildingName: row.building_name,
        alertCount: parseInt(row.alert_count),
        criticalCount: parseInt(row.critical_count)
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate devices status and connectivity
   */
  async calculateDevicesStatus() {
    // Simulate device status - in real implementation, this would query actual device tables
    const query = `
      WITH device_stats AS (
        SELECT 
          COUNT(*) as total_devices,
          COUNT(CASE WHEN last_seen >= NOW() - INTERVAL '5 minutes' THEN 1 END) as online_devices,
          COUNT(CASE WHEN last_seen < NOW() - INTERVAL '5 minutes' AND last_seen >= NOW() - INTERVAL '1 hour' THEN 1 END) as offline_devices,
          COUNT(CASE WHEN last_seen < NOW() - INTERVAL '1 hour' OR last_seen IS NULL THEN 1 END) as disconnected_devices
        FROM (
          -- Simulated device data - replace with actual device tables
          SELECT 
            'camera_' || generate_series(1, 15) as device_id,
            'camera' as device_type,
            NOW() - (random() * INTERVAL '2 hours') as last_seen
          UNION ALL
          SELECT 
            'access_' || generate_series(1, 8) as device_id,
            'access_control' as device_type,
            NOW() - (random() * INTERVAL '30 minutes') as last_seen
          UNION ALL
          SELECT 
            'sensor_' || generate_series(1, 25) as device_id,
            'sensor' as device_type,
            NOW() - (random() * INTERVAL '45 minutes') as last_seen
        ) devices
      )
      SELECT 
        total_devices,
        online_devices,
        offline_devices,
        disconnected_devices,
        ROUND((online_devices::numeric / total_devices * 100), 2) as online_percentage
      FROM device_stats;
    `;

    const [result] = await sequelize.query(query, { type: QueryTypes.SELECT });
    
    return {
      summary: {
        total: parseInt(result.total_devices) || 0,
        online: parseInt(result.online_devices) || 0,
        offline: parseInt(result.offline_devices) || 0,
        disconnected: parseInt(result.disconnected_devices) || 0,
        onlinePercentage: parseFloat(result.online_percentage) || 0
      },
      byType: {
        cameras: {
          total: 15,
          online: Math.floor(Math.random() * 3) + 13, // Simulate 13-15 online
          offline: Math.floor(Math.random() * 2)
        },
        accessControl: {
          total: 8,
          online: Math.floor(Math.random() * 2) + 7, // Simulate 7-8 online
          offline: Math.floor(Math.random() * 1)
        },
        sensors: {
          total: 25,
          online: Math.floor(Math.random() * 5) + 22, // Simulate 22-25 online
          offline: Math.floor(Math.random() * 3)
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate comparisons with previous day
   */
  async calculateComparisons() {
    const query = `
      WITH today_stats AS (
        SELECT 
          COUNT(CASE WHEN e.created_at >= CURRENT_DATE THEN 1 END) as events_today,
          COUNT(CASE WHEN a.created_at >= CURRENT_DATE THEN 1 END) as access_today,
          COUNT(CASE WHEN e.created_at >= CURRENT_DATE AND e.priority = 'high' THEN 1 END) as alerts_today
        FROM events e
        FULL OUTER JOIN accesses a ON DATE(e.created_at) = DATE(a.created_at)
        WHERE e.created_at >= CURRENT_DATE - INTERVAL '1 day' 
           OR a.created_at >= CURRENT_DATE - INTERVAL '1 day'
      ),
      yesterday_stats AS (
        SELECT 
          COUNT(CASE WHEN e.created_at >= CURRENT_DATE - INTERVAL '1 day' 
                     AND e.created_at < CURRENT_DATE THEN 1 END) as events_yesterday,
          COUNT(CASE WHEN a.created_at >= CURRENT_DATE - INTERVAL '1 day' 
                     AND a.created_at < CURRENT_DATE THEN 1 END) as access_yesterday,
          COUNT(CASE WHEN e.created_at >= CURRENT_DATE - INTERVAL '1 day' 
                     AND e.created_at < CURRENT_DATE 
                     AND e.priority = 'high' THEN 1 END) as alerts_yesterday
        FROM events e
        FULL OUTER JOIN accesses a ON DATE(e.created_at) = DATE(a.created_at)
        WHERE e.created_at >= CURRENT_DATE - INTERVAL '2 days' 
           OR a.created_at >= CURRENT_DATE - INTERVAL '2 days'
      )
      SELECT 
        t.events_today,
        t.access_today,
        t.alerts_today,
        y.events_yesterday,
        y.access_yesterday,
        y.alerts_yesterday,
        CASE 
          WHEN y.events_yesterday > 0 THEN 
            ROUND(((t.events_today - y.events_yesterday)::numeric / y.events_yesterday * 100), 2)
          ELSE 0 
        END as events_change_percent,
        CASE 
          WHEN y.access_yesterday > 0 THEN 
            ROUND(((t.access_today - y.access_yesterday)::numeric / y.access_yesterday * 100), 2)
          ELSE 0 
        END as access_change_percent,
        CASE 
          WHEN y.alerts_yesterday > 0 THEN 
            ROUND(((t.alerts_today - y.alerts_yesterday)::numeric / y.alerts_yesterday * 100), 2)
          ELSE 0 
        END as alerts_change_percent
      FROM today_stats t
      CROSS JOIN yesterday_stats y;
    `;

    const [result] = await sequelize.query(query, { type: QueryTypes.SELECT });
    
    return {
      events: {
        today: parseInt(result.events_today) || 0,
        yesterday: parseInt(result.events_yesterday) || 0,
        change: parseFloat(result.events_change_percent) || 0,
        trend: parseFloat(result.events_change_percent) > 0 ? 'up' : 
               parseFloat(result.events_change_percent) < 0 ? 'down' : 'stable'
      },
      access: {
        today: parseInt(result.access_today) || 0,
        yesterday: parseInt(result.access_yesterday) || 0,
        change: parseFloat(result.access_change_percent) || 0,
        trend: parseFloat(result.access_change_percent) > 0 ? 'up' : 
               parseFloat(result.access_change_percent) < 0 ? 'down' : 'stable'
      },
      alerts: {
        today: parseInt(result.alerts_today) || 0,
        yesterday: parseInt(result.alerts_yesterday) || 0,
        change: parseFloat(result.alerts_change_percent) || 0,
        trend: parseFloat(result.alerts_change_percent) > 0 ? 'up' : 
               parseFloat(result.alerts_change_percent) < 0 ? 'down' : 'stable'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get cached metrics
   */
  async getCachedMetrics(type = 'all') {
    try {
      switch (type) {
        case 'overview':
          return await CacheService.get(METRICS_CACHE_KEYS.DASHBOARD_OVERVIEW);
        case 'events':
          return await CacheService.get(METRICS_CACHE_KEYS.EVENTS_HOURLY);
        case 'access':
          return await CacheService.get(METRICS_CACHE_KEYS.ACCESS_DAILY);
        case 'alerts':
          return await CacheService.get(METRICS_CACHE_KEYS.ALERTS_ACTIVE);
        case 'devices':
          return await CacheService.get(METRICS_CACHE_KEYS.DEVICES_STATUS);
        case 'comparisons':
          return await CacheService.get(METRICS_CACHE_KEYS.COMPARISONS);
        case 'realtime':
        case 'all':
        default:
          return await CacheService.get(METRICS_CACHE_KEYS.REAL_TIME);
      }
    } catch (error) {
      console.error(`Error getting cached metrics for ${type}:`, error);
      return null;
    }
  }

  /**
   * Force metrics update
   */
  async forceUpdate() {
    console.log('🔄 Forcing metrics update...');
    return await this.updateAllMetrics();
  }

  /**
   * Get metrics service status
   */
  getStatus() {
    return {
      isRunning: this.updateTimer !== null,
      isUpdating: this.isUpdating,
      lastUpdate: this.lastUpdate,
      updateInterval: METRICS_UPDATE_INTERVAL,
      cacheKeys: Object.values(METRICS_CACHE_KEYS)
    };
  }

  /**
   * Get metrics health check
   */
  async healthCheck() {
    try {
      const realTimeMetrics = await this.getCachedMetrics('realtime');
      const isHealthy = realTimeMetrics && 
                       realTimeMetrics.lastUpdate && 
                       (Date.now() - new Date(realTimeMetrics.lastUpdate).getTime()) < (METRICS_UPDATE_INTERVAL * 3);

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        lastUpdate: this.lastUpdate,
        cacheStatus: realTimeMetrics ? 'available' : 'empty',
        isAutoUpdateRunning: this.updateTimer !== null,
        message: isHealthy ? 'Metrics service is operational' : 'Metrics may be stale'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        isAutoUpdateRunning: this.updateTimer !== null
      };
    }
  }
}

// Create singleton instance
const metricsService = new MetricsService();

module.exports = metricsService;