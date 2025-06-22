/**
 * Webhook Model
 * Database model for webhook subscriptions and delivery tracking
 */

const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

const Webhook = sequelize.define('Webhook', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Webhook subscription name'
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      isUrl: true
    },
    comment: 'Webhook endpoint URL'
  },
  secret: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Secret key for HMAC signature'
  },
  events: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of event types to subscribe to',
    validate: {
      isValidEvents(value) {
        if (!Array.isArray(value)) {
          throw new Error('Events must be an array');
        }
        const validEvents = [
          'building.alarm',
          'building.access_granted',
          'building.access_denied',
          'device.online',
          'device.offline',
          'device.error',
          'alert.security',
          'alert.maintenance',
          'user.login',
          'user.logout',
          'visitor.registered',
          'visitor.checkin',
          'visitor.checkout',
          'emergency.triggered',
          'system.error'
        ];
        value.forEach(event => {
          if (!validEvents.includes(event)) {
            throw new Error(`Invalid event type: ${event}`);
          }
        });
      }
    }
  },
  filters: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional filters (e.g., building_ids, severity levels)'
  },
  headers: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Custom headers to include in webhook requests'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether webhook is active'
  },
  retry_config: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      max_retries: 3,
      initial_delay: 1000,
      max_delay: 60000,
      backoff_multiplier: 2
    },
    comment: 'Retry configuration'
  },
  timeout: {
    type: DataTypes.INTEGER,
    defaultValue: 30000,
    allowNull: false,
    comment: 'Request timeout in milliseconds'
  },
  max_payload_size: {
    type: DataTypes.INTEGER,
    defaultValue: 1048576, // 1MB
    allowNull: false,
    comment: 'Maximum payload size in bytes'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional metadata'
  },
  // Stats
  total_deliveries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  successful_deliveries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  failed_deliveries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  last_delivery_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_success_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_failure_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  consecutive_failures: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  // Ownership
  user_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'User who created this webhook'
  },
  building_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Building scope (null for all buildings)'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete timestamp'
  }
}, {
  tableName: 'webhooks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  indexes: [
    {
      fields: ['is_active']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['building_id']
    },
    {
      fields: ['events'],
      using: 'GIN'
    },
    {
      fields: ['deleted_at']
    }
  ]
});

// Instance methods
Webhook.prototype.incrementDeliveryStats = function(success) {
  this.total_deliveries += 1;
  this.last_delivery_at = new Date();
  
  if (success) {
    this.successful_deliveries += 1;
    this.last_success_at = new Date();
    this.consecutive_failures = 0;
    this.last_error = null;
  } else {
    this.failed_deliveries += 1;
    this.last_failure_at = new Date();
    this.consecutive_failures += 1;
  }
  
  return this.save();
};

Webhook.prototype.shouldDisable = function() {
  // Disable after 10 consecutive failures
  return this.consecutive_failures >= 10;
};

Webhook.prototype.softDelete = async function() {
  return await this.destroy();
};

Webhook.prototype.restore = async function() {
  return await this.restore();
};

Webhook.prototype.isDeleted = function() {
  return this.deleted_at !== null;
};

Webhook.prototype.matchesEvent = function(eventType, eventData = {}) {
  // Check if webhook subscribes to this event
  if (!this.events.includes(eventType) && !this.events.includes('*')) {
    return false;
  }
  
  // Check filters
  if (this.filters && Object.keys(this.filters).length > 0) {
    // Building filter
    if (this.filters.building_ids && eventData.building_id) {
      if (!this.filters.building_ids.includes(eventData.building_id)) {
        return false;
      }
    }
    
    // Severity filter
    if (this.filters.severity_levels && eventData.severity) {
      if (!this.filters.severity_levels.includes(eventData.severity)) {
        return false;
      }
    }
    
    // Time window filter
    if (this.filters.time_window) {
      const now = new Date();
      const hour = now.getHours();
      const { start_hour, end_hour } = this.filters.time_window;
      
      if (start_hour <= end_hour) {
        if (hour < start_hour || hour > end_hour) {
          return false;
        }
      } else {
        // Handles overnight windows (e.g., 22:00 - 06:00)
        if (hour < start_hour && hour > end_hour) {
          return false;
        }
      }
    }
  }
  
  return true;
};

// Class methods
Webhook.getActiveWebhooksForEvent = async function(eventType, eventData = {}) {
  const webhooks = await Webhook.findAll({
    where: {
      is_active: true,
      events: {
        [Op.contains]: [eventType]
      }
    }
  });
  
  // Filter by additional criteria
  return webhooks.filter(webhook => webhook.matchesEvent(eventType, eventData));
};

// Soft delete scopes and methods
Webhook.addScope('withDeleted', {
  paranoid: false
});

Webhook.addScope('onlyDeleted', {
  where: {
    deleted_at: {
      [Op.ne]: null
    }
  },
  paranoid: false
});

Webhook.findWithDeleted = function(options = {}) {
  return this.scope('withDeleted').findAll(options);
};

Webhook.findOnlyDeleted = function(options = {}) {
  return this.scope('onlyDeleted').findAll(options);
};

Webhook.restoreById = async function(id) {
  const webhook = await this.findByPk(id, { paranoid: false });
  if (webhook && webhook.deleted_at) {
    return await webhook.restore();
  }
  throw new Error('Webhook not found or not deleted');
};

module.exports = Webhook;