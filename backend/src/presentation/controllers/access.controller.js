// Access Controller following Clean Architecture principles
const { container } = require('../../infrastructure/container');

class AccessController {
  constructor() {
    // Get use cases from container
    this.createAccessUseCase = container.get('createAccessUseCase');
    this.validateAccessUseCase = container.get('validateAccessUseCase');
    this.getAccessesUseCase = container.get('getAccessesUseCase');
    this.getAccessByIdUseCase = container.get('getAccessByIdUseCase');
    this.updateAccessUseCase = container.get('updateAccessUseCase');
    this.deleteAccessUseCase = container.get('deleteAccessUseCase');
    this.generateAccessReportUseCase = container.get('generateAccessReportUseCase');
  }

  getAccesses = async (req, res, next) => {
    try {
      const { buildingId, type, isActive, page = 1, limit = 20 } = req.query;
      
      const filters = {};
      
      if (buildingId) filters.buildingId = buildingId;
      if (type) filters.type = type;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      
      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit)
      };
      
      const result = await this.getAccessesUseCase.execute({ filters, pagination });
      
      res.json({
        accesses: result.accesses,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      });
    } catch (error) {
      next(error);
    }
  };

  getAccessById = async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const access = await this.getAccessByIdUseCase.execute({ id });
      
      if (!access) {
        return res.status(404).json({ error: 'Access not found' });
      }
      
      res.json(access);
    } catch (error) {
      next(error);
    }
  };

  createAccess = async (req, res, next) => {
    try {
      const accessData = {
        ...req.body,
        createdBy: req.user.id
      };
      
      const access = await this.createAccessUseCase.execute(accessData);
      
      res.status(201).json(access);
    } catch (error) {
      next(error);
    }
  };

  validateAccess = async (req, res, next) => {
    try {
      const { pin, buildingId } = req.body;
      
      const result = await this.validateAccessUseCase.execute({ pin, buildingId });
      
      if (!result.valid) {
        return res.status(401).json(result);
      }
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  updateAccess = async (req, res, next) => {
    try {
      const updateData = {
        id: req.params.id,
        ...req.body,
        userId: req.user.id
      };
      
      const access = await this.updateAccessUseCase.execute(updateData);
      
      if (!access) {
        return res.status(404).json({ error: 'Access not found' });
      }
      
      res.json(access);
    } catch (error) {
      next(error);
    }
  };

  deleteAccess = async (req, res, next) => {
    try {
      const success = await this.deleteAccessUseCase.execute({
        id: req.params.id,
        userId: req.user.id
      });
      
      if (!success) {
        return res.status(404).json({ error: 'Access not found' });
      }
      
      res.json({ message: 'Access deactivated successfully' });
    } catch (error) {
      next(error);
    }
  };

  generateReport = async (req, res, next) => {
    try {
      const { buildingId, startDate, endDate } = req.query;
      
      const input = {};
      
      if (buildingId) input.buildingId = buildingId;
      if (startDate) input.startDate = new Date(startDate);
      if (endDate) input.endDate = new Date(endDate);
      
      const report = await this.generateAccessReportUseCase.execute(input);
      
      res.json(report);
    } catch (error) {
      next(error);
    }
  };
}

// Create singleton instance
const accessController = new AccessController();

// Export individual methods bound to the controller instance
module.exports = {
  getAccesses: accessController.getAccesses,
  getAccessById: accessController.getAccessById,
  createAccess: accessController.createAccess,
  validateAccess: accessController.validateAccess,
  updateAccess: accessController.updateAccess,
  deleteAccess: accessController.deleteAccess,
  generateReport: accessController.generateReport
};