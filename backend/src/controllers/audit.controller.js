/**
 * Audit Controller
 * Handles audit log queries and management
 */

const AuditLog = require('../models/AuditLog');
const AuditService = require('../services/audit.service');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

class AuditController {
  /**
   * Get audit logs with pagination and filters
   * @route GET /api/audit-logs
   */
  static async getAuditLogs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        page = 1,
        limit = 50,
        userId,
        action,
        entity,
        entityId,
        startDate,
        endDate,
        status,
        ipAddress,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Build filters
      if (userId) where.user_id = userId;
      if (action) where.action = action;
      if (entity) where.entity = entity;
      if (entityId) where.entity_id = entityId;
      if (status) where.status = status;
      if (ipAddress) where.ip_address = ipAddress;

      // Date range filter
      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at[Op.gte] = new Date(startDate);
        if (endDate) where.created_at[Op.lte] = new Date(endDate);
      }

      // Execute query
      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sortBy, sortOrder]],
        include: [{
          model: require('../models/User'),
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        }]
      });

      // Log this query action
      await AuditService.logSuccess({
        userId: req.user?.id,
        action: 'VIEW_AUDIT_LOGS',
        entity: 'AUDIT_LOG',
        metadata: {
          filters: req.query,
          results_count: rows.length
        },
        request: req
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get audit log by ID
   * @route GET /api/audit-logs/:id
   */
  static async getAuditLogById(req, res) {
    try {
      const { id } = req.params;

      const auditLog = await AuditLog.findByPk(id, {
        include: [{
          model: require('../models/User'),
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        }]
      });

      if (!auditLog) {
        return res.status(404).json({
          success: false,
          message: 'Audit log not found'
        });
      }

      res.json({
        success: true,
        data: auditLog
      });
    } catch (error) {
      console.error('Error fetching audit log:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching audit log',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get audit logs for specific entity
   * @route GET /api/audit-logs/entity/:entity/:entityId
   */
  static async getEntityAuditLogs(req, res) {
    try {
      const { entity, entityId } = req.params;
      const { limit = 50 } = req.query;

      const logs = await AuditLog.getEntityLogs(entity.toUpperCase(), entityId);

      res.json({
        success: true,
        data: logs.slice(0, limit),
        total: logs.length
      });
    } catch (error) {
      console.error('Error fetching entity audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching entity audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get user activity logs
   * @route GET /api/audit-logs/user/:userId
   */
  static async getUserActivity(req, res) {
    try {
      const { userId } = req.params;
      const { days = 7 } = req.query;

      const logs = await AuditLog.getUserActivity(userId, parseInt(days));

      res.json({
        success: true,
        data: logs,
        summary: await AuditService.getUserAuditSummary(userId, parseInt(days))
      });
    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user activity',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get critical actions audit logs
   * @route GET /api/audit-logs/critical
   */
  static async getCriticalActions(req, res) {
    try {
      const logs = await AuditLog.getCriticalActions();

      // Log access to critical logs
      await AuditService.logSuccess({
        userId: req.user?.id,
        action: 'VIEW_CRITICAL_LOGS',
        entity: 'AUDIT_LOG',
        metadata: {
          logs_count: logs.length
        },
        request: req
      });

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      console.error('Error fetching critical actions:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching critical actions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get audit statistics
   * @route GET /api/audit-logs/stats
   */
  static async getAuditStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const where = {};
      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at[Op.gte] = new Date(startDate);
        if (endDate) where.created_at[Op.lte] = new Date(endDate);
      }

      // Get statistics
      const [
        totalLogs,
        successCount,
        failedCount,
        actionCounts,
        entityCounts,
        topUsers
      ] = await Promise.all([
        AuditLog.count({ where }),
        AuditLog.count({ where: { ...where, status: 'SUCCESS' } }),
        AuditLog.count({ where: { ...where, status: 'FAILED' } }),
        AuditLog.findAll({
          where,
          attributes: [
            'action',
            [require('sequelize').fn('COUNT', require('sequelize').col('action')), 'count']
          ],
          group: ['action'],
          order: [[require('sequelize').fn('COUNT', require('sequelize').col('action')), 'DESC']],
          limit: 10
        }),
        AuditLog.findAll({
          where,
          attributes: [
            'entity',
            [require('sequelize').fn('COUNT', require('sequelize').col('entity')), 'count']
          ],
          group: ['entity'],
          order: [[require('sequelize').fn('COUNT', require('sequelize').col('entity')), 'DESC']],
          limit: 10
        }),
        AuditLog.findAll({
          where: { ...where, user_id: { [Op.ne]: null } },
          attributes: [
            'user_id',
            [require('sequelize').fn('COUNT', require('sequelize').col('user_id')), 'count']
          ],
          group: ['user_id'],
          order: [[require('sequelize').fn('COUNT', require('sequelize').col('user_id')), 'DESC']],
          limit: 10,
          include: [{
            model: require('../models/User'),
            as: 'user',
            attributes: ['first_name', 'last_name', 'email']
          }]
        })
      ]);

      res.json({
        success: true,
        data: {
          summary: {
            total: totalLogs,
            success: successCount,
            failed: failedCount,
            failure_rate: totalLogs > 0 ? (failedCount / totalLogs * 100).toFixed(2) : 0
          },
          by_action: actionCounts,
          by_entity: entityCounts,
          top_users: topUsers
        }
      });
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching audit statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Export audit logs
   * @route POST /api/audit-logs/export
   */
  static async exportAuditLogs(req, res) {
    try {
      const {
        format = 'csv',
        ...filters
      } = req.body;

      // Log export action
      await AuditService.logSuccess({
        userId: req.user?.id,
        action: 'EXPORT_AUDIT_LOGS',
        entity: 'AUDIT_LOG',
        metadata: {
          format,
          filters
        },
        request: req
      });

      // Build query
      const where = {};
      if (filters.userId) where.user_id = filters.userId;
      if (filters.action) where.action = filters.action;
      if (filters.entity) where.entity = filters.entity;
      if (filters.startDate || filters.endDate) {
        where.created_at = {};
        if (filters.startDate) where.created_at[Op.gte] = new Date(filters.startDate);
        if (filters.endDate) where.created_at[Op.lte] = new Date(filters.endDate);
      }

      const logs = await AuditLog.findAll({
        where,
        order: [['created_at', 'DESC']],
        include: [{
          model: require('../models/User'),
          as: 'user',
          attributes: ['name', 'email']
        }]
      });

      // Format data based on export type
      if (format === 'csv') {
        const csv = this.generateCSV(logs);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
        res.send(csv);
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
        res.json(logs);
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid export format'
        });
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Generate CSV from audit logs
   * @param {Array} logs - Audit logs
   * @returns {string} CSV content
   */
  static generateCSV(logs) {
    const headers = [
      'ID',
      'Timestamp',
      'User',
      'Action',
      'Entity',
      'Entity ID',
      'Status',
      'IP Address',
      'Method',
      'Path'
    ];

    const rows = logs.map(log => [
      log.id,
      log.created_at,
      log.user?.email || 'System',
      log.action,
      log.entity,
      log.entity_id || '',
      log.status,
      log.ip_address || '',
      log.method || '',
      log.path || ''
    ]);

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}

module.exports = AuditController;