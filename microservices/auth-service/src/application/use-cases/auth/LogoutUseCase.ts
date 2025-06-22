import { ISessionRepository } from '../../../domain/repositories/ISessionRepository';

export interface LogoutUseCaseRequest {
  token: string;
  logoutAll?: boolean;
  userId?: string;
}

export interface LogoutUseCaseResponse {
  message: string;
}

export class LogoutUseCase {
  constructor(
    private sessionRepository: ISessionRepository
  ) {}

  async execute(request: LogoutUseCaseRequest): Promise<LogoutUseCaseResponse> {
    const { token, logoutAll, userId } = request;

    if (logoutAll && userId) {
      // Logout from all devices
      await this.sessionRepository.deleteByUserId(userId);
      return {
        message: 'Successfully logged out from all devices'
      };
    }

    // Find and delete current session
    const session = await this.sessionRepository.findByToken(token);
    if (session) {
      await this.sessionRepository.delete(session.id);
    }

    return {
      message: 'Successfully logged out'
    };
  }
}