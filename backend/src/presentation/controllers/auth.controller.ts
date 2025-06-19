import { Request, Response, NextFunction } from 'express';
import { container } from '../../infrastructure/container';
import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/RefreshTokenUseCase';
import { UserMapper } from '../../application/mappers/UserMapper';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { 
  LoginDTO, 
  RefreshTokenDTO, 
  AuthResponseDTO, 
  TokenResponseDTO,
  UserDTO 
} from '../../application/dtos/UserDTO';

export class AuthController {
  private loginUseCase: LoginUseCase;
  private refreshTokenUseCase: RefreshTokenUseCase;
  private userRepository: IUserRepository;

  constructor() {
    this.loginUseCase = container.get<LoginUseCase>('loginUseCase');
    this.refreshTokenUseCase = container.get<RefreshTokenUseCase>('refreshTokenUseCase');
    this.userRepository = container.get<IUserRepository>('userRepository');
  }

  login = async (req: Request<{}, {}, LoginDTO>, res: Response<AuthResponseDTO>, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;

      const result = await this.loginUseCase.execute({ email, password });

      const response: AuthResponseDTO = {
        user: UserMapper.toDTO(result.user),
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      };

      res.json(response);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid credentials') {
        res.status(401).json({ error: 'Invalid credentials' } as any);
        return;
      }
      if (error instanceof Error && error.message === 'User account is deactivated') {
        res.status(401).json({ error: 'User account is deactivated' } as any);
        return;
      }
      next(error);
    }
  };

  refreshToken = async (req: Request<{}, {}, RefreshTokenDTO>, res: Response<TokenResponseDTO>, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' } as any);
        return;
      }

      const result = await this.refreshTokenUseCase.execute({ refreshToken });

      const response: TokenResponseDTO = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      };

      res.json(response);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid refresh token') {
        res.status(401).json({ error: 'Invalid refresh token' } as any);
        return;
      }
      next(error);
    }
  };

  logout = async (req: Request & { user?: any }, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Clear the refresh token
      await this.userRepository.updateRefreshToken(req.user.id, null);

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  };

  profile = async (req: Request & { user?: any }, res: Response<{ user: UserDTO }>, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' } as any);
        return;
      }

      // Fetch the latest user data
      const user = await this.userRepository.findById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'User not found' } as any);
        return;
      }

      res.json({ user: UserMapper.toDTO(user) });
    } catch (error) {
      next(error);
    }
  };
}

// Export singleton instance for backward compatibility with existing routes
export const authController = new AuthController();