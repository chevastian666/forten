import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/Logger';

export class PermissionMiddleware {
  constructor(private logger: Logger) {}

  requirePermissions = (requiredPermissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Admin has all permissions
      if (req.user.role === 'admin') {
        next();
        return;
      }

      const userPermissions = req.user.permissions || [];
      const missingPermissions = requiredPermissions.filter(
        permission => !userPermissions.includes(permission)
      );

      if (missingPermissions.length > 0) {
        this.logger.warn(`Permission check failed for user ${req.user.id}. Missing permissions: ${missingPermissions.join(', ')}`);
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: requiredPermissions,
          missing: missingPermissions
        });
        return;
      }

      next();
    };
  };

  requireAnyPermission = (permissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Admin has all permissions
      if (req.user.role === 'admin') {
        next();
        return;
      }

      const userPermissions = req.user.permissions || [];
      const hasAnyPermission = permissions.some(
        permission => userPermissions.includes(permission)
      );

      if (!hasAnyPermission) {
        this.logger.warn(`Permission check failed for user ${req.user.id}. Required any of: ${permissions.join(', ')}`);
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          requiredAny: permissions,
          current: userPermissions
        });
        return;
      }

      next();
    };
  };

  hasPermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Admin has all permissions
      if (req.user.role === 'admin') {
        next();
        return;
      }

      const userPermissions = req.user.permissions || [];
      
      if (!userPermissions.includes(permission)) {
        this.logger.warn(`Permission denied for user ${req.user.id}. Required: ${permission}`);
        res.status(403).json({
          success: false,
          message: 'Permission denied',
          required: permission
        });
        return;
      }

      next();
    };
  };

  // Camera-specific permissions
  canViewCamera = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('camera:view')(req, res, next);
  };

  canControlCamera = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('camera:control')(req, res, next);
  };

  canStreamCamera = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('camera:stream')(req, res, next);
  };

  canManageCamera = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('camera:manage')(req, res, next);
  };

  // Device-specific permissions
  canViewDevice = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('device:view')(req, res, next);
  };

  canControlDevice = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('device:control')(req, res, next);
  };

  canManageDevice = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('device:manage')(req, res, next);
  };

  // Door-specific permissions
  canViewDoor = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('door:view')(req, res, next);
  };

  canControlDoor = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('door:control')(req, res, next);
  };

  canManageDoor = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('door:manage')(req, res, next);
  };

  // Alert and event permissions
  canViewAlerts = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('alert:view')(req, res, next);
  };

  canAcknowledgeAlerts = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('alert:acknowledge')(req, res, next);
  };

  canManageAlerts = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('alert:manage')(req, res, next);
  };

  canViewEvents = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('event:view')(req, res, next);
  };

  canAcknowledgeEvents = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('event:acknowledge')(req, res, next);
  };

  canManageEvents = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('event:manage')(req, res, next);
  };

  // Building permissions
  canViewBuilding = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('building:view')(req, res, next);
  };

  canManageBuilding = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('building:manage')(req, res, next);
  };

  // System permissions
  canViewSystem = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('system:view')(req, res, next);
  };

  canManageSystem = (req: Request, res: Response, next: NextFunction): void => {
    this.hasPermission('system:manage')(req, res, next);
  };

  // Dynamic permission checking based on resource
  checkResourcePermission = (resource: string, action: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const permission = `${resource}:${action}`;
      this.hasPermission(permission)(req, res, next);
    };
  };

  // Permission groups for easier management
  requireCameraAccess = this.requireAnyPermission([
    'camera:view',
    'camera:stream',
    'camera:control',
    'camera:manage'
  ]);

  requireDeviceAccess = this.requireAnyPermission([
    'device:view',
    'device:control',
    'device:manage'
  ]);

  requireMonitoringAccess = this.requireAnyPermission([
    'camera:view',
    'device:view',
    'event:view',
    'alert:view'
  ]);

  requireControlAccess = this.requireAnyPermission([
    'camera:control',
    'device:control',
    'door:control'
  ]);

  requireManagementAccess = this.requireAnyPermission([
    'camera:manage',
    'device:manage',
    'building:manage',
    'system:manage'
  ]);
}