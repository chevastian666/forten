// Refactored Buildings Controller following Clean Architecture principles
// This is a transitional implementation that works with the existing JavaScript setup
// while preparing for full TypeScript migration

const { Building, Event } = require('../../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// Temporary repository implementation until TypeScript is fully integrated
class BuildingRepository {
  async findAll(filters = {}, pagination = {}) {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { address: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }
    
    const { count, rows } = await Building.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    return {
      data: rows.map(building => building.toJSON()),
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  }

  async findById(id) {
    const building = await Building.findByPk(id);
    return building ? building.toJSON() : null;
  }

  async create(buildingData) {
    const building = await Building.create(buildingData);
    return building.toJSON();
  }

  async update(id, buildingData) {
    const building = await Building.findByPk(id);
    if (!building) return null;
    
    await building.update(buildingData);
    return building.toJSON();
  }
}

// Temporary event repository implementation
class EventRepository {
  async create(eventData) {
    const event = await Event.create(eventData);
    return event.toJSON();
  }

  async findByBuildingId(buildingId, options = {}) {
    const queryOptions = {
      where: { buildingId },
      order: [['createdAt', 'DESC']]
    };
    
    if (options.limit) {
      queryOptions.limit = options.limit;
    }
    
    const events = await Event.findAll(queryOptions);
    return events.map(event => event.toJSON());
  }
}

// Temporary use case implementations
class GetBuildingsUseCase {
  constructor(buildingRepository) {
    this.buildingRepository = buildingRepository;
  }

  async execute({ filters, pagination }) {
    const result = await this.buildingRepository.findAll(filters, pagination);
    return {
      buildings: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    };
  }
}

class GetBuildingByIdUseCase {
  constructor(buildingRepository, eventRepository) {
    this.buildingRepository = buildingRepository;
    this.eventRepository = eventRepository;
  }

  async execute({ id, includeEvents }) {
    const building = await this.buildingRepository.findById(id);
    if (!building) return null;
    
    const result = { building };
    
    if (includeEvents) {
      const events = await this.eventRepository.findByBuildingId(id, { limit: 10 });
      result.events = events;
    }
    
    return result;
  }
}

class CreateBuildingUseCase {
  constructor(buildingRepository, eventRepository) {
    this.buildingRepository = buildingRepository;
    this.eventRepository = eventRepository;
  }

  async execute(input) {
    const buildingData = {
      id: uuidv4(),
      name: input.name,
      address: input.address,
      city: input.city,
      country: input.country || 'Uruguay',
      status: 'prospect',
      totalUnits: input.totalUnits || 0,
      totalCameras: input.totalCameras || 0,
      postalCode: input.postalCode,
      phone: input.phone,
      email: input.email,
      notes: input.notes
    };
    
    const building = await this.buildingRepository.create(buildingData);
    
    // Create system event
    await this.eventRepository.create({
      id: uuidv4(),
      buildingId: building.id,
      userId: input.userId,
      type: 'system',
      description: `Building ${building.name} created`,
      severity: 'low',
      resolved: false,
      metadata: { action: 'building_created' }
    });
    
    return building;
  }
}

class UpdateBuildingUseCase {
  constructor(buildingRepository, eventRepository) {
    this.buildingRepository = buildingRepository;
    this.eventRepository = eventRepository;
  }

  async execute(input) {
    const existingBuilding = await this.buildingRepository.findById(input.id);
    if (!existingBuilding) return null;
    
    const previousStatus = existingBuilding.status;
    const building = await this.buildingRepository.update(input.id, input);
    
    // Create event if status changed
    if (input.status && previousStatus !== input.status) {
      await this.eventRepository.create({
        id: uuidv4(),
        buildingId: building.id,
        userId: input.userId,
        type: 'system',
        description: `Building status changed from ${previousStatus} to ${input.status}`,
        severity: 'low',
        resolved: false,
        metadata: { 
          action: 'status_change',
          previousStatus,
          newStatus: input.status
        }
      });
    }
    
    return building;
  }
}

class DeleteBuildingUseCase {
  constructor(buildingRepository, eventRepository) {
    this.buildingRepository = buildingRepository;
    this.eventRepository = eventRepository;
  }

  async execute({ id, userId }) {
    const building = await this.buildingRepository.findById(id);
    if (!building) return false;
    
    // Soft delete by setting status to inactive
    await this.buildingRepository.update(id, { status: 'inactive' });
    
    // Create deactivation event
    await this.eventRepository.create({
      id: uuidv4(),
      buildingId: id,
      userId,
      type: 'system',
      description: 'Building deactivated',
      severity: 'low',
      resolved: false,
      metadata: { action: 'building_deactivated' }
    });
    
    return true;
  }
}

class BuildingsController {
  constructor() {
    // Initialize repositories
    this.buildingRepository = new BuildingRepository();
    this.eventRepository = new EventRepository();
    
    // Initialize use cases
    this.createBuildingUseCase = new CreateBuildingUseCase(
      this.buildingRepository,
      this.eventRepository
    );
    this.getBuildingsUseCase = new GetBuildingsUseCase(this.buildingRepository);
    this.getBuildingByIdUseCase = new GetBuildingByIdUseCase(
      this.buildingRepository,
      this.eventRepository
    );
    this.updateBuildingUseCase = new UpdateBuildingUseCase(
      this.buildingRepository,
      this.eventRepository
    );
    this.deleteBuildingUseCase = new DeleteBuildingUseCase(
      this.buildingRepository,
      this.eventRepository
    );
  }

  getBuildings = async (req, res, next) => {
    try {
      const { status, search, page = 1, limit = 10 } = req.query;
      
      const filters = {};
      
      if (status) {
        filters.status = status;
      }
      
      if (search) {
        filters.search = search;
      }
      
      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit)
      };
      
      const result = await this.getBuildingsUseCase.execute({ filters, pagination });
      
      res.json({
        buildings: result.buildings,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      });
    } catch (error) {
      next(error);
    }
  };

  getBuilding = async (req, res, next) => {
    try {
      const result = await this.getBuildingByIdUseCase.execute({
        id: req.params.id,
        includeEvents: true
      });
      
      if (!result) {
        return res.status(404).json({ error: 'Building not found' });
      }
      
      // Transform to match the existing API response format
      const response = {
        ...result.building,
        Events: result.events || []
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  createBuilding = async (req, res, next) => {
    try {
      const buildingData = {
        ...req.body,
        userId: req.user.id
      };
      
      const building = await this.createBuildingUseCase.execute(buildingData);
      
      res.status(201).json(building);
    } catch (error) {
      next(error);
    }
  };

  updateBuilding = async (req, res, next) => {
    try {
      const updateData = {
        id: req.params.id,
        ...req.body,
        userId: req.user.id
      };
      
      const building = await this.updateBuildingUseCase.execute(updateData);
      
      if (!building) {
        return res.status(404).json({ error: 'Building not found' });
      }
      
      res.json(building);
    } catch (error) {
      next(error);
    }
  };

  deleteBuilding = async (req, res, next) => {
    try {
      const success = await this.deleteBuildingUseCase.execute({
        id: req.params.id,
        userId: req.user.id
      });
      
      if (!success) {
        return res.status(404).json({ error: 'Building not found' });
      }
      
      res.json({ message: 'Building deactivated successfully' });
    } catch (error) {
      next(error);
    }
  };
}

// Create singleton instance
const buildingsController = new BuildingsController();

// Export individual methods bound to the controller instance
module.exports = {
  getBuildings: buildingsController.getBuildings,
  getBuilding: buildingsController.getBuilding,
  createBuilding: buildingsController.createBuilding,
  updateBuilding: buildingsController.updateBuilding,
  deleteBuilding: buildingsController.deleteBuilding
};