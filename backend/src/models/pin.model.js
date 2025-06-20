/**
 * PIN Model
 * Database model for secure PIN storage and management
 */

module.exports = (sequelize, DataTypes) => {
  const Pin = sequelize.define('Pin', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    pin_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Bcrypt hash of the PIN'
    },
    building_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Building this PIN is valid for'
    },
    user_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'User who created or owns this PIN'
    },
    purpose: {
      type: DataTypes.ENUM(
        'access',
        'temporary_access',
        'delivery',
        'emergency',
        'maintenance',
        'visitor',
        'contractor',
        'special_event'
      ),
      defaultValue: 'access',
      allowNull: false,
      comment: 'Purpose of the PIN'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'PIN expiration timestamp'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether PIN is currently active'
    },
    usage_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of times PIN has been used'
    },
    max_usage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum allowed uses (null = unlimited)'
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time PIN was used'
    },
    last_used_by: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Device or location where PIN was last used'
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional JSON metadata',
      get() {
        const rawValue = this.getDataValue('metadata');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('metadata', JSON.stringify(value));
      }
    },
    allowed_areas: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of allowed access areas',
      get() {
        const rawValue = this.getDataValue('allowed_areas');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('allowed_areas', JSON.stringify(value));
      }
    },
    allowed_time_slots: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of allowed time slots',
      get() {
        const rawValue = this.getDataValue('allowed_time_slots');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('allowed_time_slots', JSON.stringify(value));
      }
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When PIN was revoked'
    },
    revoked_by: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'User who revoked the PIN'
    },
    revoke_reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Reason for revocation'
    },
    created_by: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'User who created the PIN'
    }
  }, {
    tableName: 'pins',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['building_id', 'is_active']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['purpose']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['created_at']
      }
    ],
    hooks: {
      beforeCreate: (pin) => {
        // Ensure expiration is in the future
        if (pin.expires_at <= new Date()) {
          throw new Error('PIN expiration must be in the future');
        }
      },
      beforeUpdate: (pin) => {
        // Check if usage limit exceeded
        if (pin.max_usage && pin.usage_count >= pin.max_usage) {
          pin.is_active = false;
        }
      }
    }
  });

  Pin.associate = function(models) {
    // Add associations here if needed
    // e.g., Pin.belongsTo(models.User, { foreignKey: 'user_id' });
    // e.g., Pin.belongsTo(models.Building, { foreignKey: 'building_id' });
  };

  // Instance methods
  Pin.prototype.isValid = function() {
    return this.is_active && 
           this.expires_at > new Date() &&
           (!this.max_usage || this.usage_count < this.max_usage);
  };

  Pin.prototype.incrementUsage = async function(usedBy = null) {
    this.usage_count += 1;
    this.last_used_at = new Date();
    if (usedBy) {
      this.last_used_by = usedBy;
    }
    
    // Check if usage limit reached
    if (this.max_usage && this.usage_count >= this.max_usage) {
      this.is_active = false;
    }
    
    return this.save();
  };

  Pin.prototype.revoke = async function(revokedBy, reason = null) {
    this.is_active = false;
    this.revoked_at = new Date();
    this.revoked_by = revokedBy;
    if (reason) {
      this.revoke_reason = reason;
    }
    return this.save();
  };

  // Class methods
  Pin.cleanExpired = async function() {
    return Pin.update(
      { is_active: false },
      {
        where: {
          is_active: true,
          expires_at: { [sequelize.Op.lt]: new Date() }
        }
      }
    );
  };

  Pin.getActiveCount = async function(buildingId) {
    return Pin.count({
      where: {
        building_id: buildingId,
        is_active: true,
        expires_at: { [sequelize.Op.gt]: new Date() }
      }
    });
  };

  return Pin;
};