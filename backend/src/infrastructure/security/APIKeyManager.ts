import crypto from 'crypto';
import { Redis } from 'ioredis';
import { EncryptionService } from './EncryptionService';
import { AuditLogger } from '../logging/AuditLogger';

export interface APIKey {
  id: string;
  key: string;
  name: string;
  serviceId: string;
  permissions: string[];
  rateLimit?: {
    requests: number;
    window: number; // in seconds
  };
  ipWhitelist?: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  createdBy: string;
  status: 'active' | 'revoked' | 'expired';
  metadata?: Record<string, any>;
}

export interface APIKeyUsage {
  keyId: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userAgent?: string;
}

export interface APIKeyValidationResult {
  valid: boolean;
  key?: APIKey;
  error?: string;
  rateLimitExceeded?: boolean;
  remainingRequests?: number;
  resetAt?: Date;
}

export class APIKeyManager {
  private readonly keyPrefix = 'apikey:';
  private readonly usagePrefix = 'apikey:usage:';
  private readonly rateLimitPrefix = 'apikey:ratelimit:';

  constructor(
    private readonly redis: Redis,
    private readonly encryption: EncryptionService,
    private readonly auditLogger: AuditLogger
  ) {}

  async createAPIKey(
    name: string,
    serviceId: string,
    permissions: string[],
    createdBy: string,
    options?: {
      expiresInDays?: number;
      rateLimit?: { requests: number; window: number };
      ipWhitelist?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<APIKey> {
    const keyId = this.generateKeyId();
    const rawKey = this.generateSecureKey();
    const hashedKey = await this.hashKey(rawKey);

    const apiKey: APIKey = {
      id: keyId,
      key: hashedKey,
      name,
      serviceId,
      permissions,
      rateLimit: options?.rateLimit,
      ipWhitelist: options?.ipWhitelist,
      expiresAt: options?.expiresInDays 
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
      createdAt: new Date(),
      createdBy,
      status: 'active',
      metadata: options?.metadata
    };

    // Store in Redis
    await this.saveAPIKey(apiKey);

    // Audit log
    await this.auditLogger.log({
      action: 'api_key_created',
      resource: 'api_key',
      resourceId: keyId,
      userId: createdBy,
      ipAddress: '127.0.0.1', // Internal action
      success: true,
      metadata: {
        name,
        serviceId,
        permissions,
        expiresAt: apiKey.expiresAt
      }
    });

    // Return with actual key (only time it's shown)
    return {
      ...apiKey,
      key: `${keyId}.${rawKey}` // Format: id.key
    };
  }

  async validateAPIKey(
    apiKey: string,
    endpoint: string,
    method: string,
    ipAddress: string
  ): Promise<APIKeyValidationResult> {
    try {
      // Parse key format
      const [keyId, rawKey] = apiKey.split('.');
      if (!keyId || !rawKey) {
        return { valid: false, error: 'Invalid API key format' };
      }

      // Get key from storage
      const storedKey = await this.getAPIKey(keyId);
      if (!storedKey) {
        return { valid: false, error: 'API key not found' };
      }

      // Check status
      if (storedKey.status !== 'active') {
        return { valid: false, error: `API key is ${storedKey.status}` };
      }

      // Check expiration
      if (storedKey.expiresAt && storedKey.expiresAt < new Date()) {
        await this.updateKeyStatus(keyId, 'expired');
        return { valid: false, error: 'API key has expired' };
      }

      // Verify key hash
      const hashedKey = await this.hashKey(rawKey);
      if (hashedKey !== storedKey.key) {
        await this.trackInvalidAttempt(keyId, ipAddress);
        return { valid: false, error: 'Invalid API key' };
      }

      // Check IP whitelist
      if (storedKey.ipWhitelist && storedKey.ipWhitelist.length > 0) {
        if (!storedKey.ipWhitelist.includes(ipAddress)) {
          return { valid: false, error: 'IP address not whitelisted' };
        }
      }

      // Check permissions
      const requiredPermission = `${method.toLowerCase()}:${endpoint}`;
      if (!this.hasPermission(storedKey.permissions, requiredPermission)) {
        return { 
          valid: false, 
          error: 'Insufficient permissions',
          key: storedKey 
        };
      }

      // Check rate limit
      if (storedKey.rateLimit) {
        const rateLimitResult = await this.checkRateLimit(
          keyId,
          storedKey.rateLimit
        );
        
        if (!rateLimitResult.allowed) {
          return {
            valid: false,
            error: 'Rate limit exceeded',
            rateLimitExceeded: true,
            remainingRequests: 0,
            resetAt: rateLimitResult.resetAt
          };
        }

        // Update last used
        await this.updateLastUsed(keyId);

        return {
          valid: true,
          key: storedKey,
          remainingRequests: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt
        };
      }

      // Update last used
      await this.updateLastUsed(keyId);

      return { valid: true, key: storedKey };
    } catch (error) {
      console.error('API key validation error:', error);
      return { valid: false, error: 'Internal validation error' };
    }
  }

  async revokeAPIKey(
    keyId: string,
    revokedBy: string,
    reason: string
  ): Promise<void> {
    const key = await this.getAPIKey(keyId);
    if (!key) {
      throw new Error('API key not found');
    }

    await this.updateKeyStatus(keyId, 'revoked');

    await this.auditLogger.log({
      action: 'api_key_revoked',
      resource: 'api_key',
      resourceId: keyId,
      userId: revokedBy,
      ipAddress: '127.0.0.1',
      success: true,
      metadata: {
        name: key.name,
        serviceId: key.serviceId,
        reason
      }
    });
  }

  async rotateAPIKey(
    oldKeyId: string,
    rotatedBy: string
  ): Promise<APIKey> {
    const oldKey = await this.getAPIKey(oldKeyId);
    if (!oldKey) {
      throw new Error('API key not found');
    }

    // Create new key with same permissions
    const newKey = await this.createAPIKey(
      `${oldKey.name} (Rotated)`,
      oldKey.serviceId,
      oldKey.permissions,
      rotatedBy,
      {
        rateLimit: oldKey.rateLimit,
        ipWhitelist: oldKey.ipWhitelist,
        metadata: {
          ...oldKey.metadata,
          rotatedFrom: oldKeyId,
          rotatedAt: new Date()
        }
      }
    );

    // Revoke old key
    await this.revokeAPIKey(oldKeyId, rotatedBy, 'Key rotation');

    return newKey;
  }

  async listAPIKeys(filters?: {
    serviceId?: string;
    status?: string;
    createdBy?: string;
  }): Promise<APIKey[]> {
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.redis.keys(pattern);
    
    const apiKeys: APIKey[] = [];
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const apiKey = JSON.parse(data) as APIKey;
        
        // Apply filters
        if (filters?.serviceId && apiKey.serviceId !== filters.serviceId) continue;
        if (filters?.status && apiKey.status !== filters.status) continue;
        if (filters?.createdBy && apiKey.createdBy !== filters.createdBy) continue;
        
        // Don't return the actual key hash
        delete (apiKey as any).key;
        apiKeys.push(apiKey);
      }
    }

    return apiKeys.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getAPIKeyUsage(
    keyId: string,
    hours: number = 24
  ): Promise<APIKeyUsage[]> {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const usageKey = `${this.usagePrefix}${keyId}`;
    
    const usage = await this.redis.zrangebyscore(
      usageKey,
      cutoff,
      '+inf',
      'WITHSCORES'
    );

    const usageRecords: APIKeyUsage[] = [];
    
    for (let i = 0; i < usage.length; i += 2) {
      const data = JSON.parse(usage[i]);
      usageRecords.push({
        ...data,
        timestamp: new Date(parseInt(usage[i + 1]))
      });
    }

    return usageRecords;
  }

  async trackAPIKeyUsage(
    keyId: string,
    usage: Omit<APIKeyUsage, 'keyId' | 'timestamp'>
  ): Promise<void> {
    const usageKey = `${this.usagePrefix}${keyId}`;
    const timestamp = Date.now();
    
    const usageRecord: APIKeyUsage = {
      keyId,
      timestamp: new Date(timestamp),
      ...usage
    };

    await this.redis.zadd(
      usageKey,
      timestamp,
      JSON.stringify(usageRecord)
    );

    // Expire old usage data (keep 30 days)
    await this.redis.expire(usageKey, 30 * 24 * 60 * 60);
  }

  private async saveAPIKey(apiKey: APIKey): Promise<void> {
    const key = `${this.keyPrefix}${apiKey.id}`;
    await this.redis.set(key, JSON.stringify(apiKey));
    
    // Set expiration if applicable
    if (apiKey.expiresAt) {
      const ttl = Math.floor((apiKey.expiresAt.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        await this.redis.expire(key, ttl);
      }
    }
  }

  private async getAPIKey(keyId: string): Promise<APIKey | null> {
    const key = `${this.keyPrefix}${keyId}`;
    const data = await this.redis.get(key);
    
    if (!data) return null;
    
    return JSON.parse(data) as APIKey;
  }

  private async updateKeyStatus(
    keyId: string,
    status: 'active' | 'revoked' | 'expired'
  ): Promise<void> {
    const apiKey = await this.getAPIKey(keyId);
    if (!apiKey) return;

    apiKey.status = status;
    await this.saveAPIKey(apiKey);
  }

  private async updateLastUsed(keyId: string): Promise<void> {
    const apiKey = await this.getAPIKey(keyId);
    if (!apiKey) return;

    apiKey.lastUsedAt = new Date();
    await this.saveAPIKey(apiKey);
  }

  private async checkRateLimit(
    keyId: string,
    limit: { requests: number; window: number }
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    const key = `${this.rateLimitPrefix}${keyId}`;
    const now = Date.now();
    const windowStart = now - (limit.window * 1000);

    // Remove old entries
    await this.redis.zremrangebyscore(key, '-inf', windowStart);

    // Count requests in window
    const count = await this.redis.zcard(key);

    if (count >= limit.requests) {
      // Get oldest entry to calculate reset time
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldest.length > 1 
        ? new Date(parseInt(oldest[1]) + limit.window * 1000)
        : new Date(now + limit.window * 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt
      };
    }

    // Add current request
    await this.redis.zadd(key, now, now);
    await this.redis.expire(key, limit.window);

    return {
      allowed: true,
      remaining: limit.requests - count - 1,
      resetAt: new Date(now + limit.window * 1000)
    };
  }

  private async trackInvalidAttempt(
    keyId: string,
    ipAddress: string
  ): Promise<void> {
    const attemptKey = `${this.keyPrefix}invalid:${keyId}`;
    const count = await this.redis.incr(attemptKey);
    await this.redis.expire(attemptKey, 3600); // 1 hour

    if (count > 5) {
      // Log security event
      await this.auditLogger.logSecurityEvent(
        'api_key_brute_force',
        'high',
        `Multiple invalid API key attempts for key ${keyId}`,
        ipAddress,
        { keyId, attempts: count }
      );
    }
  }

  private hasPermission(
    permissions: string[],
    required: string
  ): boolean {
    // Check exact match
    if (permissions.includes(required)) return true;

    // Check wildcard permissions
    for (const perm of permissions) {
      if (perm === '*' || perm === 'admin') return true;
      
      // Check pattern matching (e.g., "get:*" matches "get:users")
      const pattern = perm.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(required)) return true;
    }

    return false;
  }

  private generateKeyId(): string {
    return `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateSecureKey(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private async hashKey(key: string): Promise<string> {
    return crypto
      .createHash('sha256')
      .update(key)
      .digest('base64');
  }

  // Middleware for Express
  middleware() {
    return async (req: any, res: any, next: any) => {
      const apiKey = req.headers['x-api-key'] || 
                     req.headers['authorization']?.replace('Bearer ', '');

      if (!apiKey) {
        return next(); // No API key provided, continue
      }

      const validation = await this.validateAPIKey(
        apiKey,
        req.path,
        req.method,
        req.ip
      );

      if (!validation.valid) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: validation.error,
          ...(validation.rateLimitExceeded && {
            rateLimitExceeded: true,
            resetAt: validation.resetAt
          })
        });
      }

      // Attach key info to request
      req.apiKey = validation.key;

      // Track usage
      const startTime = Date.now();
      
      // Override res.end to track response
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        res.end = originalEnd;
        originalEnd.apply(res, args);

        // Track usage asynchronously
        setImmediate(async () => {
          await this.trackAPIKeyUsage(validation.key!.id, {
            endpoint: req.path,
            method: req.method,
            statusCode: res.statusCode,
            responseTime: Date.now() - startTime,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });
        });
      };

      next();
    };
  }
}