import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
      return;
    }
    
    next();
  };
};

export const loginValidation = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  twoFactorCode: Joi.string().optional()
});

export const registerValidation = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).alphanum().required(),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required()
});

export const refreshTokenValidation = Joi.object({
  refreshToken: Joi.string().required()
});

export const requestPasswordResetValidation = Joi.object({
  email: Joi.string().email().required()
});

export const resetPasswordValidation = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    })
});

export const verify2FAValidation = Joi.object({
  token: Joi.string().length(6).pattern(/^[0-9]+$/).required()
});

export const disable2FAValidation = Joi.object({
  password: Joi.string().required()
});