import { IAuthService } from '../../domain/services/IAuthService';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../config/ConfigService';

export class JwtAuthService implements IAuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtExpire: string;
  private readonly jwtRefreshExpire: string;
  private readonly saltRounds: number;
  private readonly configService: ConfigService;

  constructor() {
    this.configService = ConfigService.getInstance();
    const jwtConfig = this.configService.getJwtConfig();
    const securityConfig = this.configService.getSecurityConfig();

    this.jwtSecret = jwtConfig.secret;
    this.jwtRefreshSecret = jwtConfig.refreshSecret;
    this.jwtExpire = jwtConfig.expiresIn;
    this.jwtRefreshExpire = jwtConfig.refreshExpiresIn;
    this.saltRounds = securityConfig.bcryptRounds;
  }

  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error(`Failed to compare password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  generateAccessToken(userId: string): string {
    try {
      return jwt.sign(
        { id: userId, type: 'access' },
        this.jwtSecret,
        { expiresIn: this.jwtExpire }
      );
    } catch (error) {
      throw new Error(`Failed to generate access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  generateRefreshToken(userId: string): string {
    try {
      return jwt.sign(
        { id: userId, type: 'refresh' },
        this.jwtRefreshSecret,
        { expiresIn: this.jwtRefreshExpire }
      );
    } catch (error) {
      throw new Error(`Failed to generate refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  verifyAccessToken(token: string): { id: string } | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as jwt.JwtPayload;
      
      if (decoded.type !== 'access') {
        return null;
      }

      return { id: decoded.id };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || 
          error instanceof jwt.TokenExpiredError || 
          error instanceof jwt.NotBeforeError) {
        return null;
      }
      throw new Error(`Failed to verify access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  verifyRefreshToken(token: string): { id: string } | null {
    try {
      const decoded = jwt.verify(token, this.jwtRefreshSecret) as jwt.JwtPayload;
      
      if (decoded.type !== 'refresh') {
        return null;
      }

      return { id: decoded.id };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || 
          error instanceof jwt.TokenExpiredError || 
          error instanceof jwt.NotBeforeError) {
        return null;
      }
      throw new Error(`Failed to verify refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}