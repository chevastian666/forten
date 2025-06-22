/**
 * Daily Statistics Model
 * Stores pre-calculated daily statistics for fast reporting
 */

const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

const DailyStatistics = sequelize.define('DailyStatistics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date for these statistics'
  },
  building_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Building these stats belong to'
  },
  
  // Access Statistics
  total_access_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total access attempts for the day'
  },
  successful_access: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of successful accesses'
  },
  failed_access: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of failed access attempts'
  },
  unique_users: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of unique users who accessed'
  },
  unique_visitors: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of unique visitors'
  },
  
  // Device Statistics
  devices_online: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Average devices online during the day'
  },
  device_errors: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total device errors'
  },
  
  // Alert Statistics
  security_alerts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of security alerts'
  },
  maintenance_alerts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of maintenance alerts'
  },
  emergency_alerts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of emergency alerts'
  },
  
  // PIN Statistics
  pins_generated: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of PINs generated'
  },
  pins_used: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of PINs used'
  },
  pins_expired: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of PINs that expired'
  },
  
  // Time-based Patterns
  peak_hour: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Hour with most activity (0-23)'
  },
  peak_hour_access_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of accesses during peak hour'
  },
  
  // Performance Metrics
  avg_response_time: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Average system response time in ms'
  },
  system_uptime_percentage: {
    type: DataTypes.FLOAT,
    defaultValue: 100,
    comment: 'System uptime percentage for the day'
  },
  
  // Aggregated JSON Data
  hourly_distribution: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Access count by hour {0: count, 1: count, ...}'
  },
  access_methods: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Access by method {card: count, pin: count, ...}'
  },
  top_users: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Top 10 users by access count'
  },
  device_status_summary: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Device status counts {online: count, offline: count}'
  },
  
  // Metadata
  processed_records: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of records processed for this aggregation'
  },
  processing_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time taken to process in milliseconds'
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Schema version for this record'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete timestamp'
  }
}, {
  tableName: 'daily_statistics',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['date', 'building_id']
    },
    {
      fields: ['date']
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
DailyStatistics.getDateRange = async function(buildingId, startDate, endDate) {
  return this.findAll({
    where: {
      building_id: buildingId,
      date: {
        [Op.between]: [startDate, endDate]
      }
    },
    order: [['date', 'ASC']]
  });
};

DailyStatistics.getLatest = async function(buildingId, days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.getDateRange(buildingId, startDate, endDate);
};

// Soft delete methods
DailyStatistics.prototype.softDelete = async function() {
  return await this.destroy();
};

DailyStatistics.prototype.restore = async function() {
  return await this.restore();
};

DailyStatistics.prototype.isDeleted = function() {
  return this.deleted_at !== null;
};

// Scopes
DailyStatistics.addScope('withDeleted', {
  paranoid: false
});

DailyStatistics.addScope('onlyDeleted', {
  where: {
    deleted_at: {
      [Op.ne]: null
    }
  },
  paranoid: false
});

DailyStatistics.findWithDeleted = function(options = {}) {
  return this.scope('withDeleted').findAll(options);
};

DailyStatistics.findOnlyDeleted = function(options = {}) {
  return this.scope('onlyDeleted').findAll(options);
};

DailyStatistics.restoreById = async function(id) {
  const stat = await this.findByPk(id, { paranoid: false });
  if (stat && stat.deleted_at) {
    return await stat.restore();
  }
  throw new Error('Daily statistic not found or not deleted');
};

module.exports = DailyStatistics;