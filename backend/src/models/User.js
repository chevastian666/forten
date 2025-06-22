/**
 * User Model
 * User model for authentication and audit associations
 */

const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

class User extends Model {
  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @returns {Promise<boolean>} True if password matches
   */
  async comparePassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  /**
   * Hash password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  static async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  /**
   * Get full name
   */
  get name() {
    return `${this.first_name} ${this.last_name}`;
  }

  /**
   * Soft delete the user
   */
  async softDelete() {
    return await this.destroy();
  }

  /**
   * Restore soft deleted user
   */
  async restore() {
    return await this.restore();
  }

  /**
   * Check if user is soft deleted
   */
  get isDeleted() {
    return this.deleted_at !== null;
  }
}

// Initialize the model
User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'operator', 'viewer'),
    defaultValue: 'viewer',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active',
    allowNull: false
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refresh_token: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
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
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  indexes: [
    {
      fields: ['email'],
      unique: true
    },
    {
      fields: ['role']
    },
    {
      fields: ['status']
    },
    {
      fields: ['deleted_at']
    }
  ]
});

// Hooks
User.addHook('beforeCreate', async (user) => {
  if (user.password_hash && !user.password_hash.startsWith('$2')) {
    user.password_hash = await User.hashPassword(user.password_hash);
  }
});

User.addHook('beforeUpdate', async (user) => {
  if (user.changed('password_hash') && !user.password_hash.startsWith('$2')) {
    user.password_hash = await User.hashPassword(user.password_hash);
  }
});

// Instance methods
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password_hash;
  delete values.refresh_token;
  return values;
};

// Scopes
User.addScope('withDeleted', {
  paranoid: false
});

User.addScope('onlyDeleted', {
  where: {
    deleted_at: {
      [Op.ne]: null
    }
  },
  paranoid: false
});

// Class methods
User.findWithDeleted = function(options = {}) {
  return this.scope('withDeleted').findAll(options);
};

User.findOnlyDeleted = function(options = {}) {
  return this.scope('onlyDeleted').findAll(options);
};

User.restoreById = async function(id) {
  const user = await this.findByPk(id, { paranoid: false });
  if (user && user.deleted_at) {
    return await user.restore();
  }
  throw new Error('User not found or not deleted');
};

// Associations
User.associate = (models) => {
  User.hasMany(models.AuditLog, {
    foreignKey: 'user_id',
    as: 'audit_logs'
  });
};

module.exports = User;