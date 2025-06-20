/**
 * Monthly Statistics Model
 * Stores pre-calculated monthly statistics for fast reporting
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MonthlyStatistics = sequelize.define('MonthlyStatistics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Month number (1-12)'
  },
  month_start: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  month_end: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  building_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  
  // Monthly Totals
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
  new_users: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'First-time users this month'
  },
  
  // Monthly Averages
  avg_daily_access: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  avg_weekly_access: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  avg_devices_online: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  avg_response_time: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  
  // Alert Summary
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
  emergency_alerts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // PIN Summary
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
    defaultValue: 0
  },
  
  // Growth Metrics
  access_growth_rate: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Percentage change from previous month'
  },
  user_growth_rate: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'User growth compared to previous month'
  },
  
  // Cost & Efficiency
  total_api_calls: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_webhook_deliveries: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  data_storage_mb: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Estimated data storage used'
  },
  
  // Patterns
  busiest_day_of_month: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  quietest_day_of_month: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  weekend_vs_weekday_ratio: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Ratio of weekend to weekday activity'
  },
  
  // Aggregated JSON Data
  weekly_summary: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Summary by week of month'
  },
  daily_distribution: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Access count by day of month'
  },
  user_retention: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'User retention metrics'
  },
  top_users: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Top 50 users by access count'
  },
  access_methods_breakdown: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Detailed breakdown of access methods'
  },
  alert_categories: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Alert counts by category and severity'
  },
  
  // Performance & Reliability
  system_uptime_percentage: {
    type: DataTypes.FLOAT,
    defaultValue: 100
  },
  total_downtime_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  incidents_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of system incidents'
  },
  
  // Metadata
  processed_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  processed_weeks: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  processing_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
}, {
  tableName: 'monthly_statistics',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['year', 'month', 'building_id']
    },
    {
      fields: ['year', 'month']
    },
    {
      fields: ['building_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Class methods
MonthlyStatistics.getByYearMonth = async function(year, month, buildingId = null) {
  const where = { year, month };
  if (buildingId) where.building_id = buildingId;
  
  return this.findAll({ where });
};

MonthlyStatistics.getYearSummary = async function(year, buildingId) {
  return this.findAll({
    where: { year, building_id: buildingId },
    order: [['month', 'ASC']]
  });
};

MonthlyStatistics.getLatest = async function(buildingId, months = 12) {
  return this.findAll({
    where: { building_id: buildingId },
    order: [['year', 'DESC'], ['month', 'DESC']],
    limit: months
  });
};

module.exports = MonthlyStatistics;