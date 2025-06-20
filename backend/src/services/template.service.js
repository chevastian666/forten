/**
 * Template Service
 * Event template system using Handlebars for notification customization
 * Supports dynamic variables, preview functionality, and template management
 */

const Handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../config/logger');
const { EventEmitter } = require('events');

class TemplateService extends EventEmitter {
  constructor() {
    super();
    this.templates = new Map();
    this.compiledTemplates = new Map();
    this.templatesDir = path.join(__dirname, '../templates');
    this.isInitialized = false;
    
    // Template categories
    this.categories = {
      security: 'Security Alerts',
      access: 'Access Control',
      system: 'System Events',
      maintenance: 'Maintenance',
      user: 'User Actions',
      notification: 'General Notifications'
    };

    // Built-in helper functions
    this.helpers = {
      formatDate: this.formatDateHelper,
      formatTime: this.formatTimeHelper,
      formatDateTime: this.formatDateTimeHelper,
      uppercase: this.uppercaseHelper,
      lowercase: this.lowercaseHelper,
      capitalize: this.capitalizeHelper,
      truncate: this.truncateHelper,
      ifEquals: this.ifEqualsHelper,
      ifNotEquals: this.ifNotEqualsHelper,
      json: this.jsonHelper,
      switch: this.switchHelper,
      case: this.caseHelper,
      default: this.defaultHelper
    };

    // Default template configurations
    this.defaultTemplates = {
      'security-unauthorized-access': {
        name: 'Unauthorized Access Attempt',
        category: 'security',
        description: 'Alert for unauthorized access attempts',
        subject: 'Security Alert: Unauthorized Access Attempt',
        variables: ['timestamp', 'userAgent', 'ip', 'location', 'attemptedAction'],
        priority: 'high',
        channels: ['email', 'whatsapp', 'websocket']
      },
      'security-suspicious-activity': {
        name: 'Suspicious Activity Detected',
        category: 'security',
        description: 'Alert for suspicious user activity',
        subject: 'Security Alert: Suspicious Activity',
        variables: ['timestamp', 'userId', 'activity', 'risk_level', 'details'],
        priority: 'high',
        channels: ['email', 'whatsapp', 'websocket']
      },
      'access-door-opened': {
        name: 'Door Access Event',
        category: 'access',
        description: 'Notification when door is opened',
        subject: 'Access Event: Door Opened',
        variables: ['timestamp', 'doorName', 'userName', 'method', 'location'],
        priority: 'medium',
        channels: ['websocket', 'whatsapp']
      },
      'access-door-forced': {
        name: 'Forced Door Entry',
        category: 'access',
        description: 'Critical alert for forced door entry',
        subject: 'CRITICAL: Forced Door Entry Detected',
        variables: ['timestamp', 'doorName', 'location', 'sensorData'],
        priority: 'critical',
        channels: ['email', 'whatsapp', 'websocket']
      },
      'system-backup-completed': {
        name: 'Backup Completed',
        category: 'system',
        description: 'Notification when backup is completed',
        subject: 'System Backup Completed Successfully',
        variables: ['timestamp', 'backupType', 'duration', 'size', 'location'],
        priority: 'low',
        channels: ['email']
      },
      'system-backup-failed': {
        name: 'Backup Failed',
        category: 'system',
        description: 'Alert when backup fails',
        subject: 'System Backup Failed',
        variables: ['timestamp', 'backupType', 'error', 'duration'],
        priority: 'high',
        channels: ['email', 'websocket']
      },
      'maintenance-scheduled': {
        name: 'Scheduled Maintenance',
        category: 'maintenance',
        description: 'Notification for scheduled maintenance',
        subject: 'Scheduled Maintenance Notification',
        variables: ['timestamp', 'maintenanceType', 'duration', 'affectedSystems'],
        priority: 'medium',
        channels: ['email', 'websocket']
      },
      'user-login': {
        name: 'User Login',
        category: 'user',
        description: 'Notification for user login events',
        subject: 'User Login Notification',
        variables: ['timestamp', 'userName', 'ip', 'location', 'device'],
        priority: 'low',
        channels: ['websocket']
      },
      'user-password-changed': {
        name: 'Password Changed',
        category: 'user',
        description: 'Notification when user changes password',
        subject: 'Password Changed Successfully',
        variables: ['timestamp', 'userName', 'ip'],
        priority: 'medium',
        channels: ['email']
      }
    };
  }

