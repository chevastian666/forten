const { Building, Event } = require('../models');
const { Op } = require('sequelize');

const getBuildings = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Building.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      buildings: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    next(error);
  }
};

const getBuilding = async (req, res, next) => {
  try {
    const building = await Building.findByPk(req.params.id, {
      include: [
        {
          model: Event,
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });
    
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }
    
    res.json(building);
  } catch (error) {
    next(error);
  }
};

const createBuilding = async (req, res, next) => {
  try {
    const building = await Building.create(req.body);
    
    await Event.create({
      buildingId: building.id,
      userId: req.user.id,
      type: 'system',
      description: `Building ${building.name} created`,
      metadata: { action: 'building_created' }
    });
    
    res.status(201).json(building);
  } catch (error) {
    next(error);
  }
};

const updateBuilding = async (req, res, next) => {
  try {
    const building = await Building.findByPk(req.params.id);
    
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }
    
    const previousStatus = building.status;
    await building.update(req.body);
    
    if (previousStatus !== building.status) {
      await Event.create({
        buildingId: building.id,
        userId: req.user.id,
        type: 'system',
        description: `Building status changed from ${previousStatus} to ${building.status}`,
        metadata: { 
          action: 'status_change',
          previousStatus,
          newStatus: building.status
        }
      });
    }
    
    res.json(building);
  } catch (error) {
    next(error);
  }
};

const deleteBuilding = async (req, res, next) => {
  try {
    const building = await Building.findByPk(req.params.id);
    
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }
    
    await building.update({ status: 'inactive' });
    
    await Event.create({
      buildingId: building.id,
      userId: req.user.id,
      type: 'system',
      description: 'Building deactivated',
      metadata: { action: 'building_deactivated' }
    });
    
    res.json({ message: 'Building deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBuildings,
  getBuilding,
  createBuilding,
  updateBuilding,
  deleteBuilding
};