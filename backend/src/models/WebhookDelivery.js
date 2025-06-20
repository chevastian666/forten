/**
 * Webhook Delivery Model
 * Database model for tracking webhook delivery attempts
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WebhookDelivery = sequelize.define('WebhookDelivery', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  webhook_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'webhooks',
      key: 'id'
    }
  },
  event_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'ID of the event that triggered this delivery'
  },
  event_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Type of event'
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Event payload sent'
  },
  attempt_count: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed', 'retrying'),
    defaultValue: 'pending',
    allowNull: false
  },
  http_status: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'HTTP response status code'
  },
  response_headers: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Response headers received'
  },
  response_body: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Response body (truncated)'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if failed'
  },
  duration_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Request duration in milliseconds'
  },
  next_retry_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When to retry next'
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When successfully delivered'
  },
  signature: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'HMAC signature sent'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete timestamp'
  }
}, {
  tableName: 'webhook_deliveries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  indexes: [
    {
      fields: ['webhook_id']
    },
    {
      fields: ['event_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['next_retry_at'],
      where: {
        status: 'retrying'
      }
    },
    {
      fields: ['deleted_at']
    }
  ]
});

// Associations will be set up in models/index.js
WebhookDelivery.associate = function(models) {
  WebhookDelivery.belongsTo(models.Webhook, {
    foreignKey: 'webhook_id',
    as: 'webhook'
  });
};

// Instance methods
WebhookDelivery.prototype.markSuccess = function(response, duration) {
  this.status = 'success';
  this.http_status = response.status;
  this.response_headers = response.headers;
  this.response_body = response.data ? JSON.stringify(response.data).substring(0, 1000) : null;
  this.duration_ms = duration;
  this.delivered_at = new Date();
  this.next_retry_at = null;
  return this.save();
};

WebhookDelivery.prototype.markFailure = function(error, duration) {
  this.status = 'failed';
  this.error_message = error.message;
  this.duration_ms = duration;
  
  if (error.response) {
    this.http_status = error.response.status;
    this.response_headers = error.response.headers;
    this.response_body = error.response.data ? JSON.stringify(error.response.data).substring(0, 1000) : null;
  }
  
  return this.save();
};

WebhookDelivery.prototype.scheduleRetry = function(retryConfig) {
  this.status = 'retrying';
  this.attempt_count += 1;
  
  // Calculate next retry time with exponential backoff
  const delay = Math.min(
    retryConfig.initial_delay * Math.pow(retryConfig.backoff_multiplier, this.attempt_count - 1),
    retryConfig.max_delay
  );
  
  this.next_retry_at = new Date(Date.now() + delay);
  return this.save();
};

WebhookDelivery.prototype.softDelete = async function() {
  return await this.destroy();
};

WebhookDelivery.prototype.restore = async function() {
  return await this.restore();
};

WebhookDelivery.prototype.isDeleted = function() {
  return this.deleted_at !== null;
};

// Class methods
WebhookDelivery.getPendingRetries = async function() {
  return WebhookDelivery.findAll({
    where: {
      status: 'retrying',
      next_retry_at: {
        [sequelize.Op.lte]: new Date()
      }
    },
    include: [{
      model: sequelize.models.Webhook,
      as: 'webhook',
      where: { is_active: true }
    }],
    order: [['next_retry_at', 'ASC']]
  });
};

WebhookDelivery.cleanOldDeliveries = async function(daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  return WebhookDelivery.destroy({
    where: {
      created_at: {
        [sequelize.Op.lt]: cutoffDate
      },
      status: {
        [sequelize.Op.in]: ['success', 'failed']
      }
    }
  });
};

// Soft delete scopes and methods
WebhookDelivery.addScope('withDeleted', {
  paranoid: false
});

WebhookDelivery.addScope('onlyDeleted', {
  where: {
    deleted_at: {
      [sequelize.Op.ne]: null
    }
  },
  paranoid: false
});

WebhookDelivery.findWithDeleted = function(options = {}) {
  return this.scope('withDeleted').findAll(options);
};

WebhookDelivery.findOnlyDeleted = function(options = {}) {
  return this.scope('onlyDeleted').findAll(options);
};

WebhookDelivery.restoreById = async function(id) {
  const delivery = await this.findByPk(id, { paranoid: false });
  if (delivery && delivery.deleted_at) {
    return await delivery.restore();
  }
  throw new Error('Webhook delivery not found or not deleted');
};

module.exports = WebhookDelivery;