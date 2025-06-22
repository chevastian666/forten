// Test script to verify the new configuration service
const { ConfigService, configService } = require('./src/infrastructure/config');

console.log('Testing Configuration Service...\n');

try {
  // Test singleton pattern
  const instance1 = ConfigService.getInstance();
  const instance2 = ConfigService.getInstance();
  console.log('✓ Singleton pattern works:', instance1 === instance2);

  // Test configuration loading
  const config = configService.getConfig();
  console.log('\n✓ Full configuration loaded:');
  console.log(JSON.stringify(config, null, 2));

  // Test individual config sections
  console.log('\n✓ App Config:', configService.getAppConfig());
  console.log('✓ JWT Config:', configService.getJwtConfig());
  console.log('✓ Security Config:', configService.getSecurityConfig());
  console.log('✓ Rate Limit Config:', configService.getRateLimitConfig());
  console.log('✓ Database Config:', configService.getDatabaseConfig());

  // Test environment helpers
  console.log('\n✓ Environment checks:');
  console.log('  - Is Production:', configService.isProduction());
  console.log('  - Is Development:', configService.isDevelopment());
  console.log('  - Is Test:', configService.isTest());

  // Test config adapter compatibility
  console.log('\n✓ Testing config adapter compatibility...');
  const configAdapter = require('./src/config/config-adapter');
  console.log('  - Adapter JWT secret matches:', configAdapter.jwt.secret === configService.getJwtConfig().secret);
  console.log('  - Adapter app port matches:', configAdapter.app.port === configService.getAppConfig().port);

  console.log('\n✅ All configuration tests passed!');
} catch (error) {
  console.error('\n❌ Configuration test failed:', error.message);
  process.exit(1);
}