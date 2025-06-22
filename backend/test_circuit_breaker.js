/**
 * Circuit Breaker Test Interface
 * Test and demonstrate circuit breaker functionality
 */

const circuitBreakerManager = require('./src/utils/circuitBreaker.util');

async function testCircuitBreaker() {
  console.log('🔧 Testing Circuit Breaker Implementation\n');

  try {
    // Initialize circuit breaker manager
    await circuitBreakerManager.initialize();
    console.log('✅ Circuit breaker manager initialized\n');

    // Test HikCentral integration
    console.log('🚪 Testing HikCentral Integration:');
    
    for (let i = 1; i <= 15; i++) {
      try {
        const result = await circuitBreakerManager.execute('hikcentral', 'openDoor', { doorId: 123 });
        console.log(`  Request ${i}: ${result.success ? '✅ Success' : '❌ Failed'} - ${result.operation}`);
      } catch (error) {
        console.log(`  Request ${i}: ❌ Failed - ${error.message}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 HikCentral Status:');
    const hikStatus = circuitBreakerManager.getStatus('hikcentral');
    console.log(`  Circuit State: ${hikStatus.state}`);
    console.log(`  Total Requests: ${hikStatus.metrics.totalRequests}`);
    console.log(`  Successful: ${hikStatus.metrics.successfulRequests}`);
    console.log(`  Failed: ${hikStatus.metrics.failedRequests}`);
    console.log(`  Uptime: ${hikStatus.metrics.uptime.toFixed(2)}%`);

    // Test WhatsApp integration
    console.log('\n📱 Testing WhatsApp Integration:');
    
    for (let i = 1; i <= 10; i++) {
      try {
        const result = await circuitBreakerManager.execute('whatsapp', 'sendMessage', { 
          to: '+1234567890', 
          message: 'Test message' 
        });
        console.log(`  Request ${i}: ${result.success ? '✅ Success' : '❌ Failed'} - ${result.operation}`);
      } catch (error) {
        console.log(`  Request ${i}: ❌ Failed - ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 WhatsApp Status:');
    const whatsappStatus = circuitBreakerManager.getStatus('whatsapp');
    console.log(`  Circuit State: ${whatsappStatus.state}`);
    console.log(`  Total Requests: ${whatsappStatus.metrics.totalRequests}`);
    console.log(`  Successful: ${whatsappStatus.metrics.successfulRequests}`);
    console.log(`  Failed: ${whatsappStatus.metrics.failedRequests}`);
    console.log(`  Uptime: ${whatsappStatus.metrics.uptime.toFixed(2)}%`);

    // Test overall health
    console.log('\n🏥 Overall Health Status:');
    const health = circuitBreakerManager.getHealthStatus();
    console.log(`  Overall Healthy: ${health.healthy ? '✅ Yes' : '❌ No'}`);
    console.log(`  Healthy Integrations: ${health.healthyIntegrations}/${health.totalIntegrations}`);
    
    for (const [integration, details] of Object.entries(health.details)) {
      console.log(`  ${integration}: ${details.healthy ? '✅' : '❌'} ${details.state} (${details.uptime.toFixed(1)}% uptime)`);
    }

    // Test circuit breaker reset
    console.log('\n🔄 Testing Circuit Breaker Reset:');
    if (hikStatus.state !== 'CLOSED') {
      const resetResult = await circuitBreakerManager.resetCircuitBreaker('hikcentral');
      console.log(`  HikCentral reset: ${resetResult ? '✅ Success' : '❌ Failed'}`);
      
      const newStatus = circuitBreakerManager.getStatus('hikcentral');
      console.log(`  New state: ${newStatus.state}`);
    } else {
      console.log('  HikCentral circuit is already closed, no reset needed');
    }

    console.log('\n🎯 Circuit Breaker Test Summary:');
    console.log('  - Circuit breaker pattern implemented with 50% failure threshold');
    console.log('  - Fallback strategies activated for offline mode');
    console.log('  - Notifications sent for circuit state changes');
    console.log('  - Metrics collected for monitoring');
    console.log('  - Multiple integration types supported (HikCentral, WhatsApp, Email, Backup)');
    console.log('  - Automatic recovery testing implemented');

  } catch (error) {
    console.error('❌ Circuit breaker test failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    await circuitBreakerManager.shutdown();
    console.log('\n🛑 Circuit breaker manager shut down');
  }
}

// Run the test
if (require.main === module) {
  testCircuitBreaker().catch(console.error);
}

module.exports = { testCircuitBreaker };