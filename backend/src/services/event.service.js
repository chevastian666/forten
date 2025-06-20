/**
 * Event Service
 * Handles event queries with cursor-based pagination
 */

const { CursorPagination } = require('../utils/pagination.util');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');

class EventService {
  constructor() {
    this.eventModel = null;
  }

  /**
   * Initialize with model
   */
  initialize(eventModel) {
    this.eventModel = eventModel;
    this.paginator = CursorPagination.createPaginator(eventModel, {
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      cursorFields: ['id', 'created_at']
    });
  }

  /**
   * Get paginated events
   */
  async getEvents(filters = {}, paginationParams = {}) {
    try {
      const {
        buildingId,
        eventType,
        severity,
        startDate,
        endDate,
        userId,
        search
      } = filters;

      // Build where clause
      const where = {};

      if (buildingId) {
        where.building_id = buildingId;
      }

      if (eventType) {
        where.event_type = eventType;
      }

      if (severity) {
        where.severity = severity;
      }

      if (userId) {
        where.user_id = userId;
      }

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) {
          where.created_at[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.created_at[Op.lte] = new Date(endDate);
        }
      }

      if (search) {
        where[Op.or] = [
          { description: { [Op.iLike]: `%${search}%` } },
          { metadata: { [Op.contains]: search } }
        ];
      }

      // Paginate results
      const result = await this.paginator.paginate({
        where,
        ...paginationParams,
        include: [
          {
            association: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name']
          },
          {
            association: 'building',
            attributes: ['id', 'name', 'address']
          }
        ],
        mapResults: (event) => this.formatEvent(event)
      });

      logger.info('Events retrieved with pagination', {
        filters,
        resultCount: result.data.length,
        hasMore: result.metadata.hasNextPage
      });

      return result;

    } catch (error) {
      logger.error('Error getting paginated events', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Get events by building with pagination
   */
  async getEventsByBuilding(buildingId, options = {}) {
    const { cursor, limit, direction } = options;
    
    return this.paginator.findPage(
      { building_id: buildingId },
      { cursor, limit, direction }
    );
  }

  /**
   * Get critical events with pagination
   */
  async getCriticalEvents(options = {}) {
    const { cursor, limit = 50 } = options;
    
    return this.paginator.findPage(
      { 
        severity: { [Op.in]: ['critical', 'high'] },
        resolved: false
      },
      { 
        cursor, 
        limit,
        order: [['severity', 'DESC'], ['created_at', 'DESC'], ['id', 'DESC']]
      }
    );
  }

  /**
   * Get events for export (handles large datasets)
   */
  async *getEventsForExport(filters = {}, batchSize = 1000) {
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getEvents(filters, {
        cursor,
        limit: batchSize,
        direction: 'next'
      });

      yield result.data;

      cursor = result.metadata.nextCursor;
      hasMore = result.metadata.hasNextPage;
    }
  }

  /**
   * Format event for response
   */
  formatEvent(event) {
    const formatted = {
      id: event.id,
      eventType: event.event_type,
      severity: event.severity,
      description: event.description,
      buildingId: event.building_id,
      userId: event.user_id,
      metadata: event.metadata,
      resolved: event.resolved,
      resolvedAt: event.resolved_at,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    };

    if (event.user) {
      formatted.user = {
        id: event.user.id,
        email: event.user.email,
        name: `${event.user.first_name} ${event.user.last_name}`
      };
    }

    if (event.building) {
      formatted.building = {
        id: event.building.id,
        name: event.building.name,
        address: event.building.address
      };
    }

    return formatted;
  }

  /**
   * Get event statistics with efficient counting
   */
  async getEventStats(buildingId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const where = {};

      if (buildingId) {
        where.building_id = buildingId;
      }

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) {
          where.created_at[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.created_at[Op.lte] = new Date(endDate);
        }
      }

      // Use database aggregation for efficiency
      const stats = await this.eventModel.findAll({
        where,
        attributes: [
          'event_type',
          'severity',
          [this.eventModel.sequelize.fn('COUNT', '*'), 'count'],
          [this.eventModel.sequelize.fn('COUNT', 
            this.eventModel.sequelize.literal(
              'CASE WHEN resolved = true THEN 1 END'
            )
          ), 'resolved_count']
        ],
        group: ['event_type', 'severity'],
        raw: true
      });

      return {
        byType: this.groupByField(stats, 'event_type'),
        bySeverity: this.groupByField(stats, 'severity'),
        total: stats.reduce((sum, s) => sum + parseInt(s.count), 0),
        resolved: stats.reduce((sum, s) => sum + parseInt(s.resolved_count), 0)
      };

    } catch (error) {
      logger.error('Error getting event statistics', {
        error: error.message,
        buildingId
      });
      throw error;
    }
  }

  /**
   * Helper to group statistics by field
   */
  groupByField(stats, field) {
    return stats.reduce((acc, stat) => {
      const key = stat[field];
      if (!acc[key]) {
        acc[key] = { count: 0, resolved: 0 };
      }
      acc[key].count += parseInt(stat.count);
      acc[key].resolved += parseInt(stat.resolved_count);
      return acc;
    }, {});
  }
}

module.exports = new EventService();