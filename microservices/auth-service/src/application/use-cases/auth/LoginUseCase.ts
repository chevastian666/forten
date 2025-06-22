import bcrypt from 'bcrypt';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { ISessionRepository } from '../../../domain/repositories/ISessionRepository';
import { IJwtService } from '../../services/IJwtService';
import { ITwoFactorService } from '../../services/ITwoFactorService';
import { v4 as uuidv4 } from 'uuid';

export interface LoginUseCaseRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
  ipAddress: string;
  userAgent: string;
}

export interface LoginUseCaseResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    roles: Array<{
      id: string;
      name: string;
    }>;
  };
  requiresTwoFactor?: boolean;
}

export class LoginUseCase {
  constructor(
    private userRepository: IUserRepository,
    private sessionRepository: ISessionRepository,
    private jwtService: IJwtService,
    private twoFactorService: ITwoFactorService
  ) {}

  async execute(request: LoginUseCaseRequest): Promise<LoginUseCaseResponse> {
    const { email, password, twoFactorCode, ipAddress, userAgent } = request;

    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    // Check if user is locked
    if (user.isLocked()) {
      throw new Error('Account is locked due to too many failed login attempts');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      user.recordFailedLogin();
      await this.userRepository.update(user);
      throw new Error('Invalid credentials');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new Error('Please verify your email before logging in');
    }

    // Handle two-factor authentication
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return {
          requiresTwoFactor: true,
          accessToken: '',
          refreshToken: '',
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: []
          }
        };
      }

      const isTwoFactorValid = this.twoFactorService.verifyToken(
        user.twoFactorSecret!,
        twoFactorCode
      );

      if (!isTwoFactorValid) {
        user.recordFailedLogin();
        await this.userRepository.update(user);
        throw new Error('Invalid two-factor code');
      }
    }

    // Record successful login
    user.recordSuccessfulLogin();
    await this.userRepository.update(user);

    // Generate tokens
    const accessToken = this.jwtService.generateAccessToken({
      userId: user.id,
      email: user.email,
      roles: user.roles.map(r => ({ id: r.id, name: r.name }))
    });

    const refreshToken = this.jwtService.generateRefreshToken({
      userId: user.id
    });

    // Create session
    const sessionId = uuidv4();
    await this.sessionRepository.create({
      id: sessionId,
      userId: user.id,
      token: accessToken,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date()
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map(r => ({ id: r.id, name: r.name }))
      }
    };
  }
}