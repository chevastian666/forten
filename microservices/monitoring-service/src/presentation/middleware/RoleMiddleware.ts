import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/Logger';

export class RoleMiddleware {
  constructor(private logger: Logger) {}

  requireRoles = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userRole = req.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        this.logger.warn(`Access denied for user ${req.user.id} with role ${userRole}. Required roles: ${allowedRoles.join(', ')}`);
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: allowedRoles,
          current: userRole
        });
        return;
      }

      next();
    };
  };

  requireAnyRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userRole = req.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        this.logger.warn(`Access denied for user ${req.user.id} with role ${userRole}. Required any of: ${allowedRoles.join(', ')}`);
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          requiredAny: allowedRoles,
          current: userRole
        });
        return;
      }

      next();
    };
  };

  requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (req.user.role !== 'admin') {
      this.logger.warn(`Admin access denied for user ${req.user.id} with role ${req.user.role}`);
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    next();
  };

  requireManagerOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const allowedRoles = ['admin', 'manager'];
    if (!allowedRoles.includes(req.user.role)) {
      this.logger.warn(`Manager/Admin access denied for user ${req.user.id} with role ${req.user.role}`);
      res.status(403).json({
        success: false,
        message: 'Manager or Admin access required'
      });
      return;
    }

    next();
  };

  requireBuildingAccess = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Admin has access to all buildings
    if (req.user.role === 'admin') {
      next();
      return;
    }

    const buildingId = req.params.buildingId || req.query.buildingId || req.body.buildingId;
    
    if (!buildingId) {
      res.status(400).json({
        success: false,
        message: 'Building ID required'
      });
      return;
    }

    if (!req.user.buildingIds.includes(buildingId as string)) {
      this.logger.warn(`Building access denied for user ${req.user.id} to building ${buildingId}`);
      res.status(403).json({
        success: false,
        message: 'Access denied to this building'
      });
      return;
    }

    next();
  };

  checkResourceOwnership = (resourceField: string = 'userId') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Admin can access all resources
      if (req.user.role === 'admin') {
        next();
        return;
      }

      const resourceOwnerId = req.params[resourceField] || req.body[resourceField];
      
      if (resourceOwnerId !== req.user.id) {
        this.logger.warn(`Resource ownership check failed for user ${req.user.id} accessing resource owned by ${resourceOwnerId}`);
        res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
        return;
      }

      next();
    };
  };

  roleHierarchy = {
    'admin': 100,
    'manager': 80,
    'operator': 60,
    'viewer': 40,
    'guest': 20
  };

  requireMinimumRole = (minimumRole: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userRoleLevel = this.roleHierarchy[req.user.role as keyof typeof this.roleHierarchy] || 0;
      const minimumRoleLevel = this.roleHierarchy[minimumRole as keyof typeof this.roleHierarchy] || 0;

      if (userRoleLevel < minimumRoleLevel) {
        this.logger.warn(`Minimum role check failed for user ${req.user.id} with role ${req.user.role}. Required minimum: ${minimumRole}`);
        res.status(403).json({
          success: false,
          message: 'Insufficient role level',
          required: minimumRole,
          current: req.user.role
        });
        return;
      }

      next();
    };
  };
}