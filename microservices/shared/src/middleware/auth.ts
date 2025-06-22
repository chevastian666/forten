// JWT authentication middleware for microservices

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';
import { UnauthorizedError, InvalidTokenError, TokenExpiredError, InsufficientPermissionsError } from '../errors';
import { Logger } from '../logger';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      token?: string;
    }
  }
}

// Auth middleware configuration
export interface AuthConfig {
  jwtSecret: string;
  jwtPublicKey?: string;
  issuer?: string;
  audience?: string;
  algorithms?: jwt.Algorithm[];
  logger?: Logger;
}

// Role hierarchy for permission checking
const roleHierarchy: Record<UserRole, number> = {
  [UserRole.ADMIN]: 100,
  [UserRole.MANAGER]: 80,
  [UserRole.SALES_REP]: 60,
  [UserRole.CUSTOMER_SERVICE]: 40,
  [UserRole.VIEWER]: 20,
};

// Create authentication middleware
export const createAuthMiddleware = (config: AuthConfig) => {
  const { jwtSecret, jwtPublicKey, issuer, audience, algorithms = ['HS256'], logger } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract token from header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        throw new UnauthorizedError('No authorization header provided');
      }

      const [scheme, token] = authHeader.split(' ');
      
      if (scheme?.toLowerCase() !== 'bearer' || !token) {
        throw new InvalidTokenError('Invalid authorization header format');
      }

      // Store token in request
      req.token = token;

      // Verify token
      const verifyOptions: jwt.VerifyOptions = {
        algorithms,
        issuer,
        audience,
      };

      const decoded = jwt.verify(
        token,
        jwtPublicKey || jwtSecret,
        verifyOptions
      ) as JwtPayload;

      // Validate payload
      if (!decoded.userId || !decoded.email || !decoded.role) {
        throw new InvalidTokenError('Invalid token payload');
      }

      // Attach user to request
      req.user = decoded;

      // Log successful authentication
      if (logger) {
        logger.debug('User authenticated', {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        });
      }

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        next(new TokenExpiredError('Token has expired'));
      } else if (error instanceof jwt.JsonWebTokenError) {
        next(new InvalidTokenError(error.message));
      } else {
        next(error);
      }
    }
  };
};

// Role-based access control middleware
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated'));
    }

    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return next(new InsufficientPermissionsError(
        `Role ${userRole} is not allowed to access this resource`
      ));
    }

    next();
  };
};

// Minimum role level middleware
export const requireMinRole = (minRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated'));
    }

    const userRoleLevel = roleHierarchy[req.user.role] || 0;
    const minRoleLevel = roleHierarchy[minRole] || 0;

    if (userRoleLevel < minRoleLevel) {
      return next(new InsufficientPermissionsError(
        `Minimum role ${minRole} required`
      ));
    }

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = (config: AuthConfig) => {
  const authMiddleware = createAuthMiddleware(config);

  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // No token provided, continue without user
      return next();
    }

    // Token provided, validate it
    authMiddleware(req, res, next);
  };
};

// Service-to-service authentication middleware
export const createServiceAuthMiddleware = (config: {
  serviceTokens: Map<string, string>;
  logger?: Logger;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceHeader = req.headers['x-service-auth'] as string;
      
      if (!serviceHeader) {
        throw new UnauthorizedError('No service authentication header provided');
      }

      const [serviceName, serviceToken] = serviceHeader.split(':');
      
      if (!serviceName || !serviceToken) {
        throw new InvalidTokenError('Invalid service authentication format');
      }

      const expectedToken = config.serviceTokens.get(serviceName);
      
      if (!expectedToken || expectedToken !== serviceToken) {
        throw new UnauthorizedError('Invalid service credentials');
      }

      // Add service info to request
      (req as any).service = {
        name: serviceName,
        authenticated: true,
      };

      if (config.logger) {
        config.logger.debug('Service authenticated', {
          service: serviceName,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Token generation utilities
export interface TokenOptions {
  expiresIn?: string | number;
  issuer?: string;
  audience?: string;
  subject?: string;
}

export const generateToken = (
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  secret: string,
  options: TokenOptions = {}
): string => {
  const { expiresIn = '1h', ...jwtOptions } = options;

  return jwt.sign(payload, secret, {
    expiresIn,
    ...jwtOptions,
  });
};

export const generateRefreshToken = (
  userId: string,
  secret: string,
  options: TokenOptions = {}
): string => {
  const { expiresIn = '30d', ...jwtOptions } = options;

  return jwt.sign({ userId, type: 'refresh' }, secret, {
    expiresIn,
    ...jwtOptions,
  });
};

// Token validation utilities
export const validateToken = async (
  token: string,
  secret: string,
  options: jwt.VerifyOptions = {}
): Promise<JwtPayload> => {
  try {
    const decoded = jwt.verify(token, secret, options) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new InvalidTokenError(error.message);
    }
    throw error;
  }
};

// Extract user ID from request
export const getUserId = (req: Request): string => {
  if (!req.user) {
    throw new UnauthorizedError('User not authenticated');
  }
  return req.user.userId;
};

// Check if user has permission
export const hasPermission = (
  userRole: UserRole,
  requiredRole: UserRole
): boolean => {
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

// Resource ownership middleware
export const requireOwnership = (
  getResourceOwnerId: (req: Request) => Promise<string>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('User not authenticated'));
      }

      const resourceOwnerId = await getResourceOwnerId(req);
      
      // Admins can access any resource
      if (req.user.role === UserRole.ADMIN) {
        return next();
      }

      // Check ownership
      if (resourceOwnerId !== req.user.userId) {
        return next(new InsufficientPermissionsError(
          'You do not have permission to access this resource'
        ));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};