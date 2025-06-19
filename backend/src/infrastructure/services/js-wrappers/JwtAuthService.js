// JavaScript wrapper for JwtAuthService
// This wrapper provides the same interface as the TypeScript version
// but uses the new ConfigService for configuration

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ConfigService } = require('../../config/ConfigService');

class JwtAuthService {
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

  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new Error(`Failed to hash password: ${error.message || 'Unknown error'}`);
    }
  }

  async comparePassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error(`Failed to compare password: ${error.message || 'Unknown error'}`);
    }
  }

  generateAccessToken(userId) {
    try {
      return jwt.sign(
        { id: userId, type: 'access' },
        this.jwtSecret,
        { expiresIn: this.jwtExpire }
      );
    } catch (error) {
      throw new Error(`Failed to generate access token: ${error.message || 'Unknown error'}`);
    }
  }

  generateRefreshToken(userId) {
    try {
      return jwt.sign(
        { id: userId, type: 'refresh' },
        this.jwtRefreshSecret,
        { expiresIn: this.jwtRefreshExpire }
      );
    } catch (error) {
      throw new Error(`Failed to generate refresh token: ${error.message || 'Unknown error'}`);
    }
  }

  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      if (decoded.type !== 'access') {
        return null;
      }

      return { id: decoded.id };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || 
          error.name === 'TokenExpiredError' || 
          error.name === 'NotBeforeError') {
        return null;
      }
      throw new Error(`Failed to verify access token: ${error.message || 'Unknown error'}`);
    }
  }

  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtRefreshSecret);
      
      if (decoded.type !== 'refresh') {
        return null;
      }

      return { id: decoded.id };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || 
          error.name === 'TokenExpiredError' || 
          error.name === 'NotBeforeError') {
        return null;
      }
      throw new Error(`Failed to verify refresh token: ${error.message || 'Unknown error'}`);
    }
  }
}

module.exports = { JwtAuthService };