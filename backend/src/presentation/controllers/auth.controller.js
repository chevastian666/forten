// Refactored Auth Controller following Clean Architecture principles
// This is a transitional implementation that works with the existing JavaScript setup
// while preparing for full TypeScript migration

const jwt = require('jsonwebtoken');
const { User } = require('../../models');
const config = require('../../config/config');

// Temporary service implementations until TypeScript is fully integrated
class AuthService {
  generateAccessToken(userId) {
    return jwt.sign({ id: userId }, config.jwt.secret, { 
      expiresIn: config.jwt.expiresIn 
    });
  }

  generateRefreshToken(userId) {
    return jwt.sign({ id: userId }, config.jwt.refreshSecret, { 
      expiresIn: config.jwt.refreshExpiresIn 
    });
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.jwt.refreshSecret);
    } catch (error) {
      return null;
    }
  }
}

// Temporary use case implementations
class LoginUseCase {
  constructor(authService) {
    this.authService = authService;
  }

  async execute({ email, password }) {
    // Find user by email
    const user = await User.findOne({ where: { email, isActive: true } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.authService.generateAccessToken(user.id);
    const refreshToken = this.authService.generateRefreshToken(user.id);

    // Update user
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken
    };
  }
}

class RefreshTokenUseCase {
  constructor(authService) {
    this.authService = authService;
  }

  async execute({ refreshToken }) {
    // Verify refresh token
    const decoded = this.authService.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    // Find user
    const user = await User.findOne({ 
      where: { id: decoded.id, refreshToken, isActive: true } 
    });
    if (!user) {
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens
    const newAccessToken = this.authService.generateAccessToken(user.id);
    const newRefreshToken = this.authService.generateRefreshToken(user.id);

    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }
}

class AuthController {
  constructor() {
    // Initialize services and use cases
    this.authService = new AuthService();
    this.loginUseCase = new LoginUseCase(this.authService);
    this.refreshTokenUseCase = new RefreshTokenUseCase(this.authService);
  }

  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const result = await this.loginUseCase.execute({ email, password });

      res.json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      next(error);
    }
  };

  refreshToken = async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }

      const result = await this.refreshTokenUseCase.execute({ refreshToken });

      res.json(result);
    } catch (error) {
      if (error.message === 'Invalid refresh token') {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }
      next(error);
    }
  };

  logout = async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Clear the refresh token
      req.user.refreshToken = null;
      await req.user.save();

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  };

  profile = (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json({ user: req.user.toJSON() });
  };
}

// Export singleton instance for backward compatibility with existing routes
module.exports.authController = new AuthController();