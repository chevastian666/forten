import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { ISessionRepository } from '../../../domain/repositories/ISessionRepository';
import { IJwtService } from '../../services/IJwtService';
import { v4 as uuidv4 } from 'uuid';

export interface RefreshTokenUseCaseRequest {
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
}

export interface RefreshTokenUseCaseResponse {
  accessToken: string;
  refreshToken: string;
}

export class RefreshTokenUseCase {
  constructor(
    private userRepository: IUserRepository,
    private sessionRepository: ISessionRepository,
    private jwtService: IJwtService
  ) {}

  async execute(request: RefreshTokenUseCaseRequest): Promise<RefreshTokenUseCaseResponse> {
    const { refreshToken, ipAddress, userAgent } = request;

    // Verify refresh token
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    // Find session by refresh token
    const session = await this.sessionRepository.findByRefreshToken(refreshToken);
    if (!session) {
      throw new Error('Session not found');
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.sessionRepository.delete(session.id);
      throw new Error('Session expired');
    }

    // Find user
    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is active
    if (!user.isActive) {
      await this.sessionRepository.delete(session.id);
      throw new Error('Account is inactive');
    }

    // Generate new tokens
    const newAccessToken = this.jwtService.generateAccessToken({
      userId: user.id,
      email: user.email,
      roles: user.roles.map(r => ({ id: r.id, name: r.name }))
    });

    const newRefreshToken = this.jwtService.generateRefreshToken({
      userId: user.id
    });

    // Delete old session
    await this.sessionRepository.delete(session.id);

    // Create new session
    const newSessionId = uuidv4();
    await this.sessionRepository.create({
      id: newSessionId,
      userId: user.id,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date()
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }
}