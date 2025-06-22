/**
 * AuditLog Model
 * Stores audit trail for all critical actions in the system
 */

const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('../config/database');

class AuditLog extends Model {
  /**
   * Create audit log entry
   * @param {Object} data - Audit log data
   * @returns {Promise<AuditLog>} Created audit log entry
   */
  static async createLog(data) {
    try {
      return await this.create(data);
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  }

  /**
   * Soft delete the audit log
   */
  async softDelete() {
    return await this.destroy();
  }

  /**
   * Restore soft deleted audit log
   */
  async restore() {
    return await this.restore();
  }

  /**
   * Check if audit log is soft deleted
   */
  get isDeleted() {
    return this.deleted_at !== null;
  }

  /**
   * Get audit logs with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Audit logs
   */
  static async getLogs(filters = {}) {
    const {
      userId,
      action,
      entity,
      entityId,
      startDate,
      endDate,
      ipAddress,
      limit = 100,
      offset = 0,
      order = [['created_at', 'DESC']]
    } = filters;

    const where = {};

    if (userId) where.user_id = userId;
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (entityId) where.entity_id = entityId;
    if (ipAddress) where.ip_address = ipAddress;

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = startDate;
      if (endDate) where.created_at[Op.lte] = endDate;
    }

    return await this.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }]
    });
  }

  /**
   * Get audit logs for specific entity
   * @param {string} entity - Entity type
   * @param {string} entityId - Entity ID
   * @returns {Promise<Array>} Audit logs for entity
   */
  static async getEntityLogs(entity, entityId) {
    return await this.findAll({
      where: {
        entity,
        entity_id: entityId
      },
      order: [['created_at', 'DESC']],
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });
  }

  /**
   * Get user activity logs
   * @param {string} userId - User ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} User activity logs
   */
  static async getUserActivity(userId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.findAll({
      where: {
        user_id: userId,
        created_at: {
          [Op.gte]: startDate
        }
      },
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Get critical actions audit logs
   * @returns {Promise<Array>} Critical action logs
   */
  static async getCriticalActions() {
    const criticalActions = [
      'DELETE',
      'ROLE_CHANGE',
      'PERMISSION_CHANGE',
      'PASSWORD_RESET',
      'USER_DEACTIVATE',
      'SECURITY_SETTINGS_CHANGE',
      'BULK_DELETE',
      'DATA_EXPORT'
    ];

    return await this.findAll({
      where: {
        action: {
          [Op.in]: criticalActions
        }
      },
      order: [['created_at', 'DESC']],
      limit: 100,
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }]
    });
  }
}

// Initialize the model
AuditLog.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true, // Can be null for system actions
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Action performed (CREATE, UPDATE, DELETE, etc.)'
  },
  entity: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Entity type (User, Building, Resident, etc.)'
  },
  entity_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID of the affected entity'
  },
  changes: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'JSON object with before and after values'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional metadata (query params, headers, etc.)'
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true,
    comment: 'IP address of the request'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User agent string'
  },
  request_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Unique request ID for correlation'
  },
  session_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User session ID'
  },
  status: {
    type: DataTypes.ENUM('SUCCESS', 'FAILED', 'ERROR'),
    defaultValue: 'SUCCESS',
    allowNull: false
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if action failed'
  },
  duration_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Request duration in milliseconds'
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'HTTP method (GET, POST, PUT, DELETE, etc.)'
  },
  path: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Request path'
  },
  query_params: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Query parameters'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete timestamp'
  }
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_logs',
  timestamps: false, // We're manually handling created_at
  deletedAt: 'deleted_at',
  paranoid: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['entity', 'entity_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['ip_address']
    },
    {
      fields: ['request_id']
    },
    {
      fields: ['status']
    },
    {
      name: 'audit_logs_entity_action_idx',
      fields: ['entity', 'action', 'created_at']
    },
    {
      fields: ['deleted_at']
    }
  ]
});

// Add instance methods
AuditLog.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // Format dates
  if (values.created_at) {
    values.created_at = values.created_at.toISOString();
  }
  
  return values;
};

// Add hooks
AuditLog.addHook('beforeCreate', (auditLog) => {
  // Ensure created_at is set
  if (!auditLog.created_at) {
    auditLog.created_at = new Date();
  }
});

// Add scopes
AuditLog.addScope('withDeleted', {
  paranoid: false
});

AuditLog.addScope('onlyDeleted', {
  where: {
    deleted_at: {
      [Op.ne]: null
    }
  },
  paranoid: false
});

// Class methods
AuditLog.findWithDeleted = function(options = {}) {
  return this.scope('withDeleted').findAll(options);
};

AuditLog.findOnlyDeleted = function(options = {}) {
  return this.scope('onlyDeleted').findAll(options);
};

AuditLog.restoreById = async function(id) {
  const log = await this.findByPk(id, { paranoid: false });
  if (log && log.deleted_at) {
    return await log.restore();
  }
  throw new Error('Audit log not found or not deleted');
};

// Add associations
AuditLog.associate = (models) => {
  AuditLog.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

module.exports = AuditLog;