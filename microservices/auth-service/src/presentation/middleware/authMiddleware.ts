import { Request, Response, NextFunction } from 'express';
import { IJwtService } from '../../application/services/IJwtService';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        roles: Array<{
          id: string;
          name: string;
        }>;
      };
    }
  }
}

export class AuthMiddleware {
  constructor(private jwtService: IJwtService) {}

  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Access token required'
        });
        return;
      }

      const token = authHeader.substring(7);
      const payload = this.jwtService.verifyAccessToken(token);

      if (!payload) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
        return;
      }

      req.user = {
        userId: payload.userId,
        email: payload.email,
        roles: payload.roles
      };

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  };

  authorize = (requiredPermissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Check if user has admin role (bypass permission check)
      const hasAdminRole = req.user.roles.some(role => role.name === 'admin');
      
      if (hasAdminRole) {
        next();
        return;
      }

      // For now, we'll implement basic role-based authorization
      // In a full implementation, you'd check specific permissions
      const hasRequiredPermission = requiredPermissions.some(permission => {
        // Simple permission to role mapping
        if (permission.includes('users:') && req.user!.roles.some(r => ['admin', 'manager'].includes(r.name))) {
          return true;
        }
        if (permission.includes('profile:') && req.user!.roles.some(r => ['admin', 'manager', 'user'].includes(r.name))) {
          return true;
        }
        return false;
      });

      if (!hasRequiredPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      next();
    };
  };

  optional = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    try {
      const token = authHeader.substring(7);
      const payload = this.jwtService.verifyAccessToken(token);

      if (payload) {
        req.user = {
          userId: payload.userId,
          email: payload.email,
          roles: payload.roles
        };
      }
    } catch (error) {
      // Ignore errors in optional authentication
    }

    next();
  };
}