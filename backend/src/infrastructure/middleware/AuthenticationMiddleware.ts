import { Request, Response, NextFunction } from 'express';
import { IAuthService } from '../../domain/services/IAuthService';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

export interface AuthenticatedRequest extends Request {
  user?: any;
  token?: string;
  container?: any;
}

export class AuthenticationMiddleware {
  constructor(
    private authService: IAuthService,
    private userRepository: IUserRepository
  ) {}

  authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Please authenticate' });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Verify the token
      const decoded = this.authService.verifyAccessToken(token);
      
      if (!decoded) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }

      // Get the user from the repository
      const user = await this.userRepository.findById(decoded.id);

      if (!user || !user.isActive) {
        res.status(401).json({ error: 'User not found or inactive' });
        return;
      }

      // Attach user and token to request
      req.user = user;
      req.token = token;
      
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ error: 'Please authenticate' });
    }
  };

  authorize = (...roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Please authenticate' });
        return;
      }

      if (!roles.includes(req.user.role)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      next();
    };
  };
}

// Factory function to create middleware using container
export function createAuthenticationMiddleware(container: any): AuthenticationMiddleware {
  const authService = container.get('authService');
  const userRepository = container.get('userRepository');
  
  return new AuthenticationMiddleware(authService, userRepository);
}