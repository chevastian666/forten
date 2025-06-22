import { Request, Response, NextFunction } from 'express';
import { GeneratePINUseCase } from '../../application/use-cases/GeneratePINUseCase';
import { ValidateAccessUseCase } from '../../application/use-cases/ValidateAccessUseCase';
import { IAccessRepository } from '../../domain/repositories/IAccessRepository';
import { AccessType, AccessStatus } from '../../domain/value-objects/AccessEnums';
import { ILogger } from '../../application/services/ILogger';

export class AccessController {
  constructor(
    private readonly generatePINUseCase: GeneratePINUseCase,
    private readonly validateAccessUseCase: ValidateAccessUseCase,
    private readonly accessRepository: IAccessRepository,
    private readonly logger: ILogger
  ) {}

  async generatePIN(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id || req.body.userId;
      const result = await this.generatePINUseCase.execute({
        ...req.body,
        userId,
        createdBy: req.user?.id || 'system'
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async validateAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.validateAccessUseCase.execute(req.body);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async createAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // This would use a CreateAccessUseCase
      res.status(501).json({
        success: false,
        error: 'Not implemented'
      });
    } catch (error) {
      next(error);
    }
  }

  async getAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const access = await this.accessRepository.findById(req.params.id);
      
      if (!access) {
        res.status(404).json({
          success: false,
          error: 'Access not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: access.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const access = await this.accessRepository.findById(req.params.id);
      
      if (!access) {
        res.status(404).json({
          success: false,
          error: 'Access not found'
        });
        return;
      }

      // Update access properties based on request body
      if (req.body.validFrom) {
        access.updateValidityPeriod(new Date(req.body.validFrom), req.body.validUntil ? new Date(req.body.validUntil) : undefined);
      }

      if (req.body.doorIds) {
        // Update door IDs logic
      }

      const updated = await this.accessRepository.update(access);

      res.status(200).json({
        success: true,
        data: updated.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  async suspendAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const access = await this.accessRepository.findById(req.params.id);
      
      if (!access) {
        res.status(404).json({
          success: false,
          error: 'Access not found'
        });
        return;
      }

      access.suspend();
      await this.accessRepository.update(access);

      res.status(200).json({
        success: true,
        message: 'Access suspended successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async revokeAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const access = await this.accessRepository.findById(req.params.id);
      
      if (!access) {
        res.status(404).json({
          success: false,
          error: 'Access not found'
        });
        return;
      }

      access.revoke();
      await this.accessRepository.update(access);

      res.status(200).json({
        success: true,
        message: 'Access revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async reactivateAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const access = await this.accessRepository.findById(req.params.id);
      
      if (!access) {
        res.status(404).json({
          success: false,
          error: 'Access not found'
        });
        return;
      }

      access.activate();
      await this.accessRepository.update(access);

      res.status(200).json({
        success: true,
        message: 'Access reactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserAccesses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accesses = await this.accessRepository.findByUserId(req.params.userId);

      res.status(200).json({
        success: true,
        data: accesses.map(a => a.toJSON())
      });
    } catch (error) {
      next(error);
    }
  }

  async getBuildingAccesses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accesses = await this.accessRepository.findByBuildingId(req.params.buildingId);

      res.status(200).json({
        success: true,
        data: accesses.map(a => a.toJSON())
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkSuspend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accessIds } = req.body;
      await this.accessRepository.bulkUpdateStatus(accessIds, AccessStatus.SUSPENDED);

      res.status(200).json({
        success: true,
        message: `${accessIds.length} accesses suspended successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkRevoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accessIds } = req.body;
      await this.accessRepository.bulkUpdateStatus(accessIds, AccessStatus.REVOKED);

      res.status(200).json({
        success: true,
        message: `${accessIds.length} accesses revoked successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  async getAccessStatsByStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const buildingId = req.query.buildingId as string;
      const stats = await this.accessRepository.countByStatus(buildingId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async getAccessStatsByType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const buildingId = req.query.buildingId as string;
      const stats = await this.accessRepository.countByType(buildingId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}