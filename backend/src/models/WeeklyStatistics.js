/**
 * Weekly Statistics Model
 * Stores pre-calculated weekly statistics for fast reporting
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WeeklyStatistics = sequelize.define('WeeklyStatistics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  week_start: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Start date of the week (Monday)'
  },
  week_end: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'End date of the week (Sunday)'
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Year number'
  },
  week_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ISO week number'
  },
  building_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Building these stats belong to'
  },
  
  // Aggregated Access Statistics
  total_access_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  successful_access: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  failed_access: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  unique_users: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  unique_visitors: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Weekly Averages
  avg_daily_access: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Average accesses per day'
  },
  avg_devices_online: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Average devices online'
  },
  avg_response_time: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Average response time in ms'
  },
  
  // Alert Totals
  total_alerts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  security_alerts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  maintenance_alerts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // PIN Statistics
  pins_generated: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  pins_used: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  pin_usage_rate: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Percentage of generated PINs that were used'
  },
  
  // Trends
  access_trend: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Percentage change from previous week'
  },
  alert_trend: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Alert trend compared to previous week'
  },
  
  // Patterns
  busiest_day: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Day with most activity'
  },
  busiest_hour: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Most active hour across the week'
  },
  
  // Aggregated JSON Data
  daily_summary: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Summary by day of week'
  },
  hourly_heatmap: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Activity heatmap by hour and day'
  },
  top_users: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Top 20 users by access count'
  },
  device_availability: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Device uptime statistics'
  },
  
  // Performance
  system_uptime_percentage: {
    type: DataTypes.FLOAT,
    defaultValue: 100
  },
  total_downtime_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Metadata
  processed_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of daily records processed'
  },
  processing_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete timestamp'
  }
}, {
  tableName: 'weekly_statistics',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['week_start', 'building_id']
    },
    {
      fields: ['year', 'week_number']
    },
    {
      fields: ['building_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['deleted_at']
    }
  ]
});

// Class methods
WeeklyStatistics.getByWeekNumber = async function(year, weekNumber, buildingId = null) {
  const where = { year, week_number: weekNumber };
  if (buildingId) where.building_id = buildingId;
  
  return this.findAll({ where });
};

WeeklyStatistics.getLatest = async function(buildingId, weeks = 12) {
  return this.findAll({
    where: { building_id: buildingId },
    order: [['week_start', 'DESC']],
    limit: weeks
  });
};

// Soft delete methods
WeeklyStatistics.prototype.softDelete = async function() {
  return await this.destroy();
};

WeeklyStatistics.prototype.restore = async function() {
  return await this.restore();
};

WeeklyStatistics.prototype.isDeleted = function() {
  return this.deleted_at !== null;
};

// Scopes
WeeklyStatistics.addScope('withDeleted', {
  paranoid: false
});

WeeklyStatistics.addScope('onlyDeleted', {
  where: {
    deleted_at: {
      [require('sequelize').Op.ne]: null
    }
  },
  paranoid: false
});

WeeklyStatistics.findWithDeleted = function(options = {}) {
  return this.scope('withDeleted').findAll(options);
};

WeeklyStatistics.findOnlyDeleted = function(options = {}) {
  return this.scope('onlyDeleted').findAll(options);
};

WeeklyStatistics.restoreById = async function(id) {
  const stat = await this.findByPk(id, { paranoid: false });
  if (stat && stat.deleted_at) {
    return await stat.restore();
  }
  throw new Error('Weekly statistic not found or not deleted');
};

module.exports = WeeklyStatistics;