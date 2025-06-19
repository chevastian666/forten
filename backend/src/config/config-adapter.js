// Configuration adapter to maintain backward compatibility
// This allows the existing config structure to work with the new ConfigService

const { configService } = require('../infrastructure/config');

// Create a config object that matches the old structure
// but gets its values from the new ConfigService
const config = {
  get app() {
    return configService.getAppConfig();
  },
  
  get jwt() {
    return configService.getJwtConfig();
  },
  
  get security() {
    return configService.getSecurityConfig();
  },
  
  get rateLimit() {
    return configService.getRateLimitConfig();
  },
  
  get database() {
    return configService.getDatabaseConfig();
  }
};

// Export the config object to maintain compatibility
module.exports = config;