/**
 * Create Audit Logs Table Migration
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Action performed (CREATE, UPDATE, DELETE, etc.)'
      },
      entity: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Entity type (User, Building, Resident, etc.)'
      },
      entity_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID of the affected entity'
      },
      changes: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'JSON object with before and after values'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional metadata (query params, headers, etc.)'
      },
      ip_address: {
        type: Sequelize.INET,
        allowNull: true,
        comment: 'IP address of the request'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User agent string'
      },
      request_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Unique request ID for correlation'
      },
      session_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'User session ID'
      },
      status: {
        type: Sequelize.ENUM('SUCCESS', 'FAILED', 'ERROR'),
        defaultValue: 'SUCCESS',
        allowNull: false
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if action failed'
      },
      duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Request duration in milliseconds'
      },
      method: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'HTTP method (GET, POST, PUT, DELETE, etc.)'
      },
      path: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Request path'
      },
      query_params: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Query parameters'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['entity', 'entity_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
    await queryInterface.addIndex('audit_logs', ['ip_address']);
    await queryInterface.addIndex('audit_logs', ['request_id']);
    await queryInterface.addIndex('audit_logs', ['status']);
    await queryInterface.addIndex('audit_logs', ['entity', 'action', 'created_at'], {
      name: 'audit_logs_entity_action_created_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('audit_logs');
  }
};