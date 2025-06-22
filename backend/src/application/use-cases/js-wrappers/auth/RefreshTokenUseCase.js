// JavaScript wrapper for RefreshTokenUseCase

class RefreshTokenUseCase {
  constructor(userRepository, authService) {
    this.userRepository = userRepository;
    this.authService = authService;
  }

  async execute(input) {
    const { refreshToken } = input;

    // Verify refresh token
    const decoded = this.authService.verifyRefreshToken(refreshToken);

    // Find user
    const user = await this.userRepository.findById(decoded.id);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const newAccessToken = this.authService.generateToken(tokenPayload);
    const newRefreshToken = this.authService.generateRefreshToken(tokenPayload);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }
}

module.exports = { RefreshTokenUseCase };