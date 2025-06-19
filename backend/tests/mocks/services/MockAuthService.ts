import { IAuthService } from '../../../src/domain/services/IAuthService';

export class MockAuthService implements IAuthService {
  private validTokens: Map<string, any> = new Map();

  generateAccessToken(userId: string): string {
    const token = `mock-access-token-${Date.now()}`;
    this.validTokens.set(token, { id: userId });
    return token;
  }

  generateRefreshToken(userId: string): string {
    const token = `mock-refresh-token-${Date.now()}`;
    this.validTokens.set(token, { id: userId, isRefresh: true });
    return token;
  }

  verifyAccessToken(token: string): { id: string } | null {
    const payload = this.validTokens.get(token);
    if (!payload || payload.isRefresh) {
      return null;
    }
    return { id: payload.id };
  }

  verifyRefreshToken(token: string): { id: string } | null {
    const payload = this.validTokens.get(token);
    if (!payload || !payload.isRefresh) {
      return null;
    }
    return { id: payload.id };
  }

  async hashPassword(password: string): Promise<string> {
    return `hashed-${password}`;
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return hashedPassword === `hashed-${password}`;
  }

  // Helper method for tests
  addValidToken(token: string, payload: any): void {
    this.validTokens.set(token, payload);
  }

  // Helper method for tests
  clear(): void {
    this.validTokens.clear();
  }
}