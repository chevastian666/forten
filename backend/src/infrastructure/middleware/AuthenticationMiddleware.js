// JavaScript wrapper for AuthenticationMiddleware

class AuthenticationMiddleware {
  constructor(authService, userRepository) {
    this.authService = authService;
    this.userRepository = userRepository;
  }

  authenticate = async (req, res, next) => {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Please authenticate' });
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Verify the token
      const decoded = this.authService.verifyAccessToken(token);
      
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Get the user from the repository
      const user = await this.userRepository.findById(decoded.id);

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      // Attach user and token to request
      req.user = user;
      req.token = token;
      
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ error: 'Please authenticate' });
    }
  };

  authorize = (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Please authenticate' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    };
  };
}

// Factory function to create middleware using container
function createAuthenticationMiddleware(container) {
  const authService = container.get('authService');
  const userRepository = container.get('userRepository');
  
  return new AuthenticationMiddleware(authService, userRepository);
}

module.exports = {
  AuthenticationMiddleware,
  createAuthenticationMiddleware
};