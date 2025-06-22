import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuthService } from '../../../domain/services/IAuthService';

export interface RefreshTokenUseCaseInput {
  refreshToken: string;
}

export interface RefreshTokenUseCaseOutput {
  accessToken: string;
  refreshToken: string;
}

export class RefreshTokenUseCase {
  constructor(
    private userRepository: IUserRepository,
    private authService: IAuthService
  ) {}

  async execute(input: RefreshTokenUseCaseInput): Promise<RefreshTokenUseCaseOutput> {
    const { refreshToken } = input;

    // Verify refresh token
    const decoded = this.authService.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    // Find user
    const user = await this.userRepository.findById(decoded.id);
    if (!user || !user.isActive) {
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens
    const newAccessToken = this.authService.generateAccessToken(user.id);
    const newRefreshToken = this.authService.generateRefreshToken(user.id);

    // Update refresh token in database
    await this.userRepository.updateRefreshToken(user.id, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}