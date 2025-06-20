import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '../../utils/Logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  buildingIds: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export class AuthMiddleware {
  constructor(
    private jwtSecret: string,
    private logger: Logger
  ) {}

  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'No valid authorization token provided'
        });
        return;
      }

      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, this.jwtSecret) as any;
        
        // Create user object from token payload
        const user: AuthenticatedUser = {
          id: decoded.userId || decoded.id,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions || [],
          buildingIds: decoded.buildingIds || []
        };

        req.user = user;
        next();
      } catch (jwtError) {
        this.logger.warn(`JWT verification failed: ${jwtError.message}`);
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
        return;
      }
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Authentication service error'
      });
    }
  };

  optional = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next();
        return;
      }

      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, this.jwtSecret) as any;
        
        const user: AuthenticatedUser = {
          id: decoded.userId || decoded.id,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions || [],
          buildingIds: decoded.buildingIds || []
        };

        req.user = user;
      } catch (jwtError) {
        // For optional auth, we don't throw errors
        this.logger.debug(`Optional JWT verification failed: ${jwtError.message}`);
      }

      next();
    } catch (error) {
      this.logger.error(`Optional authentication error: ${error.message}`);
      next();
    }
  };

  requireApiKey = (validApiKeys: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        res.status(401).json({
          success: false,
          message: 'API key required'
        });
        return;
      }

      if (!validApiKeys.includes(apiKey)) {
        res.status(401).json({
          success: false,
          message: 'Invalid API key'
        });
        return;
      }

      next();
    };
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token required'
        });
        return;
      }

      try {
        const decoded = jwt.verify(refreshToken, this.jwtSecret) as any;
        
        // Generate new access token
        const newToken = jwt.sign(
          {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            permissions: decoded.permissions,
            buildingIds: decoded.buildingIds
          },
          this.jwtSecret,
          { expiresIn: '1h' }
        );

        res.json({
          success: true,
          data: {
            accessToken: newToken,
            expiresIn: 3600
          }
        });
      } catch (jwtError) {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }
    } catch (error) {
      this.logger.error(`Token refresh error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Token refresh service error'
      });
    }
  };
}