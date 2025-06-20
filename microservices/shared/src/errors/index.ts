// Custom error classes and error handling utilities

export enum ErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Client errors (400)
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  CONTACT_NOT_FOUND = 'CONTACT_NOT_FOUND',
  DEAL_NOT_FOUND = 'DEAL_NOT_FOUND',
  
  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  
  // Server errors (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Business logic errors
  INVALID_OPERATION = 'INVALID_OPERATION',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

// Base custom error class
export class BaseError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    Object.setPrototypeOf(this, BaseError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication errors
export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(ErrorCode.UNAUTHORIZED, message, 401, true, details);
  }
}

export class InvalidTokenError extends BaseError {
  constructor(message: string = 'Invalid token', details?: any) {
    super(ErrorCode.INVALID_TOKEN, message, 401, true, details);
  }
}

export class TokenExpiredError extends BaseError {
  constructor(message: string = 'Token has expired', details?: any) {
    super(ErrorCode.TOKEN_EXPIRED, message, 401, true, details);
  }
}

export class InvalidCredentialsError extends BaseError {
  constructor(message: string = 'Invalid credentials', details?: any) {
    super(ErrorCode.INVALID_CREDENTIALS, message, 401, true, details);
  }
}

// Authorization errors
export class ForbiddenError extends BaseError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(ErrorCode.FORBIDDEN, message, 403, true, details);
  }
}

export class InsufficientPermissionsError extends BaseError {
  constructor(message: string = 'Insufficient permissions', details?: any) {
    super(ErrorCode.INSUFFICIENT_PERMISSIONS, message, 403, true, details);
  }
}

// Client errors
export class BadRequestError extends BaseError {
  constructor(message: string = 'Bad request', details?: any) {
    super(ErrorCode.BAD_REQUEST, message, 400, true, details);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string = 'Validation error', details?: any) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, true, details);
  }
}

// Not found errors
export class NotFoundError extends BaseError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(ErrorCode.NOT_FOUND, message, 404, true, details);
  }
}

export class UserNotFoundError extends BaseError {
  constructor(userId: string) {
    super(ErrorCode.USER_NOT_FOUND, `User with ID ${userId} not found`, 404, true);
  }
}

export class ContactNotFoundError extends BaseError {
  constructor(contactId: string) {
    super(ErrorCode.CONTACT_NOT_FOUND, `Contact with ID ${contactId} not found`, 404, true);
  }
}

export class DealNotFoundError extends BaseError {
  constructor(dealId: string) {
    super(ErrorCode.DEAL_NOT_FOUND, `Deal with ID ${dealId} not found`, 404, true);
  }
}

// Conflict errors
export class ConflictError extends BaseError {
  constructor(message: string = 'Conflict', details?: any) {
    super(ErrorCode.CONFLICT, message, 409, true, details);
  }
}

export class DuplicateEntryError extends BaseError {
  constructor(message: string = 'Duplicate entry', details?: any) {
    super(ErrorCode.DUPLICATE_ENTRY, message, 409, true, details);
  }
}

export class EmailAlreadyExistsError extends BaseError {
  constructor(email: string) {
    super(ErrorCode.EMAIL_ALREADY_EXISTS, `Email ${email} already exists`, 409, true);
  }
}

// Server errors
export class InternalServerError extends BaseError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(ErrorCode.INTERNAL_SERVER_ERROR, message, 500, false, details);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string = 'Database error', details?: any) {
    super(ErrorCode.DATABASE_ERROR, message, 500, false, details);
  }
}

export class ServiceUnavailableError extends BaseError {
  constructor(message: string = 'Service unavailable', details?: any) {
    super(ErrorCode.SERVICE_UNAVAILABLE, message, 503, true, details);
  }
}

// Business logic errors
export class BusinessRuleViolationError extends BaseError {
  constructor(message: string, details?: any) {
    super(ErrorCode.BUSINESS_RULE_VIOLATION, message, 422, true, details);
  }
}

export class RateLimitExceededError extends BaseError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429, true, details);
  }
}

// Error handler middleware for Express
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof BaseError) {
    const { statusCode, code, message, details } = err;
    
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
    });
  }

  // Log unexpected errors
  console.error('Unexpected error:', err);

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: isDevelopment ? err.message : 'An unexpected error occurred',
      stack: isDevelopment ? err.stack : undefined,
    },
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error validation helper
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof BaseError) {
    return error.isOperational;
  }
  return false;
};