import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

export interface AuditEvent {
  id?: string;
  timestamp?: Date;
  userId?: string;
  username?: string;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  requestBody?: any;
  responseBody?: any;
  metadata?: Record<string, any>;
  tags?: string[];
  risk?: 'low' | 'medium' | 'high' | 'critical';
  compliance?: {
    standard: string;
    requirement: string;
  }[];
}

export interface AuditLoggerConfig {
  serviceName: string;
  elasticsearch?: {
    node: string;
    auth?: {
      username: string;
      password: string;
    };
    index?: string;
  };
  file?: {
    dirname: string;
    filename: string;
    maxsize?: number;
    maxFiles?: number;
  };
  console?: boolean;
  sensitiveFields?: string[];
  complianceMode?: boolean;
}

export class AuditLogger {
  private readonly logger: winston.Logger;
  private readonly sensitiveFields: Set<string>;
  private readonly complianceMode: boolean;

  constructor(config: AuditLoggerConfig) {
    this.sensitiveFields = new Set(config.sensitiveFields || [
      'password',
      'token',
      'secret',
      'pin',
      'ssn',
      'creditCard',
      'cvv',
      'apiKey',
      'privateKey'
    ]);
    
    this.complianceMode = config.complianceMode || false;
    this.logger = this.createLogger(config);
  }

