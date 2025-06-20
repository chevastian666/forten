import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { ITwoFactorService } from '../../services/ITwoFactorService';

export interface Enable2FAUseCaseRequest {
  userId: string;
}

export interface Enable2FAUseCaseResponse {
  secret: string;
  qrCode: string;
}

export class Enable2FAUseCase {
  constructor(
    private userRepository: IUserRepository,
    private twoFactorService: ITwoFactorService
  ) {}

  async execute(request: Enable2FAUseCaseRequest): Promise<Enable2FAUseCaseResponse> {
    const { userId } = request;

    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      throw new Error('Two-factor authentication is already enabled');
    }

    // Generate secret
    const secret = this.twoFactorService.generateSecret();

    // Generate QR code
    const qrCode = await this.twoFactorService.generateQRCode(
      user.email,
      secret
    );

    // Store secret temporarily (not enabled yet)
    user.props.twoFactorSecret = secret;
    await this.userRepository.update(user);

    return {
      secret,
      qrCode
    };
  }
}

export interface Verify2FAUseCaseRequest {
  userId: string;
  token: string;
}

export interface Verify2FAUseCaseResponse {
  message: string;
  backupCodes: string[];
}

export class Verify2FAUseCase {
  constructor(
    private userRepository: IUserRepository,
    private twoFactorService: ITwoFactorService
  ) {}

  async execute(request: Verify2FAUseCaseRequest): Promise<Verify2FAUseCaseResponse> {
    const { userId, token } = request;

    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if secret exists
    if (!user.twoFactorSecret) {
      throw new Error('Two-factor setup not initiated');
    }

    // Verify token
    const isValid = this.twoFactorService.verifyToken(
      user.twoFactorSecret,
      token
    );

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    // Enable 2FA
    user.enableTwoFactor(user.twoFactorSecret);
    await this.userRepository.update(user);

    // Generate backup codes
    const backupCodes = this.twoFactorService.generateBackupCodes();

    return {
      message: 'Two-factor authentication enabled successfully',
      backupCodes
    };
  }
}

export interface Disable2FAUseCaseRequest {
  userId: string;
  password: string;
}

export interface Disable2FAUseCaseResponse {
  message: string;
}

export class Disable2FAUseCase {
  constructor(
    private userRepository: IUserRepository
  ) {}

  async execute(request: Disable2FAUseCaseRequest): Promise<Disable2FAUseCaseResponse> {
    const { userId } = request;

    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      throw new Error('Two-factor authentication is not enabled');
    }

    // Disable 2FA
    user.disableTwoFactor();
    await this.userRepository.update(user);

    return {
      message: 'Two-factor authentication disabled successfully'
    };
  }
}