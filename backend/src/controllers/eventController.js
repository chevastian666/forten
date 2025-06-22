const { Event, Building, User } = require('../models');
const { Op } = require('sequelize');
const { redisClient } = require('../config/redis');

const getEvents = async (req, res, next) => {
  try {
    const { 
      buildingId, 
      type, 
      severity, 
      resolved, 
      startDate, 
      endDate,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const where = {};
    
    if (buildingId) where.buildingId = buildingId;
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (resolved !== undefined) where.resolved = resolved === 'true';
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }
    
    const { count, rows } = await Event.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        { model: Building, attributes: ['id', 'name'] },
        { model: User, attributes: ['id', 'firstName', 'lastName'] }
      ]
    });
    
    res.json({
      events: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    next(error);
  }
};

const createEvent = async (req, res, next) => {
  try {
    const event = await Event.create({
      ...req.body,
      userId: req.user.id
    });
    
    const fullEvent = await Event.findByPk(event.id, {
      include: [
        { model: Building, attributes: ['id', 'name'] },
        { model: User, attributes: ['id', 'firstName', 'lastName'] }
      ]
    });
    
    // Publicar evento en Redis para actualizaciones en tiempo real
    if (redisClient && redisClient.isOpen) {
      await redisClient.publish('events', JSON.stringify(fullEvent));
    }
    
    res.status(201).json(fullEvent);
  } catch (error) {
    next(error);
  }
};

const resolveEvent = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event.resolved) {
      return res.status(400).json({ error: 'Event already resolved' });
    }
    
    await event.update({
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: req.user.id
    });
    
    const fullEvent = await Event.findByPk(event.id, {
      include: [
        { model: Building, attributes: ['id', 'name'] },
        { model: User, attributes: ['id', 'firstName', 'lastName'] }
      ]
    });
    
    res.json(fullEvent);
  } catch (error) {
    next(error);
  }
};

const getEventStats = async (req, res, next) => {
  try {
    const { buildingId } = req.query;
    const where = buildingId ? { buildingId } : {};
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [totalEvents, todayEvents, unresolvedEvents, eventsByType] = await Promise.all([
      Event.count({ where }),
      Event.count({ 
        where: { 
          ...where, 
          createdAt: { [Op.gte]: today } 
        } 
      }),
      Event.count({ 
        where: { 
          ...where, 
          resolved: false 
        } 
      }),
      Event.findAll({
        where,
        attributes: [
          'type',
          [Event.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['type']
      })
    ]);
    
    res.json({
      totalEvents,
      todayEvents,
      unresolvedEvents,
      eventsByType: eventsByType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.get('count'));
        return acc;
      }, {})
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  createEvent,
  resolveEvent,
  getEventStats
};