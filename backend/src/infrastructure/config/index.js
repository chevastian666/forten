const { ConfigService } = require('./ConfigService');

// Export singleton instance
const configService = ConfigService.getInstance();

// Export both the service and convenience methods
module.exports = {
  ConfigService,
  configService,
  getConfig: () => configService.getConfig(),
  getAppConfig: () => configService.getAppConfig(),
  getJwtConfig: () => configService.getJwtConfig(),
  getSecurityConfig: () => configService.getSecurityConfig(),
  getRateLimitConfig: () => configService.getRateLimitConfig(),
  getDatabaseConfig: () => configService.getDatabaseConfig()
};