import { RefreshToken, RevokeReason } from '../entities/RefreshToken';

export interface IRefreshTokenRepository {
  create(refreshToken: RefreshToken): Promise<RefreshToken>;
  findByToken(token: string): Promise<RefreshToken | null>;
  findByUserId(userId: string): Promise<RefreshToken[]>;
  findByFamilyId(familyId: string): Promise<RefreshToken[]>;
  update(refreshToken: RefreshToken): Promise<RefreshToken>;
  revokeToken(tokenId: string, reason: RevokeReason): Promise<void>;
  revokeFamily(familyId: string, reason: RevokeReason): Promise<void>;
  revokeAllUserTokens(userId: string, reason: RevokeReason): Promise<void>;
  deleteExpiredTokens(): Promise<number>;
  findActiveTokensByUser(userId: string): Promise<RefreshToken[]>;
  findSuspiciousActivity(userId: string, windowHours: number): Promise<RefreshToken[]>;
  getTokenChain(tokenId: string): Promise<RefreshToken[]>;
}