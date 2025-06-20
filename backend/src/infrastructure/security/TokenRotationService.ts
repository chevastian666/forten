import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { RefreshToken, RefreshTokenEntity, RevokeReason } from '../../domain/entities/RefreshToken';
import { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { Logger } from '../logging/Logger';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenFamily: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface TokenRotationOptions {
  accessTokenTTL: number; // in seconds
  refreshTokenTTL: number; // in seconds
  maxTokensPerUser: number;
  reuseDetectionWindow: number; // in hours
  deviceFingerprintRequired: boolean;
}

export class TokenRotationService {
  private readonly logger: Logger;
  private readonly defaultOptions: TokenRotationOptions = {
    accessTokenTTL: 900, // 15 minutes
    refreshTokenTTL: 604800, // 7 days
    maxTokensPerUser: 10,
    reuseDetectionWindow: 24,
    deviceFingerprintRequired: true
  };

  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtService: any, // Your JWT service interface
    private readonly options: Partial<TokenRotationOptions> = {}
  ) {
    this.logger = new Logger('TokenRotationService');
    this.options = { ...this.defaultOptions, ...options };
  }

  async createTokenPair(
    userId: string,
    userInfo: any,
    deviceInfo?: {
      userAgent?: string;
      ipAddress?: string;
      deviceFingerprint?: string;
    }
  ): Promise<TokenPair> {
    // Check if device fingerprint is required
    if (this.options.deviceFingerprintRequired && !deviceInfo?.deviceFingerprint) {
      throw new Error('Device fingerprint is required');
    }

    // Check maximum tokens per user
    const activeTokens = await this.refreshTokenRepository.findActiveTokensByUser(userId);
    if (activeTokens.length >= this.options.maxTokensPerUser!) {
      // Revoke oldest token
      const oldestToken = activeTokens.sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      )[0];
      await this.refreshTokenRepository.revokeToken(oldestToken.id, RevokeReason.EXPIRED);
    }

    // Generate new token family
    const familyId = uuidv4();
    const refreshTokenId = uuidv4();
    const refreshTokenValue = this.generateSecureToken();

    // Create access token
    const accessToken = await this.jwtService.generateToken({
      ...userInfo,
      type: 'access',
      familyId,
      jti: uuidv4()
    }, this.options.accessTokenTTL);

    // Create refresh token entity
    const refreshTokenEntity = new RefreshTokenEntity(
      refreshTokenId,
      userId,
      refreshTokenValue,
      familyId,
      new Date(Date.now() + this.options.refreshTokenTTL! * 1000),
      new Date(),
      new Date(),
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      deviceInfo?.userAgent,
      deviceInfo?.ipAddress,
      deviceInfo?.deviceFingerprint
    );

    // Save refresh token
    await this.refreshTokenRepository.create(refreshTokenEntity);

    // Log token creation
    this.logger.info('Token pair created', {
      userId,
      familyId,
      userAgent: deviceInfo?.userAgent,
      ipAddress: deviceInfo?.ipAddress
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      refreshTokenFamily: familyId,
      expiresIn: this.options.accessTokenTTL!,
      refreshExpiresIn: this.options.refreshTokenTTL!
    };
  }

  async rotateTokens(
    refreshToken: string,
    userInfo: any,
    deviceInfo?: {
      userAgent?: string;
      ipAddress?: string;
      deviceFingerprint?: string;
    }
  ): Promise<TokenPair> {
    // Find the refresh token
    const existingToken = await this.refreshTokenRepository.findByToken(refreshToken);
    
    if (!existingToken) {
      throw new Error('Invalid refresh token');
    }

    // Check if token is valid
    if (!existingToken.isValid()) {
      // Token has been revoked - possible reuse attack
      if (existingToken.isRevoked) {
        await this.handlePossibleTokenReuse(existingToken);
      }
      throw new Error('Token is no longer valid');
    }

    // Verify device fingerprint if required
    if (this.options.deviceFingerprintRequired && 
        existingToken.deviceFingerprint !== deviceInfo?.deviceFingerprint) {
      await this.handleSuspiciousActivity(existingToken, 'Device fingerprint mismatch');
      throw new Error('Device verification failed');
    }

    // Create new token pair with same family
    const newRefreshTokenId = uuidv4();
    const newRefreshTokenValue = this.generateSecureToken();

    // Create new access token
    const accessToken = await this.jwtService.generateToken({
      ...userInfo,
      type: 'access',
      familyId: existingToken.familyId,
      jti: uuidv4()
    }, this.options.accessTokenTTL);

    // Create new refresh token
    const newRefreshToken = new RefreshTokenEntity(
      newRefreshTokenId,
      existingToken.userId,
      newRefreshTokenValue,
      existingToken.familyId,
      new Date(Date.now() + this.options.refreshTokenTTL! * 1000),
      new Date(),
      new Date(),
      false,
      undefined,
      undefined,
      existingToken.id, // parentId
      undefined,
      deviceInfo?.userAgent || existingToken.userAgent,
      deviceInfo?.ipAddress || existingToken.ipAddress,
      deviceInfo?.deviceFingerprint || existingToken.deviceFingerprint
    );

    // Update existing token
    existingToken.revoke(RevokeReason.ROTATED);
    existingToken.childId = newRefreshTokenId;
    
    // Save both tokens
    await this.refreshTokenRepository.update(existingToken);
    await this.refreshTokenRepository.create(newRefreshToken);

    // Log rotation
    this.logger.info('Token rotated', {
      userId: existingToken.userId,
      familyId: existingToken.familyId,
      oldTokenId: existingToken.id,
      newTokenId: newRefreshTokenId
    });

    return {
      accessToken,
      refreshToken: newRefreshTokenValue,
      refreshTokenFamily: existingToken.familyId,
      expiresIn: this.options.accessTokenTTL!,
      refreshExpiresIn: this.options.refreshTokenTTL!
    };
  }

  async revokeToken(refreshToken: string, reason: RevokeReason): Promise<void> {
    const token = await this.refreshTokenRepository.findByToken(refreshToken);
    if (token) {
      await this.refreshTokenRepository.revokeToken(token.id, reason);
      this.logger.info('Token revoked', { tokenId: token.id, reason });
    }
  }

  async revokeTokenFamily(familyId: string, reason: RevokeReason): Promise<void> {
    await this.refreshTokenRepository.revokeFamily(familyId, reason);
    this.logger.warn('Token family revoked', { familyId, reason });
  }

  async revokeAllUserTokens(userId: string, reason: RevokeReason): Promise<void> {
    await this.refreshTokenRepository.revokeAllUserTokens(userId, reason);
    this.logger.info('All user tokens revoked', { userId, reason });
  }

  private async handlePossibleTokenReuse(token: RefreshToken): Promise<void> {
    this.logger.error('Possible token reuse detected', {
      tokenId: token.id,
      familyId: token.familyId,
      userId: token.userId
    });

    // Revoke entire token family
    await this.refreshTokenRepository.revokeFamily(
      token.familyId,
      RevokeReason.FAMILY_COMPROMISED
    );

    // Check for suspicious activity
    const suspiciousTokens = await this.refreshTokenRepository.findSuspiciousActivity(
      token.userId,
      this.options.reuseDetectionWindow!
    );

    if (suspiciousTokens.length > 0) {
      // Notify security team
      this.logger.critical('Multiple token reuse attempts detected', {
        userId: token.userId,
        attempts: suspiciousTokens.length
      });
    }
  }

  private async handleSuspiciousActivity(
    token: RefreshToken,
    reason: string
  ): Promise<void> {
    this.logger.warn('Suspicious activity detected', {
      tokenId: token.id,
      userId: token.userId,
      reason
    });

    // Revoke token
    await this.refreshTokenRepository.revokeToken(
      token.id,
      RevokeReason.SUSPICIOUS_ACTIVITY
    );

    // You might want to implement additional security measures here
    // such as sending alerts, requiring re-authentication, etc.
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(64).toString('base64url');
  }

  async validateTokenFamily(refreshToken: string, familyId: string): Promise<boolean> {
    const token = await this.refreshTokenRepository.findByToken(refreshToken);
    return token?.belongsToFamily(familyId) || false;
  }

  async getTokenChain(tokenId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.getTokenChain(tokenId);
  }

  async cleanupExpiredTokens(): Promise<number> {
    const deleted = await this.refreshTokenRepository.deleteExpiredTokens();
    this.logger.info('Expired tokens cleaned up', { count: deleted });
    return deleted;
  }
}