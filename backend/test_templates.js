/**
 * Template Service Test Interface
 * Test and demonstrate template functionality
 */

const templateService = require('./src/services/template.service');

async function testTemplateService() {
  console.log('🎨 Testing Template Service Implementation\n');

  try {
    // Initialize template service
    await templateService.initialize();
    console.log('✅ Template service initialized\n');

    // Test template rendering
    console.log('📝 Testing Template Rendering:');
    
    const securityData = {
      timestamp: new Date().toISOString(),
      ip: '192.168.1.100',
      location: 'Main Office - Reception',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      attemptedAction: 'Access restricted administrative area'
    };

    const securityAlert = await templateService.render('security-unauthorized-access', securityData);
    console.log('  Security Alert Template:');
    console.log(securityAlert.substring(0, 200) + '...\n');

    const accessData = {
      timestamp: new Date().toISOString(),
      doorName: 'Main Entrance',
      userName: 'John Doe',
      method: 'keycard',
      location: 'Building A - Ground Floor'
    };

    const accessNotification = await templateService.render('access-door-opened', accessData);
    console.log('  Access Event Template:');
    console.log(accessNotification.substring(0, 200) + '...\n');

    // Test template preview
    console.log('👁️ Testing Template Preview:');
    const preview = await templateService.preview('security-unauthorized-access');
    console.log(`  Template: ${preview.metadata.name}`);
    console.log(`  Category: ${preview.metadata.category}`);
    console.log(`  Variables: ${preview.metadata.variables.join(', ')}`);
    console.log(`  Priority: ${preview.metadata.priority}`);
    console.log(`  Channels: ${preview.metadata.channels.join(', ')}\n`);

    // Test all templates listing
    console.log('📋 Available Templates:');
    const allTemplates = templateService.getAllTemplates();
    for (const [id, template] of Object.entries(allTemplates)) {
      console.log(`  ${id}:`);
      console.log(`    Name: ${template.name}`);
      console.log(`    Category: ${template.category}`);
      console.log(`    Priority: ${template.priority}`);
      console.log(`    Variables: ${template.variables.join(', ')}`);
      console.log('');
    }

    // Test creating a custom template
    console.log('➕ Testing Custom Template Creation:');
    const customTemplate = {
      content: `
<div class="custom-alert">
  <h3>📱 Custom Event: {{eventType}}</h3>
  <p><strong>Time:</strong> {{formatDateTime timestamp}}</p>
  <p><strong>User:</strong> {{userName}}</p>
  <p><strong>Details:</strong> {{details}}</p>
  {{#ifEquals priority "high"}}
  <div class="high-priority">
    <p>🔴 High Priority Event - Immediate attention required!</p>
  </div>
  {{/ifEquals}}
</div>
      `.trim(),
      name: 'Custom Event Template',
      category: 'custom',
      description: 'Custom template for testing',
      variables: ['timestamp', 'eventType', 'userName', 'details', 'priority'],
      priority: 'medium',
      channels: ['websocket', 'email']
    };

    await templateService.saveTemplate('custom-event', customTemplate);
    console.log('  ✅ Custom template created: custom-event\n');

    // Test custom template rendering
    const customData = {
      timestamp: new Date().toISOString(),
      eventType: 'System Test',
      userName: 'Test User',
      details: 'This is a test of the custom template system',
      priority: 'high'
    };

    const customRendered = await templateService.render('custom-event', customData);
    console.log('  Custom Template Rendered:');
    console.log(customRendered.substring(0, 300) + '...\n');

    // Test template categories
    console.log('🏷️ Templates by Category:');
    const categories = ['security', 'access', 'system', 'custom'];
    for (const category of categories) {
      const categoryTemplates = templateService.getTemplatesByCategory(category);
      console.log(`  ${category}: ${Object.keys(categoryTemplates).length} templates`);
    }

    // Test service status
    console.log('\n📊 Template Service Status:');
    const status = templateService.getStatus();
    console.log(`  Initialized: ${status.initialized}`);
    console.log(`  Total Templates: ${status.templateCount}`);
    console.log(`  Compiled Templates: ${status.compiledCount}`);
    console.log(`  Templates Directory: ${status.templatesDir}`);

    console.log('\n🎯 Template Service Test Summary:');
    console.log('  - Handlebars template system implemented');
    console.log('  - Dynamic variable substitution working');
    console.log('  - Template preview functionality available');
    console.log('  - Custom template creation and management');
    console.log('  - Multiple categories and priorities supported');
    console.log('  - Built-in helper functions for formatting');
    console.log('  - File-based template storage with metadata');

    // Clean up custom template
    await templateService.deleteTemplate('custom-event');
    console.log('  - Custom template cleaned up');

  } catch (error) {
    console.error('❌ Template service test failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    await templateService.shutdown();
    console.log('\n🛑 Template service shut down');
  }
}

// Run the test
if (require.main === module) {
  testTemplateService().catch(console.error);
}

module.exports = { testTemplateService };