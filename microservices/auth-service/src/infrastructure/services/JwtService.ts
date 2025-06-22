import jwt from 'jsonwebtoken';
import { IJwtService, JwtPayload, RefreshTokenPayload } from '../../application/services/IJwtService';

export class JwtService implements IJwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;

  constructor() {
    this.accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'access-secret';
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret';
    this.accessTokenExpiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  }

  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn,
      issuer: 'forten-crm-auth',
      audience: 'forten-crm'
    });
  }

  generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn,
      issuer: 'forten-crm-auth',
      audience: 'forten-crm'
    });
  }

  verifyAccessToken(token: string): JwtPayload | null {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'forten-crm-auth',
        audience: 'forten-crm'
      }) as JwtPayload;

      return payload;
    } catch (error) {
      return null;
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'forten-crm-auth',
        audience: 'forten-crm'
      }) as RefreshTokenPayload;

      return payload;
    } catch (error) {
      return null;
    }
  }

  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }
}