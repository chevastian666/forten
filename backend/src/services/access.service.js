/**
 * Access Service
 * Handles access log queries with cursor-based pagination
 */

const { CursorPagination } = require('../utils/pagination.util');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');

class AccessService {
  constructor() {
    this.accessModel = null;
    this.sequelize = null;
  }

  /**
   * Initialize with model
   */
  initialize(accessModel, sequelize) {
    this.accessModel = accessModel;
    this.sequelize = sequelize;
    this.paginator = CursorPagination.createPaginator(accessModel, {
      order: [['access_time', 'DESC'], ['id', 'DESC']],
      cursorFields: ['id', 'access_time']
    });
  }

  /**
   * Get paginated access logs
   */
  async getAccessLogs(filters = {}, paginationParams = {}) {
    try {
      const {
        buildingId,
        userId,
        accessType,
        accessResult,
        deviceId,
        startDate,
        endDate,
        search
      } = filters;

      // Build where clause
      const where = {};

      if (buildingId) {
        where.building_id = buildingId;
      }

      if (userId) {
        where.user_id = userId;
      }

      if (accessType) {
        where.access_type = accessType;
      }

      if (accessResult) {
        where.access_result = accessResult;
      }

      if (deviceId) {
        where.device_id = deviceId;
      }

      if (startDate || endDate) {
        where.access_time = {};
        if (startDate) {
          where.access_time[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.access_time[Op.lte] = new Date(endDate);
        }
      }

      if (search) {
        where[Op.or] = [
          { person_name: { [Op.iLike]: `%${search}%` } },
          { person_document: { [Op.iLike]: `%${search}%` } },
          { access_method: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Paginate results
      const result = await this.paginator.paginate({
        where,
        ...paginationParams,
        include: [
          {
            association: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name'],
            required: false
          },
          {
            association: 'building',
            attributes: ['id', 'name', 'address']
          },
          {
            association: 'device',
            attributes: ['id', 'name', 'type', 'location'],
            required: false
          }
        ],
        mapResults: (access) => this.formatAccessLog(access)
      });

      logger.info('Access logs retrieved with pagination', {
        filters,
        resultCount: result.data.length,
        hasMore: result.metadata.hasNextPage
      });

      return result;

    } catch (error) {
      logger.error('Error getting paginated access logs', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Get access logs by person
   */
  async getAccessByPerson(personDocument, options = {}) {
    const { cursor, limit, direction } = options;
    
    return this.paginator.findPage(
      { person_document: personDocument },
      { cursor, limit, direction }
    );
  }

  /**
   * Get failed access attempts
   */
  async getFailedAccess(buildingId, options = {}) {
    const { cursor, limit = 50, timeWindow = 24 } = options;
    
    const since = new Date();
    since.setHours(since.getHours() - timeWindow);
    
    return this.paginator.findPage(
      { 
        building_id: buildingId,
        access_result: 'denied',
        access_time: { [Op.gte]: since }
      },
      { cursor, limit }
    );
  }

  /**
   * Get access logs for export using cursor pagination
   */
  async *getAccessLogsForExport(filters = {}, batchSize = 1000) {
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getAccessLogs(filters, {
        cursor,
        limit: batchSize,
        direction: 'next',
        include: [] // Minimal includes for export
      });

      yield result.data;

      cursor = result.metadata.nextCursor;
      hasMore = result.metadata.hasNextPage;
    }
  }

  /**
   * Get access frequency analysis using raw query
   */
  async getAccessFrequency(buildingId, options = {}) {
    const { 
      cursor, 
      limit = 100,
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      groupBy = 'hour'
    } = options;

    try {
      let dateFormat;
      switch (groupBy) {
        case 'hour':
          dateFormat = "DATE_TRUNC('hour', access_time)";
          break;
        case 'day':
          dateFormat = "DATE_TRUNC('day', access_time)";
          break;
        case 'week':
          dateFormat = "DATE_TRUNC('week', access_time)";
          break;
        default:
          dateFormat = "DATE_TRUNC('hour', access_time)";
      }

      const query = `
        SELECT 
          ${dateFormat} as time_bucket,
          COUNT(*) as access_count,
          COUNT(DISTINCT person_document) as unique_persons,
          COUNT(CASE WHEN access_result = 'granted' THEN 1 END) as granted_count,
          COUNT(CASE WHEN access_result = 'denied' THEN 1 END) as denied_count,
          AVG(CASE WHEN processing_time IS NOT NULL THEN processing_time END) as avg_processing_time
        FROM access_logs
        WHERE building_id = :buildingId
          AND access_time >= :startDate
          AND access_time <= :endDate
        GROUP BY time_bucket
      `;

      const result = await CursorPagination.paginateRaw(this.sequelize, query, {
        replacements: { buildingId, startDate, endDate },
        cursor,
        limit,
        orderField: 'time_bucket',
        idField: 'time_bucket',
        cursorFields: ['time_bucket']
      });

      return result;

    } catch (error) {
      logger.error('Error getting access frequency', {
        error: error.message,
        buildingId
      });
      throw error;
    }
  }

  /**
   * Get top visitors with pagination
   */
  async getTopVisitors(buildingId, options = {}) {
    const { 
      cursor, 
      limit = 50,
      startDate,
      endDate
    } = options;

    try {
      const dateCondition = this.buildDateCondition(startDate, endDate);

      const query = `
        SELECT 
          person_document,
          person_name,
          COUNT(*) as visit_count,
          MAX(access_time) as last_access,
          MIN(access_time) as first_access,
          COUNT(DISTINCT DATE(access_time)) as unique_days
        FROM access_logs
        WHERE building_id = :buildingId
          AND access_result = 'granted'
          ${dateCondition}
        GROUP BY person_document, person_name
        HAVING COUNT(*) > 1
      `;

      return await CursorPagination.paginateRaw(this.sequelize, query, {
        replacements: { buildingId, startDate, endDate },
        cursor,
        limit,
        orderField: 'visit_count',
        idField: 'person_document',
        cursorFields: ['person_document', 'visit_count']
      });

    } catch (error) {
      logger.error('Error getting top visitors', {
        error: error.message,
        buildingId
      });
      throw error;
    }
  }

  /**
   * Format access log for response
   */
  formatAccessLog(access) {
    const formatted = {
      id: access.id,
      accessTime: access.access_time,
      accessType: access.access_type,
      accessResult: access.access_result,
      accessMethod: access.access_method,
      personName: access.person_name,
      personDocument: access.person_document,
      personType: access.person_type,
      buildingId: access.building_id,
      deviceId: access.device_id,
      userId: access.user_id,
      entryPoint: access.entry_point,
      exitPoint: access.exit_point,
      duration: access.duration,
      processingTime: access.processing_time,
      metadata: access.metadata
    };

    if (access.user) {
      formatted.user = {
        id: access.user.id,
        email: access.user.email,
        name: `${access.user.first_name} ${access.user.last_name}`
      };
    }

    if (access.building) {
      formatted.building = {
        id: access.building.id,
        name: access.building.name,
        address: access.building.address
      };
    }

    if (access.device) {
      formatted.device = {
        id: access.device.id,
        name: access.device.name,
        type: access.device.type,
        location: access.device.location
      };
    }

    return formatted;
  }

  /**
   * Build date condition for raw queries
   */
  buildDateCondition(startDate, endDate) {
    if (!startDate && !endDate) {
      return '';
    }

    let conditions = [];
    if (startDate) {
      conditions.push('AND access_time >= :startDate');
    }
    if (endDate) {
      conditions.push('AND access_time <= :endDate');
    }

    return conditions.join(' ');
  }

  /**
   * Get access statistics
   */
  async getAccessStats(buildingId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const where = {};

      if (buildingId) {
        where.building_id = buildingId;
      }

      if (startDate || endDate) {
        where.access_time = {};
        if (startDate) {
          where.access_time[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.access_time[Op.lte] = new Date(endDate);
        }
      }

      // Use database aggregation
      const [stats] = await this.sequelize.query(`
        SELECT 
          COUNT(*) as total_access,
          COUNT(DISTINCT person_document) as unique_visitors,
          COUNT(CASE WHEN access_result = 'granted' THEN 1 END) as granted,
          COUNT(CASE WHEN access_result = 'denied' THEN 1 END) as denied,
          COUNT(CASE WHEN person_type = 'resident' THEN 1 END) as residents,
          COUNT(CASE WHEN person_type = 'visitor' THEN 1 END) as visitors,
          COUNT(CASE WHEN person_type = 'delivery' THEN 1 END) as deliveries,
          AVG(CASE WHEN processing_time IS NOT NULL THEN processing_time END) as avg_processing_time,
          MAX(access_time) as last_access
        FROM access_logs
        WHERE building_id = :buildingId
          ${startDate ? 'AND access_time >= :startDate' : ''}
          ${endDate ? 'AND access_time <= :endDate' : ''}
      `, {
        replacements: { buildingId, startDate, endDate },
        type: this.sequelize.QueryTypes.SELECT
      });

      return stats;

    } catch (error) {
      logger.error('Error getting access statistics', {
        error: error.message,
        buildingId
      });
      throw error;
    }
  }
}

module.exports = new AccessService();