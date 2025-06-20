import { Request, Response } from 'express';
import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase';
import { RegisterUseCase } from '../../application/use-cases/auth/RegisterUseCase';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/RefreshTokenUseCase';
import { LogoutUseCase } from '../../application/use-cases/auth/LogoutUseCase';
import { RequestPasswordResetUseCase, ResetPasswordUseCase } from '../../application/use-cases/auth/ResetPasswordUseCase';
import { VerifyEmailUseCase } from '../../application/use-cases/auth/VerifyEmailUseCase';
import { Enable2FAUseCase, Verify2FAUseCase, Disable2FAUseCase } from '../../application/use-cases/auth/Enable2FAUseCase';

export class AuthController {
  constructor(
    private loginUseCase: LoginUseCase,
    private registerUseCase: RegisterUseCase,
    private refreshTokenUseCase: RefreshTokenUseCase,
    private logoutUseCase: LogoutUseCase,
    private requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private resetPasswordUseCase: ResetPasswordUseCase,
    private verifyEmailUseCase: VerifyEmailUseCase,
    private enable2FAUseCase: Enable2FAUseCase,
    private verify2FAUseCase: Verify2FAUseCase,
    private disable2FAUseCase: Disable2FAUseCase
  ) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, twoFactorCode } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.get('User-Agent') || '';

      const result = await this.loginUseCase.execute({
        email,
        password,
        twoFactorCode,
        ipAddress,
        userAgent
      });

      if (result.requiresTwoFactor) {
        res.status(200).json({
          success: true,
          requiresTwoFactor: true,
          message: 'Two-factor authentication required'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Login failed'
      });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password, firstName, lastName } = req.body;

      const result = await this.registerUseCase.execute({
        email,
        username,
        password,
        firstName,
        lastName
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed'
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.get('User-Agent') || '';

      const result = await this.refreshTokenUseCase.execute({
        refreshToken,
        ipAddress,
        userAgent
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Token refresh failed'
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      const { logoutAll } = req.body;
      const userId = req.user?.userId;

      const result = await this.logoutUseCase.execute({
        token,
        logoutAll,
        userId
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Logout failed'
      });
    }
  }

  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const result = await this.requestPasswordResetUseCase.execute({ email });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Password reset request failed'
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      const result = await this.resetPasswordUseCase.execute({
        token,
        newPassword
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Password reset failed'
      });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      const result = await this.verifyEmailUseCase.execute({ token });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Email verification failed'
      });
    }
  }

  async enable2FA(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const result = await this.enable2FAUseCase.execute({ userId });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '2FA setup failed'
      });
    }
  }

  async verify2FA(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { token } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const result = await this.verify2FAUseCase.execute({ userId, token });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '2FA verification failed'
      });
    }
  }

  async disable2FA(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { password } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const result = await this.disable2FAUseCase.execute({ userId, password });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '2FA disable failed'
      });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.userId,
          email: user.email,
          roles: user.roles
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get profile'
      });
    }
  }
}