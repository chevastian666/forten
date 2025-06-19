import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '../config/ConfigService';

export interface ApplicationError extends Error {
  status?: number;
  details?: any;
}

export class ErrorHandlingMiddleware {
  private configService: ConfigService;

  constructor() {
    this.configService = ConfigService.getInstance();
  }

  handle = (err: ApplicationError, req: Request, res: Response, next: NextFunction): void => {
    // Log the error
    console.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      status: err.status,
      details: err.details,
      path: req.path,
      method: req.method
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
      res.status(400).json({
        error: 'Validation Error',
        details: err.details || err.message
      });
      return;
    }

    if (err.name === 'SequelizeValidationError') {
      res.status(400).json({
        error: 'Validation Error',
        details: (err as any).errors?.map((e: any) => ({ 
          field: e.path, 
          message: e.message 
        })) || err.message
      });
      return;
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({
        error: 'Duplicate Entry',
        details: (err as any).errors?.map((e: any) => ({ 
          field: e.path, 
          message: e.message 
        })) || err.message
      });
      return;
    }

    if (err.name === 'UnauthorizedError' || err.status === 401) {
      res.status(401).json({
        error: 'Unauthorized',
        message: err.message || 'Authentication required'
      });
      return;
    }

    if (err.name === 'ForbiddenError' || err.status === 403) {
      res.status(403).json({
        error: 'Forbidden',
        message: err.message || 'Access denied'
      });
      return;
    }

    if (err.name === 'NotFoundError' || err.status === 404) {
      res.status(404).json({
        error: 'Not Found',
        message: err.message || 'Resource not found'
      });
      return;
    }

    // Default error response
    const status = err.status || 500;
    const response: any = {
      error: status === 500 ? 'Internal Server Error' : err.name || 'Error',
      message: err.message || 'An unexpected error occurred'
    };

    // Include stack trace in development
    if (this.configService.isDevelopment()) {
      response.stack = err.stack;
      response.details = err.details;
    }

    res.status(status).json(response);
  };

  // Wrapper for async route handlers
  asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  // Not found handler
  notFound = (req: Request, res: Response, next: NextFunction): void => {
    const error: ApplicationError = new Error(`Not found - ${req.originalUrl}`);
    error.status = 404;
    error.name = 'NotFoundError';
    next(error);
  };
}

// Factory function
export function createErrorHandlingMiddleware(): ErrorHandlingMiddleware {
  return new ErrorHandlingMiddleware();
}