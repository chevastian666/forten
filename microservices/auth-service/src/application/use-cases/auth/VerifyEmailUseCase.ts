import { IUserRepository } from '../../../domain/repositories/IUserRepository';

export interface VerifyEmailUseCaseRequest {
  token: string;
}

export interface VerifyEmailUseCaseResponse {
  message: string;
}

export class VerifyEmailUseCase {
  constructor(
    private userRepository: IUserRepository
  ) {}

  async execute(request: VerifyEmailUseCaseRequest): Promise<VerifyEmailUseCaseResponse> {
    const { token } = request;

    // Find user by verification token
    const user = await this.userRepository.findByEmailVerificationToken(token);
    if (!user) {
      throw new Error('Invalid verification token');
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return {
        message: 'Email is already verified'
      };
    }

    // Verify email
    user.verifyEmail();
    await this.userRepository.update(user);

    return {
      message: 'Email verified successfully'
    };
  }
}