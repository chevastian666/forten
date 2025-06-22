// JavaScript wrapper for SequelizeEventRepository
// This allows us to use the TypeScript repository from JavaScript code

const Event = require('../../../models/Event');
const Building = require('../../../models/Building');
const User = require('../../../models/User');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

class SequelizeEventRepository {
  async findById(id) {
    try {
      const event = await Event.findByPk(id, {
        include: [
          { model: Building, attributes: ['id', 'name'] },
          { model: User, attributes: ['id', 'firstName', 'lastName'] }
        ]
      });
      return event ? event.toJSON() : null;
    } catch (error) {
      console.error('Error finding event by id:', error);
      throw new Error('Failed to find event');
    }
  }

  async findAll(filters = {}, pagination = {}) {
    try {
      const where = {};
      
      if (filters.buildingId) {
        where.buildingId = filters.buildingId;
      }
      
      if (filters.type) {
        where.type = filters.type;
      }
      
      if (filters.severity) {
        where.severity = filters.severity;
      }
      
      if (filters.resolved !== undefined) {
        where.resolved = filters.resolved;
      }
      
      if (filters.startDate && filters.endDate) {
        where.createdAt = {
          [Op.between]: [filters.startDate, filters.endDate]
        };
      } else if (filters.startDate) {
        where.createdAt = {
          [Op.gte]: filters.startDate
        };
      } else if (filters.endDate) {
        where.createdAt = {
          [Op.lte]: filters.endDate
        };
      }
      
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const offset = (page - 1) * limit;
      
      const { count, rows } = await Event.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          { model: Building, attributes: ['id', 'name'] },
          { model: User, attributes: ['id', 'firstName', 'lastName'] }
        ]
      });
      
      return {
        items: rows.map(row => row.toJSON()),
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('Error finding all events:', error);
      throw new Error('Failed to find events');
    }
  }

  async create(event) {
    try {
      const created = await Event.create(event);
      const withRelations = await Event.findByPk(created.id, {
        include: [
          { model: Building, attributes: ['id', 'name'] },
          { model: User, attributes: ['id', 'firstName', 'lastName'] }
        ]
      });
      return withRelations.toJSON();
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  async update(id, event) {
    try {
      const [updatedCount] = await Event.update(event, {
        where: { id }
      });
      
      if (updatedCount === 0) {
        return null;
      }
      
      const updated = await Event.findByPk(id, {
        include: [
          { model: Building, attributes: ['id', 'name'] },
          { model: User, attributes: ['id', 'firstName', 'lastName'] }
        ]
      });
      
      return updated.toJSON();
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event');
    }
  }

  async resolve(id, userId) {
    try {
      const [updatedCount] = await Event.update({
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId
      }, {
        where: { id }
      });
      
      if (updatedCount === 0) {
        return null;
      }
      
      const resolved = await Event.findByPk(id, {
        include: [
          { model: Building, attributes: ['id', 'name'] },
          { model: User, attributes: ['id', 'firstName', 'lastName'] }
        ]
      });
      
      return resolved.toJSON();
    } catch (error) {
      console.error('Error resolving event:', error);
      throw new Error('Failed to resolve event');
    }
  }

  async getStats(buildingId) {
    try {
      const where = {};
      if (buildingId) {
        where.buildingId = buildingId;
      }
      
      // Get total events
      const totalEvents = await Event.count({ where });
      
      // Get today's events
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const todayEvents = await Event.count({
        where: {
          ...where,
          createdAt: {
            [Op.between]: [todayStart, todayEnd]
          }
        }
      });
      
      // Get unresolved events
      const unresolvedEvents = await Event.count({
        where: {
          ...where,
          resolved: false
        }
      });
      
      // Get events by type
      const eventsByType = await Event.findAll({
        where,
        attributes: [
          'type',
          [sequelize.fn('COUNT', sequelize.col('type')), 'count']
        ],
        group: ['type'],
        raw: true
      });
      
      const eventsByTypeMap = {};
      eventsByType.forEach(item => {
        eventsByTypeMap[item.type] = parseInt(item.count);
      });
      
      return {
        totalEvents,
        todayEvents,
        unresolvedEvents,
        eventsByType: eventsByTypeMap
      };
    } catch (error) {
      console.error('Error getting event stats:', error);
      throw new Error('Failed to get event stats');
    }
  }

  async findUnresolved(buildingId) {
    try {
      const where = { resolved: false };
      if (buildingId) {
        where.buildingId = buildingId;
      }
      
      const events = await Event.findAll({
        where,
        order: [['severity', 'DESC'], ['createdAt', 'DESC']],
        include: [
          { model: Building, attributes: ['id', 'name'] },
          { model: User, attributes: ['id', 'firstName', 'lastName'] }
        ]
      });
      
      return events.map(event => event.toJSON());
    } catch (error) {
      console.error('Error finding unresolved events:', error);
      throw new Error('Failed to find unresolved events');
    }
  }

  async findByBuilding(buildingId, limit) {
    try {
      const options = {
        where: { buildingId },
        order: [['createdAt', 'DESC']],
        include: [
          { model: Building, attributes: ['id', 'name'] },
          { model: User, attributes: ['id', 'firstName', 'lastName'] }
        ]
      };
      
      if (limit) {
        options.limit = limit;
      }
      
      const events = await Event.findAll(options);
      return events.map(event => event.toJSON());
    } catch (error) {
      console.error('Error finding events by building:', error);
      throw new Error('Failed to find events by building');
    }
  }

  async findByBuildingId(buildingId, options = {}) {
    return this.findByBuilding(buildingId, options.limit);
  }
}

module.exports = { SequelizeEventRepository };