  /**
   * Initialize template service
   */
  async initialize() {
    try {
      // Register Handlebars helpers
      this.registerHelpers();

      // Ensure templates directory exists
      await this.ensureTemplatesDirectory();

      // Load existing templates
      await this.loadTemplates();

      // Create default templates if they don't exist
      await this.createDefaultTemplates();

      this.isInitialized = true;

      logger.info('Template service initialized', {
        templateCount: this.templates.size,
        compiledCount: this.compiledTemplates.size,
        templatesDir: this.templatesDir
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize template service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Register Handlebars helpers
   */
  registerHelpers() {
    for (const [name, helper] of Object.entries(this.helpers)) {
      Handlebars.registerHelper(name, helper);
    }

    logger.debug('Handlebars helpers registered', {
      helperCount: Object.keys(this.helpers).length
    });
  }

  /**
   * Ensure templates directory exists
   */
  async ensureTemplatesDirectory() {
    try {
      await fs.access(this.templatesDir);
    } catch (error) {
      await fs.mkdir(this.templatesDir, { recursive: true });
      logger.info('Templates directory created', {
        path: this.templatesDir
      });
    }
  }

  /**
   * Load templates from filesystem
   */
  async loadTemplates() {
    try {
      const templateFiles = await fs.readdir(this.templatesDir);
      
      for (const file of templateFiles) {
        if (file.endsWith('.hbs')) {
          const templateId = path.basename(file, '.hbs');
          await this.loadTemplate(templateId);
        }
      }

      logger.info('Templates loaded from filesystem', {
        count: templateFiles.length
      });
    } catch (error) {
      logger.warn('Failed to load templates from filesystem', {
        error: error.message
      });
    }
  }

  /**
   * Load single template
   */
  async loadTemplate(templateId) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateId}.hbs`);
      const metaPath = path.join(this.templatesDir, `${templateId}.json`);

      // Load template content
      const content = await fs.readFile(templatePath, 'utf8');
      
      // Load template metadata
      let metadata = {};
      try {
        const metaContent = await fs.readFile(metaPath, 'utf8');
        metadata = JSON.parse(metaContent);
      } catch (error) {
        // Metadata file doesn't exist, use defaults
        metadata = this.defaultTemplates[templateId] || {};
      }

      const template = {
        id: templateId,
        content,
        ...metadata,
        lastModified: new Date(),
        filePath: templatePath
      };

      this.templates.set(templateId, template);
      
      // Compile template
      const compiled = Handlebars.compile(content);
      this.compiledTemplates.set(templateId, compiled);

      logger.debug('Template loaded', { templateId });
      
      return template;
    } catch (error) {
      logger.error('Failed to load template', {
        templateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create default templates
   */
  async createDefaultTemplates() {
    for (const [templateId, config] of Object.entries(this.defaultTemplates)) {
      const templatePath = path.join(this.templatesDir, `${templateId}.hbs`);
      const metaPath = path.join(this.templatesDir, `${templateId}.json`);

      try {
        await fs.access(templatePath);
        // Template already exists, skip
        continue;
      } catch (error) {
        // Template doesn't exist, create it
        const defaultContent = this.generateDefaultTemplateContent(templateId, config);
        
        await fs.writeFile(templatePath, defaultContent);
        await fs.writeFile(metaPath, JSON.stringify(config, null, 2));
        
        logger.info('Default template created', { templateId });
      }
    }
  }

  /**
   * Generate default template content
   */
  generateDefaultTemplateContent(templateId, config) {
    const templates = {
      'security-unauthorized-access': `
<div class="alert alert-danger">
  <h2>🚨 Security Alert: Unauthorized Access Attempt</h2>
  <p><strong>Time:</strong> {{formatDateTime timestamp}}</p>
  <p><strong>IP Address:</strong> {{ip}}</p>
  <p><strong>Location:</strong> {{location}}</p>
  <p><strong>User Agent:</strong> {{userAgent}}</p>
  <p><strong>Attempted Action:</strong> {{attemptedAction}}</p>
  <p class="warning">Please review this security event immediately.</p>
</div>
      `.trim(),
      
      'security-suspicious-activity': `
<div class="alert alert-warning">
  <h2>⚠️ Suspicious Activity Detected</h2>
  <p><strong>Time:</strong> {{formatDateTime timestamp}}</p>
  <p><strong>User ID:</strong> {{userId}}</p>
  <p><strong>Activity:</strong> {{activity}}</p>
  <p><strong>Risk Level:</strong> {{uppercase risk_level}}</p>
  <p><strong>Details:</strong> {{details}}</p>
  {{#ifEquals risk_level "high"}}
  <p class="critical">This activity requires immediate attention!</p>
  {{/ifEquals}}
</div>
      `.trim(),

      'access-door-opened': `
<div class="notification">
  <h3>🚪 Door Access Event</h3>
  <p><strong>Time:</strong> {{formatDateTime timestamp}}</p>
  <p><strong>Door:</strong> {{doorName}}</p>
  <p><strong>User:</strong> {{userName}}</p>
  <p><strong>Method:</strong> {{capitalize method}}</p>
  <p><strong>Location:</strong> {{location}}</p>
</div>
      `.trim(),

      'access-door-forced': `
<div class="alert alert-critical">
  <h2>🚨 CRITICAL ALERT: Forced Door Entry</h2>
  <p><strong>Time:</strong> {{formatDateTime timestamp}}</p>
  <p><strong>Door:</strong> {{doorName}}</p>
  <p><strong>Location:</strong> {{location}}</p>
  <p><strong>Sensor Data:</strong> {{json sensorData}}</p>
  <p class="critical">IMMEDIATE RESPONSE REQUIRED!</p>
</div>
      `.trim(),

      'system-backup-completed': `
<div class="notification success">
  <h3>✅ System Backup Completed</h3>
  <p><strong>Time:</strong> {{formatDateTime timestamp}}</p>
  <p><strong>Backup Type:</strong> {{capitalize backupType}}</p>
  <p><strong>Duration:</strong> {{duration}}</p>
  <p><strong>Size:</strong> {{size}}</p>
  <p><strong>Location:</strong> {{location}}</p>
  <p>Backup completed successfully.</p>
</div>
      `.trim(),

      'system-backup-failed': `
<div class="alert alert-error">
  <h2>❌ System Backup Failed</h2>
  <p><strong>Time:</strong> {{formatDateTime timestamp}}</p>
  <p><strong>Backup Type:</strong> {{capitalize backupType}}</p>
  <p><strong>Duration:</strong> {{duration}}</p>
  <p><strong>Error:</strong> {{error}}</p>
  <p class="error">Please check the backup system immediately.</p>
</div>
      `.trim()
    };

    return templates[templateId] || `
<div class="notification">
  <h3>{{capitalize (replace id "-" " ")}}</h3>
  <p><strong>Time:</strong> {{formatDateTime timestamp}}</p>
  {{#each variables}}
  <p><strong>{{capitalize this}}:</strong> {{lookup ../this this}}</p>
  {{/each}}
</div>
    `.trim();
  }

  /**
   * Render template with data
   */
  async render(templateId, data = {}) {
    try {
      const compiled = this.compiledTemplates.get(templateId);
      if (!compiled) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Add system variables
      const contextData = {
        ...data,
        _system: {
          timestamp: new Date().toISOString(),
          templateId,
          serviceName: 'FORTEN'
        }
      };

      const rendered = compiled(contextData);

      logger.debug('Template rendered', {
        templateId,
        dataKeys: Object.keys(data)
      });

      return rendered;
    } catch (error) {
      logger.error('Template rendering failed', {
        templateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Preview template with sample data
   */
  async preview(templateId) {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Generate sample data based on template variables
      const sampleData = this.generateSampleData(template.variables || []);
      
      const rendered = await this.render(templateId, sampleData);

      return {
        templateId,
        template: template.content,
        sampleData,
        rendered,
        metadata: {
          name: template.name,
          category: template.category,
          description: template.description,
          variables: template.variables,
          priority: template.priority,
          channels: template.channels
        }
      };
    } catch (error) {
      logger.error('Template preview failed', {
        templateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate sample data for template variables
   */
  generateSampleData(variables) {
    const sampleData = {};
    
    for (const variable of variables) {
      switch (variable) {
        case 'timestamp':
          sampleData[variable] = new Date().toISOString();
          break;
        case 'userName':
          sampleData[variable] = 'John Doe';
          break;
        case 'userId':
          sampleData[variable] = 'user_123';
          break;
        case 'ip':
          sampleData[variable] = '192.168.1.100';
          break;
        case 'location':
          sampleData[variable] = 'Main Office - Reception';
          break;
        case 'doorName':
          sampleData[variable] = 'Main Entrance';
          break;
        case 'method':
          sampleData[variable] = 'keycard';
          break;
        case 'userAgent':
          sampleData[variable] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
          break;
        case 'attemptedAction':
          sampleData[variable] = 'Access restricted area';
          break;
        case 'activity':
          sampleData[variable] = 'Multiple failed login attempts';
          break;
        case 'risk_level':
          sampleData[variable] = 'high';
          break;
        case 'details':
          sampleData[variable] = 'User attempted to access system 5 times within 2 minutes';
          break;
        case 'backupType':
          sampleData[variable] = 'database';
          break;
        case 'duration':
          sampleData[variable] = '2 minutes 30 seconds';
          break;
        case 'size':
          sampleData[variable] = '125.7 MB';
          break;
        case 'error':
          sampleData[variable] = 'Connection timeout to backup server';
          break;
        case 'maintenanceType':
          sampleData[variable] = 'System Update';
          break;
        case 'affectedSystems':
          sampleData[variable] = ['Access Control', 'Notification System'];
          break;
        case 'device':
          sampleData[variable] = 'Desktop Computer';
          break;
        case 'sensorData':
          sampleData[variable] = { force: 'high', vibration: 'detected', time: '2024-01-15T10:30:00Z' };
          break;
        default:
          sampleData[variable] = `Sample ${variable}`;
          break;
      }
    }
    
    return sampleData;
  }

  /**
   * Create or update template
   */
  async saveTemplate(templateId, templateData) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateId}.hbs`);
      const metaPath = path.join(this.templatesDir, `${templateId}.json`);

      // Validate template syntax
      try {
        Handlebars.compile(templateData.content);
      } catch (error) {
        throw new Error(`Invalid template syntax: ${error.message}`);
      }

      // Save template content
      await fs.writeFile(templatePath, templateData.content);

      // Save metadata
      const metadata = {
        name: templateData.name,
        category: templateData.category,
        description: templateData.description,
        variables: templateData.variables || [],
        priority: templateData.priority || 'medium',
        channels: templateData.channels || ['websocket'],
        lastModified: new Date().toISOString()
      };
      
      await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));

      // Reload template
      await this.loadTemplate(templateId);

      logger.info('Template saved', { templateId });

      this.emit('templateSaved', { templateId, metadata });

      return { success: true, templateId };
    } catch (error) {
      logger.error('Failed to save template', {
        templateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateId}.hbs`);
      const metaPath = path.join(this.templatesDir, `${templateId}.json`);

      // Remove from memory
      this.templates.delete(templateId);
      this.compiledTemplates.delete(templateId);

      // Remove files
      await fs.unlink(templatePath);
      await fs.unlink(metaPath);

      logger.info('Template deleted', { templateId });

      this.emit('templateDeleted', { templateId });

      return { success: true, templateId };
    } catch (error) {
      logger.error('Failed to delete template', {
        templateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all templates
   */
  getAllTemplates() {
    const templates = {};
    
    for (const [id, template] of this.templates.entries()) {
      templates[id] = {
        id: template.id,
        name: template.name,
        category: template.category,
        description: template.description,
        variables: template.variables,
        priority: template.priority,
        channels: template.channels,
        lastModified: template.lastModified
      };
    }
    
    return templates;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category) {
    const templates = {};
    
    for (const [id, template] of this.templates.entries()) {
      if (template.category === category) {
        templates[id] = template;
      }
    }
    
    return templates;
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId) {
    return this.templates.get(templateId) || null;
  }

  /**
   * Handlebars helper functions
   */
  formatDateHelper(date) {
    return new Date(date).toLocaleDateString();
  }

  formatTimeHelper(date) {
    return new Date(date).toLocaleTimeString();
  }

  formatDateTimeHelper(date) {
    return new Date(date).toLocaleString();
  }

  uppercaseHelper(str) {
    return String(str).toUpperCase();
  }

  lowercaseHelper(str) {
    return String(str).toLowerCase();
  }

  capitalizeHelper(str) {
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
  }

  truncateHelper(str, length) {
    return String(str).length > length ? String(str).substring(0, length) + '...' : String(str);
  }

  ifEqualsHelper(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
  }

  ifNotEqualsHelper(arg1, arg2, options) {
    return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
  }

  jsonHelper(context) {
    return JSON.stringify(context, null, 2);
  }

  switchHelper(value, options) {
    this.switch_value = value;
    return options.fn(this);
  }

  caseHelper(value, options) {
    if (value == this.switch_value) {
      return options.fn(this);
    }
  }

  defaultHelper(options) {
    return options.fn(this);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      templateCount: this.templates.size,
      compiledCount: this.compiledTemplates.size,
      categories: this.categories,
      templatesDir: this.templatesDir
    };
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    this.templates.clear();
    this.compiledTemplates.clear();
    this.isInitialized = false;
    
    logger.info('Template service shut down');
  }
}

// Export singleton
module.exports = new TemplateService();