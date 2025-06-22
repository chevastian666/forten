import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IEmailService } from '../../services/IEmailService';

export interface RequestPasswordResetUseCaseRequest {
  email: string;
}

export interface RequestPasswordResetUseCaseResponse {
  message: string;
}

export class RequestPasswordResetUseCase {
  constructor(
    private userRepository: IUserRepository,
    private emailService: IEmailService
  ) {}

  async execute(request: RequestPasswordResetUseCaseRequest): Promise<RequestPasswordResetUseCaseResponse> {
    const { email } = request;

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return {
        message: 'If your email is registered, you will receive a password reset link'
      };
    }

    if (!user.isActive) {
      return {
        message: 'If your email is registered, you will receive a password reset link'
      };
    }

    // Generate reset token
    const resetToken = uuidv4();
    user.setPasswordResetToken(resetToken, 3600000); // 1 hour expiry

    await this.userRepository.update(user);

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetToken
    );

    return {
      message: 'If your email is registered, you will receive a password reset link'
    };
  }
}

export interface ResetPasswordUseCaseRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordUseCaseResponse {
  message: string;
}

export class ResetPasswordUseCase {
  constructor(
    private userRepository: IUserRepository
  ) {}

  async execute(request: ResetPasswordUseCaseRequest): Promise<ResetPasswordUseCaseResponse> {
    const { token, newPassword } = request;

    // Find user by reset token
    const user = await this.userRepository.findByPasswordResetToken(token);
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Check if token is expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    user.updatePassword(passwordHash);
    await this.userRepository.update(user);

    return {
      message: 'Password has been reset successfully'
    };
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }
}