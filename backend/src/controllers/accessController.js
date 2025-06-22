const { Access, Building, Event } = require('../models');
const { Op } = require('sequelize');

const generatePin = async () => {
  let pin;
  let exists = true;
  
  while (exists) {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = await Access.findOne({ where: { pin } });
    exists = !!existing;
  }
  
  return pin;
};

const getAccesses = async (req, res, next) => {
  try {
    const { buildingId, type, isActive, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (buildingId) where.buildingId = buildingId;
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const { count, rows } = await Access.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        { model: Building, attributes: ['id', 'name'] }
      ]
    });
    
    res.json({
      accesses: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    next(error);
  }
};

const createAccess = async (req, res, next) => {
  try {
    const pin = await generatePin();
    
    const access = await Access.create({
      ...req.body,
      pin,
      createdBy: req.user.id
    });
    
    await Event.create({
      buildingId: access.buildingId,
      userId: req.user.id,
      type: 'system',
      description: `Access PIN created for ${access.name}`,
      metadata: {
        action: 'access_created',
        accessId: access.id,
        type: access.type
      }
    });
    
    const fullAccess = await Access.findByPk(access.id, {
      include: [{ model: Building, attributes: ['id', 'name'] }]
    });
    
    res.status(201).json(fullAccess);
  } catch (error) {
    next(error);
  }
};

const validateAccess = async (req, res, next) => {
  try {
    const { pin } = req.body;
    
    const access = await Access.findOne({ 
      where: { pin },
      include: [{ model: Building, attributes: ['id', 'name'] }]
    });
    
    if (!access) {
      await Event.create({
        buildingId: req.body.buildingId,
        type: 'access_denied',
        description: 'Invalid PIN attempted',
        metadata: { pin },
        severity: 'medium'
      });
      
      return res.status(401).json({ 
        valid: false, 
        error: 'Invalid PIN' 
      });
    }
    
    if (!access.isValid()) {
      await Event.create({
        buildingId: access.buildingId,
        type: 'access_denied',
        description: `Expired or inactive PIN used by ${access.name}`,
        metadata: { 
          accessId: access.id,
          reason: !access.isActive ? 'inactive' : 'expired'
        },
        severity: 'low'
      });
      
      return res.status(401).json({ 
        valid: false, 
        error: 'PIN expired or inactive' 
      });
    }
    
    // Incrementar uso
    access.currentUses += 1;
    await access.save();
    
    await Event.create({
      buildingId: access.buildingId,
      type: 'access_granted',
      description: `Access granted to ${access.name}`,
      metadata: {
        accessId: access.id,
        currentUses: access.currentUses,
        maxUses: access.maxUses
      }
    });
    
    res.json({ 
      valid: true,
      access: {
        name: access.name,
        type: access.type,
        remainingUses: access.maxUses - access.currentUses
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateAccess = async (req, res, next) => {
  try {
    const access = await Access.findByPk(req.params.id);
    
    if (!access) {
      return res.status(404).json({ error: 'Access not found' });
    }
    
    await access.update(req.body);
    
    await Event.create({
      buildingId: access.buildingId,
      userId: req.user.id,
      type: 'system',
      description: `Access updated for ${access.name}`,
      metadata: { 
        accessId: access.id,
        updates: Object.keys(req.body)
      }
    });
    
    res.json(access);
  } catch (error) {
    next(error);
  }
};

const deleteAccess = async (req, res, next) => {
  try {
    const access = await Access.findByPk(req.params.id);
    
    if (!access) {
      return res.status(404).json({ error: 'Access not found' });
    }
    
    await access.update({ isActive: false });
    
    await Event.create({
      buildingId: access.buildingId,
      userId: req.user.id,
      type: 'system',
      description: `Access deactivated for ${access.name}`,
      metadata: { accessId: access.id }
    });
    
    res.json({ message: 'Access deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAccesses,
  createAccess,
  validateAccess,
  updateAccess,
  deleteAccess
};