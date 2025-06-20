import { Request, Response } from 'express';
import { IBuildingRepository } from '../../domain/repositories/IBuildingRepository';
import { CreateBuildingDto, UpdateBuildingDto, BuildingStatus } from '../../domain/entities/Building';
import { ValidationService } from '../middleware/ValidationService';
import { Logger } from '../../utils/Logger';

export class BuildingController {
  constructor(
    private buildingRepository: IBuildingRepository,
    private validationService: ValidationService,
    private logger: Logger
  ) {}

  async createBuilding(req: Request, res: Response): Promise<void> {
    try {
      const buildingData: CreateBuildingDto = req.body;

      // Validate input
      const validationResult = this.validationService.validateCreateBuilding(buildingData);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.errors
        });
        return;
      }

      const building = await this.buildingRepository.create(buildingData);

      this.logger.info(`Building created via API: ${building.id}`);
      res.status(201).json({
        success: true,
        data: building
      });
    } catch (error) {
      this.logger.error(`Failed to create building: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to create building',
        error: error.message
      });
    }
  }

  async getBuilding(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const building = await this.buildingRepository.findById(id);
      if (!building) {
        res.status(404).json({
          success: false,
          message: 'Building not found'
        });
        return;
      }

      res.json({
        success: true,
        data: building
      });
    } catch (error) {
      this.logger.error(`Failed to get building: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to get building',
        error: error.message
      });
    }
  }

  async getBuildings(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const managerId = req.query.managerId as string;

      let result;
      if (managerId) {
        const buildings = await this.buildingRepository.findByManagerId(managerId);
        result = {
          buildings,
          total: buildings.length
        };
      } else {
        result = await this.buildingRepository.findAll(page, limit);
      }

      res.json({
        success: true,
        data: result.buildings,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      this.logger.error(`Failed to get buildings: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to get buildings',
        error: error.message
      });
    }
  }

  async updateBuilding(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates: UpdateBuildingDto = req.body;

      // Validate input
      const validationResult = this.validationService.validateUpdateBuilding(updates);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.errors
        });
        return;
      }

      const building = await this.buildingRepository.update(id, updates);
      if (!building) {
        res.status(404).json({
          success: false,
          message: 'Building not found'
        });
        return;
      }

      this.logger.info(`Building updated via API: ${id}`);
      res.json({
        success: true,
        data: building
      });
    } catch (error) {
      this.logger.error(`Failed to update building: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to update building',
        error: error.message
      });
    }
  }

  async deleteBuilding(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await this.buildingRepository.delete(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Building not found'
        });
        return;
      }

      this.logger.info(`Building deleted via API: ${id}`);
      res.json({
        success: true,
        message: 'Building deleted successfully'
      });
    } catch (error) {
      this.logger.error(`Failed to delete building: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to delete building',
        error: error.message
      });
    }
  }

  async updateBuildingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(BuildingStatus).includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid building status'
        });
        return;
      }

      const updated = await this.buildingRepository.updateStatus(id, status);
      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Building not found'
        });
        return;
      }

      this.logger.info(`Building status updated via API: ${id} -> ${status}`);
      res.json({
        success: true,
        message: 'Building status updated successfully'
      });
    } catch (error) {
      this.logger.error(`Failed to update building status: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to update building status',
        error: error.message
      });
    }
  }

  async getBuildingsByLocation(req: Request, res: Response): Promise<void> {
    try {
      const latitude = parseFloat(req.query.latitude as string);
      const longitude = parseFloat(req.query.longitude as string);
      const radius = parseFloat(req.query.radius as string) || 10; // Default 10km

      if (isNaN(latitude) || isNaN(longitude)) {
        res.status(400).json({
          success: false,
          message: 'Valid latitude and longitude are required'
        });
        return;
      }

      const buildings = await this.buildingRepository.findByLocation(latitude, longitude, radius);

      res.json({
        success: true,
        data: buildings,
        query: {
          latitude,
          longitude,
          radius
        }
      });
    } catch (error) {
      this.logger.error(`Failed to get buildings by location: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to get buildings by location',
        error: error.message
      });
    }
  }

  async getBuildingStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const building = await this.buildingRepository.findById(id);
      if (!building) {
        res.status(404).json({
          success: false,
          message: 'Building not found'
        });
        return;
      }

      // This would typically aggregate data from cameras, devices, events, etc.
      const stats = {
        totalCameras: building.totalCameras,
        totalDevices: building.totalDevices,
        status: building.status,
        lastUpdated: building.updatedAt
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      this.logger.error(`Failed to get building stats: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to get building stats',
        error: error.message
      });
    }
  }
}