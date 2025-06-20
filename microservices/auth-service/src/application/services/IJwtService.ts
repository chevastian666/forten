export interface JwtPayload {
  userId: string;
  email: string;
  roles: Array<{
    id: string;
    name: string;
  }>;
}

export interface RefreshTokenPayload {
  userId: string;
}

export interface IJwtService {
  generateAccessToken(payload: JwtPayload): string;
  generateRefreshToken(payload: RefreshTokenPayload): string;
  verifyAccessToken(token: string): JwtPayload | null;
  verifyRefreshToken(token: string): RefreshTokenPayload | null;
  decodeToken(token: string): any;
}