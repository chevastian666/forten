import 'dotenv/config';
import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';

// Infrastructure
import { Database } from './infrastructure/database/database';
import { PostgresUserRepository } from './infrastructure/repositories/PostgresUserRepository';
import { PostgresRoleRepository } from './infrastructure/repositories/PostgresRoleRepository';
import { RedisSessionRepository } from './infrastructure/repositories/RedisSessionRepository';
import { JwtService } from './infrastructure/services/JwtService';
import { EmailService } from './infrastructure/services/EmailService';
import { TwoFactorService } from './infrastructure/services/TwoFactorService';

// Use Cases
import { LoginUseCase } from './application/use-cases/auth/LoginUseCase';
import { RegisterUseCase } from './application/use-cases/auth/RegisterUseCase';
import { RefreshTokenUseCase } from './application/use-cases/auth/RefreshTokenUseCase';
import { LogoutUseCase } from './application/use-cases/auth/LogoutUseCase';
import { RequestPasswordResetUseCase, ResetPasswordUseCase } from './application/use-cases/auth/ResetPasswordUseCase';
import { VerifyEmailUseCase } from './application/use-cases/auth/VerifyEmailUseCase';
import { Enable2FAUseCase, Verify2FAUseCase, Disable2FAUseCase } from './application/use-cases/auth/Enable2FAUseCase';

// Presentation
import { AuthController } from './presentation/controllers/AuthController';
import { AuthMiddleware } from './presentation/middleware/authMiddleware';
import { AuthRoutes } from './presentation/routes/authRoutes';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class App {
  private app: express.Application;
  private database: Database;
  private port: number;

  constructor() {
    this.app = express();
    this.database = Database.getInstance();
    this.port = parseInt(process.env.PORT || '3001');
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
      }
    });

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 login attempts per windowMs
      message: {
        success: false,
        message: 'Too many login attempts from this IP, please try again later.'
      }
    });

    this.app.use('/api/auth/login', authLimiter);
    this.app.use('/api/auth/register', authLimiter);
    this.app.use('/api', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Initialize services
    const jwtService = new JwtService();
    const emailService = new EmailService();
    const twoFactorService = new TwoFactorService();

    // Initialize repositories
    const userRepository = new PostgresUserRepository(this.database.knex);
    const roleRepository = new PostgresRoleRepository(this.database.knex);
    const sessionRepository = new RedisSessionRepository(this.database.redis);

    // Initialize use cases
    const loginUseCase = new LoginUseCase(
      userRepository,
      sessionRepository,
      jwtService,
      twoFactorService
    );

    const registerUseCase = new RegisterUseCase(
      userRepository,
      roleRepository,
      emailService
    );

    const refreshTokenUseCase = new RefreshTokenUseCase(
      userRepository,
      sessionRepository,
      jwtService
    );

    const logoutUseCase = new LogoutUseCase(sessionRepository);

    const requestPasswordResetUseCase = new RequestPasswordResetUseCase(
      userRepository,
      emailService
    );

    const resetPasswordUseCase = new ResetPasswordUseCase(userRepository);

    const verifyEmailUseCase = new VerifyEmailUseCase(userRepository);

    const enable2FAUseCase = new Enable2FAUseCase(
      userRepository,
      twoFactorService
    );

    const verify2FAUseCase = new Verify2FAUseCase(
      userRepository,
      twoFactorService
    );

    const disable2FAUseCase = new Disable2FAUseCase(userRepository);

    // Initialize controllers
    const authController = new AuthController(
      loginUseCase,
      registerUseCase,
      refreshTokenUseCase,
      logoutUseCase,
      requestPasswordResetUseCase,
      resetPasswordUseCase,
      verifyEmailUseCase,
      enable2FAUseCase,
      verify2FAUseCase,
      disable2FAUseCase
    );

    // Initialize middleware
    const authMiddleware = new AuthMiddleware(jwtService);

    // Initialize routes
    const authRoutes = new AuthRoutes(authController, authMiddleware);

    // Setup routes
    this.app.use('/api/auth', authRoutes.getRouter());

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        service: 'auth-service',
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });

    // API info
    this.app.get('/api', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        service: 'Forten CRM Auth Service',
        version: '1.0.0',
        endpoints: {
          auth: '/api/auth',
          health: '/health'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled error:', error);

      if (process.env.NODE_ENV === 'development') {
        res.status(500).json({
          success: false,
          message: error.message,
          stack: error.stack
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  }

  async start(): Promise<void> {
    try {
      // Connect to databases
      await this.database.connect();
      
      // Seed database
      await this.database.seed();

      // Start server
      this.app.listen(this.port, () => {
        logger.info(`🚀 Auth Service running on port ${this.port}`);
        logger.info(`📋 API documentation available at http://localhost:${this.port}/api`);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Shutting down gracefully...');
    
    try {
      await this.database.disconnect();
      logger.info('Database connections closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the application
const app = new App();
app.start().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});