  private createLogger(config: AuditLoggerConfig): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (config.console) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}] ${message} ${JSON.stringify(meta)}`;
          })
        )
      }));
    }

    // File transport
    if (config.file) {
      transports.push(new winston.transports.File({
        dirname: config.file.dirname,
        filename: config.file.filename || 'audit.log',
        maxsize: config.file.maxsize || 100 * 1024 * 1024, // 100MB
        maxFiles: config.file.maxFiles || 30,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));
    }

    // Elasticsearch transport
    if (config.elasticsearch) {
      transports.push(new ElasticsearchTransport({
        clientOpts: {
          node: config.elasticsearch.node,
          auth: config.elasticsearch.auth
        },
        index: config.elasticsearch.index || 'audit-logs',
        level: 'info',
        transformer: (logData: any) => {
          return {
            '@timestamp': logData.timestamp || new Date().toISOString(),
            severity: logData.level,
            service: config.serviceName,
            ...logData.meta
          };
        }
      }));
    }

    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
      defaultMeta: { service: config.serviceName }
    });
  }

  async log(event: AuditEvent): Promise<void> {
    // Generate ID and timestamp if not provided
    const auditEvent: AuditEvent = {
      id: event.id || uuidv4(),
      timestamp: event.timestamp || new Date(),
      ...event
    };

    // Sanitize sensitive data
    const sanitizedEvent = this.sanitizeEvent(auditEvent);

    // Calculate risk score if not provided
    if (!sanitizedEvent.risk) {
      sanitizedEvent.risk = this.calculateRiskScore(sanitizedEvent);
    }

    // Add compliance tags if in compliance mode
    if (this.complianceMode) {
      sanitizedEvent.compliance = this.getComplianceRequirements(sanitizedEvent);
    }

    // Log the event
    this.logger.info('audit_event', sanitizedEvent);

    // Additional actions for high-risk events
    if (sanitizedEvent.risk === 'high' || sanitizedEvent.risk === 'critical') {
      await this.handleHighRiskEvent(sanitizedEvent);
    }
  }

  private sanitizeEvent(event: AuditEvent): AuditEvent {
    const sanitized = { ...event };

    // Sanitize request body
    if (sanitized.requestBody) {
      sanitized.requestBody = this.sanitizeObject(sanitized.requestBody);
    }

    // Sanitize response body
    if (sanitized.responseBody) {
      sanitized.responseBody = this.sanitizeObject(sanitized.responseBody);
    }

    // Sanitize metadata
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeObject(sanitized.metadata);
    }

    return sanitized;
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else if (typeof value === 'string' && this.containsSensitiveData(value)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private isSensitiveField(field: string): boolean {
    const lowerField = field.toLowerCase();
    for (const sensitive of this.sensitiveFields) {
      if (lowerField.includes(sensitive.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private containsSensitiveData(value: string): boolean {
    // Check for common patterns
    const patterns = [
      /^[A-Za-z0-9+/]{40,}={0,2}$/, // Base64 encoded data
      /^Bearer\s+[\w-]+\.[\w-]+\.[\w-]+$/, // JWT token
      /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/, // Credit card
      /^[0-9]{3,4}$/, // CVV
      /^[0-9]{9}$/, // SSN
    ];

    return patterns.some(pattern => pattern.test(value));
  }

  private calculateRiskScore(event: AuditEvent): 'low' | 'medium' | 'high' | 'critical' {
    let score = 0;

    // Failed actions increase risk
    if (!event.success) {
      score += 2;
    }

    // Certain actions are inherently risky
    const riskyActions = [
      'delete', 'remove', 'destroy',
      'admin', 'sudo', 'elevate',
      'export', 'download', 'transfer',
      'modify_security', 'change_permission'
    ];
    
    if (riskyActions.some(action => event.action.toLowerCase().includes(action))) {
      score += 3;
    }

    // Certain resources are sensitive
    const sensitiveResources = [
      'user', 'role', 'permission',
      'payment', 'billing', 'invoice',
      'api_key', 'token', 'secret',
      'backup', 'export', 'report'
    ];

    if (sensitiveResources.some(resource => event.resource.toLowerCase().includes(resource))) {
      score += 2;
    }

    // Error status codes
    if (event.statusCode && event.statusCode >= 400) {
      score += 1;
    }

    // Multiple failed attempts
    if (event.metadata?.failedAttempts && event.metadata.failedAttempts > 3) {
      score += 2;
    }

    // Determine risk level
    if (score >= 7) return 'critical';
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  private getComplianceRequirements(event: AuditEvent): Array<{
    standard: string;
    requirement: string;
  }> {
    const requirements = [];

    // GDPR
    if (event.resource.includes('user') || event.resource.includes('personal')) {
      requirements.push({
        standard: 'GDPR',
        requirement: 'Article 30 - Records of processing activities'
      });
    }

    // PCI DSS
    if (event.resource.includes('payment') || event.resource.includes('card')) {
      requirements.push({
        standard: 'PCI-DSS',
        requirement: '10.2 - Implement automated audit trails'
      });
    }

    // HIPAA
    if (event.resource.includes('health') || event.resource.includes('medical')) {
      requirements.push({
        standard: 'HIPAA',
        requirement: '164.312(b) - Audit controls'
      });
    }

    // SOC 2
    requirements.push({
      standard: 'SOC2',
      requirement: 'CC6.1 - Logical and physical access controls'
    });

    return requirements;
  }

  private async handleHighRiskEvent(event: AuditEvent): Promise<void> {
    // Log to separate high-risk channel
    this.logger.warn('high_risk_event', {
      ...event,
      alert: true,
      alertChannel: 'security'
    });

    // You could implement additional actions here:
    // - Send immediate notifications
    // - Trigger security workflows
    // - Create incidents
    // - Block user/IP
  }

  // Convenience methods for common audit events

  async logAuthentication(
    success: boolean,
    username: string,
    ipAddress: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: success ? 'login_success' : 'login_failed',
      resource: 'authentication',
      username,
      ipAddress,
      success,
      metadata
    });
  }

  async logAccessControl(
    userId: string,
    resource: string,
    action: string,
    allowed: boolean,
    ipAddress: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: `access_${allowed ? 'granted' : 'denied'}`,
      resource,
      userId,
      ipAddress,
      success: allowed,
      metadata: {
        ...metadata,
        requestedAction: action
      }
    });
  }

  async logDataAccess(
    userId: string,
    resource: string,
    operation: 'read' | 'write' | 'delete',
    recordIds: string[],
    ipAddress: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: `data_${operation}`,
      resource,
      userId,
      ipAddress,
      success: true,
      metadata: {
        ...metadata,
        recordCount: recordIds.length,
        recordIds: recordIds.slice(0, 10) // Limit to prevent log bloat
      }
    });
  }

  async logConfigChange(
    userId: string,
    configName: string,
    oldValue: any,
    newValue: any,
    ipAddress: string
  ): Promise<void> {
    await this.log({
      action: 'config_change',
      resource: 'configuration',
      userId,
      ipAddress,
      success: true,
      metadata: {
        configName,
        oldValue: this.sanitizeObject(oldValue),
        newValue: this.sanitizeObject(newValue)
      }
    });
  }

  async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    ipAddress: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: `security_${eventType}`,
      resource: 'security',
      ipAddress,
      success: false,
      risk: severity,
      metadata: {
        ...metadata,
        description
      }
    });
  }

  // Query methods for audit logs

  async query(filters: {
    userId?: string;
    ipAddress?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    risk?: string[];
  }): Promise<AuditEvent[]> {
    // This would typically query your audit log storage
    // Implementation depends on your storage backend
    throw new Error('Query method not implemented');
  }

  async getComplianceReport(
    standard: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Generate compliance-specific reports
    throw new Error('Compliance report not implemented');
  }
}