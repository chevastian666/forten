// Service-to-service authentication using JWT tokens

import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { Logger } from '../logger';

// Service authentication configuration
export interface ServiceAuthConfig {
  serviceName: string;
  serviceSecret: string;
  jwtSecret: string;
  tokenExpiry?: string;
  issuer?: string;
  audience?: string[];
  logger?: Logger;
}

// Service token payload
export interface ServiceTokenPayload {
  sub: string; // Service name
  iss: string; // Issuer
  aud: string[]; // Audience (allowed services)
  iat: number; // Issued at
  exp: number; // Expiry
  jti: string; // JWT ID
  fingerprint?: string; // Service fingerprint
  permissions?: string[]; // Service permissions
}

// Service authentication token
export interface ServiceAuthToken {
  token: string;
  expiresAt: Date;
  fingerprint: string;
}

// Service identity verification
export interface ServiceIdentity {
  name: string;
  fingerprint: string;
  verified: boolean;
  permissions: string[];
}

// Service authentication class
export class ServiceAuth {
  private config: ServiceAuthConfig;
  private logger?: Logger;
  private tokenCache: Map<string, ServiceAuthToken> = new Map();

  constructor(config: ServiceAuthConfig) {
    this.config = {
      tokenExpiry: '1h',
      issuer: 'forten-auth',
      audience: [],
      ...config,
    };
    this.logger = config.logger;
  }

  // Generate service token
  async generateToken(targetService?: string): Promise<ServiceAuthToken> {
    const cacheKey = targetService || 'default';
    
    // Check cache
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }

    const fingerprint = this.generateFingerprint();
    const jti = randomBytes(16).toString('hex');
    
    const payload: ServiceTokenPayload = {
      sub: this.config.serviceName,
      iss: this.config.issuer!,
      aud: targetService ? [targetService] : this.config.audience!,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiry(this.config.tokenExpiry!),
      jti,
      fingerprint,
      permissions: this.getServicePermissions(),
    };

    const token = jwt.sign(payload, this.config.jwtSecret, {
      algorithm: 'HS256',
    });

    const authToken: ServiceAuthToken = {
      token,
      expiresAt: new Date(payload.exp * 1000),
      fingerprint,
    };

    // Cache token
    this.tokenCache.set(cacheKey, authToken);

    this.logger?.debug('Service token generated', {
      service: this.config.serviceName,
      target: targetService,
      expiresAt: authToken.expiresAt,
    });

    return authToken;
  }

  // Verify service token
  async verifyToken(token: string, fromService?: string): Promise<ServiceIdentity> {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        algorithms: ['HS256'],
        issuer: this.config.issuer,
        audience: this.config.serviceName,
      }) as ServiceTokenPayload;

      // Verify service name if provided
      if (fromService && decoded.sub !== fromService) {
        throw new Error('Service name mismatch');
      }

      // Verify fingerprint
      const expectedFingerprint = this.generateFingerprint(decoded.sub);
      const verified = decoded.fingerprint === expectedFingerprint;

      const identity: ServiceIdentity = {
        name: decoded.sub,
        fingerprint: decoded.fingerprint || '',
        verified,
        permissions: decoded.permissions || [],
      };

      this.logger?.debug('Service token verified', {
        fromService: decoded.sub,
        verified,
      });

      return identity;
    } catch (error) {
      this.logger?.error('Service token verification failed', error as Error);
      throw error;
    }
  }

  // Create authorization header
  async createAuthHeader(targetService?: string): Promise<Record<string, string>> {
    const authToken = await this.generateToken(targetService);
    
    return {
      'Authorization': `Bearer ${authToken.token}`,
      'X-Service-Name': this.config.serviceName,
      'X-Service-Fingerprint': authToken.fingerprint,
    };
  }

  // Extract service identity from headers
  extractServiceIdentity(headers: Record<string, string | string[]>): string | null {
    const serviceName = headers['x-service-name'] || headers['X-Service-Name'];
    
    if (Array.isArray(serviceName)) {
      return serviceName[0] || null;
    }
    
    return serviceName || null;
  }

  // Validate service request
  async validateRequest(
    headers: Record<string, string | string[]>,
    requiredPermissions?: string[]
  ): Promise<ServiceIdentity> {
    const authHeader = headers['authorization'] || headers['Authorization'];
    
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const token = Array.isArray(authHeader) 
      ? authHeader[0].replace('Bearer ', '')
      : authHeader.replace('Bearer ', '');

    const serviceName = this.extractServiceIdentity(headers);
    const identity = await this.verifyToken(token, serviceName || undefined);

    // Check permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermissions = requiredPermissions.every(perm => 
        identity.permissions.includes(perm)
      );
      
      if (!hasPermissions) {
        throw new Error('Insufficient permissions');
      }
    }

    return identity;
  }

  // Generate service fingerprint
  private generateFingerprint(serviceName?: string): string {
    const name = serviceName || this.config.serviceName;
    const data = `${name}:${this.config.serviceSecret}`;
    
    return createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16);
  }

  // Get service permissions
  private getServicePermissions(): string[] {
    // Define permissions based on service type
    const servicePermissions: Record<string, string[]> = {
      'auth-service': ['user:read', 'user:write', 'token:generate', 'token:verify'],
      'access-service': ['access:read', 'access:write', 'door:control', 'visitor:manage'],
      'monitoring-service': ['camera:read', 'camera:control', 'alert:read', 'alert:write'],
      'communication-service': ['notification:send', 'template:read', 'campaign:manage'],
      'analytics-service': ['data:read', 'report:generate', 'metric:calculate'],
      'api-gateway': ['*'], // Full access
    };

    return servicePermissions[this.config.serviceName] || [];
  }

  // Parse expiry string to seconds
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      throw new Error('Invalid expiry format');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        throw new Error('Invalid expiry unit');
    }
  }

  // Clear token cache
  clearCache(): void {
    this.tokenCache.clear();
  }

  // Revoke token (add to blacklist)
  async revokeToken(jti: string): Promise<void> {
    // In a production environment, this would add the token to a blacklist
    // stored in Redis or another fast storage system
    this.logger?.info('Token revoked', { jti });
  }
}

// Express middleware for service authentication
export const serviceAuthMiddleware = (serviceAuth: ServiceAuth, requiredPermissions?: string[]) => {
  return async (req: any, res: any, next: any) => {
    try {
      const identity = await serviceAuth.validateRequest(req.headers, requiredPermissions);
      
      // Attach service identity to request
      req.serviceIdentity = identity;
      
      next();
    } catch (error) {
      res.status(401).json({
        error: 'Unauthorized',
        message: (error as Error).message,
      });
    }
  };
};

// Create service auth instance
export const createServiceAuth = (config: ServiceAuthConfig): ServiceAuth => {
  return new ServiceAuth(config);
};