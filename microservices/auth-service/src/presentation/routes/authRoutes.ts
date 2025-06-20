import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthMiddleware } from '../middleware/authMiddleware';
import { 
  validate,
  loginValidation,
  registerValidation,
  refreshTokenValidation,
  requestPasswordResetValidation,
  resetPasswordValidation,
  verify2FAValidation,
  disable2FAValidation
} from '../middleware/validationMiddleware';

export class AuthRoutes {
  private router: Router;

  constructor(
    private authController: AuthController,
    private authMiddleware: AuthMiddleware
  ) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Public routes
    this.router.post(
      '/login',
      validate(loginValidation),
      this.authController.login.bind(this.authController)
    );

    this.router.post(
      '/register',
      validate(registerValidation),
      this.authController.register.bind(this.authController)
    );

    this.router.post(
      '/refresh-token',
      validate(refreshTokenValidation),
      this.authController.refreshToken.bind(this.authController)
    );

    this.router.post(
      '/request-password-reset',
      validate(requestPasswordResetValidation),
      this.authController.requestPasswordReset.bind(this.authController)
    );

    this.router.post(
      '/reset-password',
      validate(resetPasswordValidation),
      this.authController.resetPassword.bind(this.authController)
    );

    this.router.get(
      '/verify-email/:token',
      this.authController.verifyEmail.bind(this.authController)
    );

    // Protected routes
    this.router.post(
      '/logout',
      this.authMiddleware.authenticate,
      this.authController.logout.bind(this.authController)
    );

    this.router.get(
      '/profile',
      this.authMiddleware.authenticate,
      this.authController.getProfile.bind(this.authController)
    );

    // 2FA routes
    this.router.post(
      '/2fa/enable',
      this.authMiddleware.authenticate,
      this.authController.enable2FA.bind(this.authController)
    );

    this.router.post(
      '/2fa/verify',
      this.authMiddleware.authenticate,
      validate(verify2FAValidation),
      this.authController.verify2FA.bind(this.authController)
    );

    this.router.post(
      '/2fa/disable',
      this.authMiddleware.authenticate,
      validate(disable2FAValidation),
      this.authController.disable2FA.bind(this.authController)
    );
  }

  getRouter(): Router {
    return this.router;
  }
}