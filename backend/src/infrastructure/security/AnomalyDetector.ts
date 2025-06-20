import { Redis } from 'ioredis';
import { Logger } from '../logging/Logger';

export interface AnomalyEvent {
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  eventType: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AnomalyPattern {
  name: string;
  description: string;
  check: (events: AnomalyEvent[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'alert' | 'block' | 'challenge';
}

export interface AnomalyDetectionConfig {
  windowSizeMinutes: number;
  maxEventsPerWindow: number;
  suspiciousIPThreshold: number;
  geoVelocityThresholdKm: number;
  patterns: AnomalyPattern[];
}

export class AnomalyDetector {
  private readonly logger: Logger;
  private readonly config: AnomalyDetectionConfig;
  private readonly defaultPatterns: AnomalyPattern[];

  constructor(
    private readonly redis: Redis,
    config?: Partial<AnomalyDetectionConfig>
  ) {
    this.logger = new Logger('AnomalyDetector');
    this.defaultPatterns = this.createDefaultPatterns();
    this.config = {
      windowSizeMinutes: 60,
      maxEventsPerWindow: 1000,
      suspiciousIPThreshold: 5,
      geoVelocityThresholdKm: 500,
      patterns: this.defaultPatterns,
      ...config
    };
  }

  private createDefaultPatterns(): AnomalyPattern[] {
    return [
      {
        name: 'rapid_login_attempts',
        description: 'Multiple failed login attempts in short time',
        severity: 'high',
        action: 'block',
        check: (events) => {
          const loginEvents = events.filter(e => e.eventType === 'login_failed');
          return loginEvents.length > 5 && this.timeSpan(loginEvents) < 300000; // 5 min
        }
      },
      {
        name: 'credential_stuffing',
        description: 'Login attempts with different usernames from same IP',
        severity: 'critical',
        action: 'block',
        check: (events) => {
          const loginEvents = events.filter(e => 
            e.eventType === 'login_attempt' || e.eventType === 'login_failed'
          );
          const uniqueUsers = new Set(loginEvents.map(e => e.userId || e.metadata?.username));
          return uniqueUsers.size > 10 && this.timeSpan(loginEvents) < 600000; // 10 min
        }
      },
      {
        name: 'impossible_travel',
        description: 'Login from geographically impossible locations',
        severity: 'critical',
        action: 'challenge',
        check: (events) => {
          const loginEvents = events
            .filter(e => e.eventType === 'login_success')
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          
          for (let i = 1; i < loginEvents.length; i++) {
            const prev = loginEvents[i - 1];
            const curr = loginEvents[i];
            
            if (prev.metadata?.location && curr.metadata?.location) {
              const distance = this.calculateDistance(
                prev.metadata.location,
                curr.metadata.location
              );
              const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime();
              const speedKmh = (distance / timeDiff) * 3600000;
              
              if (speedKmh > 1000) { // Faster than commercial flight
                return true;
              }
            }
          }
          return false;
        }
      },
      {
        name: 'account_enumeration',
        description: 'Systematic checking of account existence',
        severity: 'medium',
        action: 'alert',
        check: (events) => {
          const checkEvents = events.filter(e => 
            e.eventType === 'user_not_found' || e.eventType === 'email_check'
          );
          return checkEvents.length > 20 && this.timeSpan(checkEvents) < 300000; // 5 min
        }
      },
      {
        name: 'token_replay',
        description: 'Reuse of expired or revoked tokens',
        severity: 'high',
        action: 'block',
        check: (events) => {
          const tokenEvents = events.filter(e => 
            e.eventType === 'token_expired' || e.eventType === 'token_revoked'
          );
          return tokenEvents.length > 3;
        }
      },
      {
        name: 'api_scanning',
        description: 'Systematic API endpoint discovery attempts',
        severity: 'medium',
        action: 'alert',
        check: (events) => {
          const notFoundEvents = events.filter(e => e.eventType === 'route_not_found');
          const uniqueRoutes = new Set(notFoundEvents.map(e => e.metadata?.path));
          return uniqueRoutes.size > 50 && this.timeSpan(notFoundEvents) < 600000; // 10 min
        }
      },
      {
        name: 'data_exfiltration',
        description: 'Unusual data access patterns',
        severity: 'high',
        action: 'alert',
        check: (events) => {
          const dataEvents = events.filter(e => 
            e.eventType === 'data_export' || e.eventType === 'bulk_read'
          );
          const totalRecords = dataEvents.reduce((sum, e) => 
            sum + (e.metadata?.recordCount || 0), 0
          );
          return totalRecords > 10000 || dataEvents.length > 50;
        }
      },
      {
        name: 'privilege_escalation',
        description: 'Attempts to access unauthorized resources',
        severity: 'critical',
        action: 'block',
        check: (events) => {
          const forbiddenEvents = events.filter(e => 
            e.eventType === 'access_denied' || e.eventType === 'forbidden'
          );
          return forbiddenEvents.length > 10 && this.timeSpan(forbiddenEvents) < 300000; // 5 min
        }
      },
      {
        name: 'session_hijacking',
        description: 'Session used from different device/location',
        severity: 'critical',
        action: 'block',
        check: (events) => {
          const sessionEvents = events.filter(e => e.eventType === 'session_mismatch');
          return sessionEvents.length > 0;
        }
      },
      {
        name: 'pin_brute_force',
        description: 'Multiple PIN validation attempts',
        severity: 'high',
        action: 'block',
        check: (events) => {
          const pinEvents = events.filter(e => e.eventType === 'pin_invalid');
          const uniquePins = new Set(pinEvents.map(e => e.metadata?.pin));
          return uniquePins.size > 5 && this.timeSpan(pinEvents) < 300000; // 5 min
        }
      }
    ];
  }

  async trackEvent(event: AnomalyEvent): Promise<void> {
    const key = this.getEventKey(event);
    const serialized = JSON.stringify(event);
    
    // Add to sorted set with timestamp as score
    await this.redis.zadd(key, event.timestamp.getTime(), serialized);
    
    // Set expiration
    await this.redis.expire(key, this.config.windowSizeMinutes * 60);
    
    // Check for anomalies
    await this.checkAnomalies(event);
  }

  private async checkAnomalies(triggerEvent: AnomalyEvent): Promise<void> {
    // Get recent events for the user/IP
    const events = await this.getRecentEvents(triggerEvent);
    
    // Check each pattern
    for (const pattern of this.config.patterns) {
      try {
        if (pattern.check(events)) {
          await this.handleAnomaly(pattern, triggerEvent, events);
        }
      } catch (error) {
        this.logger.error('Error checking pattern', {
          pattern: pattern.name,
          error
        });
      }
    }
  }

  private async getRecentEvents(event: AnomalyEvent): Promise<AnomalyEvent[]> {
    const keys: string[] = [];
    
    // Get events by user
    if (event.userId) {
      keys.push(`anomaly:user:${event.userId}`);
    }
    
    // Get events by IP
    keys.push(`anomaly:ip:${event.ipAddress}`);
    
    // Get events by user-agent if available
    if (event.userAgent) {
      keys.push(`anomaly:ua:${this.hashUserAgent(event.userAgent)}`);
    }
    
    const events: AnomalyEvent[] = [];
    const cutoff = Date.now() - (this.config.windowSizeMinutes * 60 * 1000);
    
    for (const key of keys) {
      const data = await this.redis.zrangebyscore(key, cutoff, '+inf');
      for (const item of data) {
        try {
          events.push(JSON.parse(item));
        } catch (error) {
          this.logger.error('Error parsing event', { error });
        }
      }
    }
    
    // Deduplicate and sort by timestamp
    const uniqueEvents = Array.from(
      new Map(events.map(e => [JSON.stringify(e), e])).values()
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return uniqueEvents.slice(-this.config.maxEventsPerWindow);
  }

  private async handleAnomaly(
    pattern: AnomalyPattern,
    triggerEvent: AnomalyEvent,
    relatedEvents: AnomalyEvent[]
  ): Promise<void> {
    const anomalyId = this.generateAnomalyId();
    
    this.logger.warn('Anomaly detected', {
      anomalyId,
      pattern: pattern.name,
      severity: pattern.severity,
      userId: triggerEvent.userId,
      ipAddress: triggerEvent.ipAddress,
      eventCount: relatedEvents.length
    });

    // Store anomaly details
    await this.storeAnomaly({
      id: anomalyId,
      pattern: pattern.name,
      severity: pattern.severity,
      triggerEvent,
      relatedEvents: relatedEvents.map(e => ({
        eventType: e.eventType,
        timestamp: e.timestamp,
        metadata: e.metadata
      })),
      detectedAt: new Date(),
      action: pattern.action
    });

    // Take action based on pattern configuration
    switch (pattern.action) {
      case 'block':
        await this.blockAccess(triggerEvent);
        break;
      case 'challenge':
        await this.requireChallenge(triggerEvent);
        break;
      case 'alert':
        await this.sendAlert(pattern, triggerEvent);
        break;
      case 'log':
        // Already logged above
        break;
    }
  }

  private async blockAccess(event: AnomalyEvent): Promise<void> {
    const blockDuration = 3600; // 1 hour in seconds
    
    if (event.userId) {
      await this.redis.setex(
        `blocked:user:${event.userId}`,
        blockDuration,
        JSON.stringify({
          reason: 'anomaly_detected',
          blockedAt: new Date().toISOString()
        })
      );
    }
    
    await this.redis.setex(
      `blocked:ip:${event.ipAddress}`,
      blockDuration,
      JSON.stringify({
        reason: 'anomaly_detected',
        blockedAt: new Date().toISOString()
      })
    );
  }

  private async requireChallenge(event: AnomalyEvent): Promise<void> {
    if (event.userId) {
      await this.redis.setex(
        `challenge:user:${event.userId}`,
        3600, // 1 hour
        JSON.stringify({
          reason: 'anomaly_detected',
          requiredAt: new Date().toISOString()
        })
      );
    }
  }

  private async sendAlert(pattern: AnomalyPattern, event: AnomalyEvent): Promise<void> {
    // Implement your alerting logic here
    // This could send emails, SMS, push notifications, etc.
    this.logger.alert('Security alert', {
      pattern: pattern.name,
      severity: pattern.severity,
      userId: event.userId,
      ipAddress: event.ipAddress
    });
  }

  private async storeAnomaly(anomaly: any): Promise<void> {
    const key = `anomaly:details:${anomaly.id}`;
    await this.redis.setex(
      key,
      86400 * 7, // Keep for 7 days
      JSON.stringify(anomaly)
    );
    
    // Add to anomaly index
    await this.redis.zadd(
      'anomaly:index',
      anomaly.detectedAt.getTime(),
      anomaly.id
    );
  }

  async isBlocked(userId?: string, ipAddress?: string): Promise<{
    blocked: boolean;
    reason?: string;
    expiresAt?: Date;
  }> {
    const keys: string[] = [];
    
    if (userId) {
      keys.push(`blocked:user:${userId}`);
    }
    if (ipAddress) {
      keys.push(`blocked:ip:${ipAddress}`);
    }
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const ttl = await this.redis.ttl(key);
        const blockInfo = JSON.parse(data);
        return {
          blocked: true,
          reason: blockInfo.reason,
          expiresAt: new Date(Date.now() + ttl * 1000)
        };
      }
    }
    
    return { blocked: false };
  }

  async requiresChallenge(userId: string): Promise<boolean> {
    const data = await this.redis.get(`challenge:user:${userId}`);
    return !!data;
  }

  async getAnomalyHistory(
    userId?: string,
    ipAddress?: string,
    hours: number = 24
  ): Promise<any[]> {
    const cutoff = Date.now() - (hours * 3600 * 1000);
    const anomalyIds = await this.redis.zrangebyscore('anomaly:index', cutoff, '+inf');
    
    const anomalies = [];
    for (const id of anomalyIds) {
      const data = await this.redis.get(`anomaly:details:${id}`);
      if (data) {
        const anomaly = JSON.parse(data);
        if (
          (userId && anomaly.triggerEvent.userId === userId) ||
          (ipAddress && anomaly.triggerEvent.ipAddress === ipAddress)
        ) {
          anomalies.push(anomaly);
        }
      }
    }
    
    return anomalies;
  }

  private getEventKey(event: AnomalyEvent): string {
    if (event.userId) {
      return `anomaly:user:${event.userId}`;
    }
    return `anomaly:ip:${event.ipAddress}`;
  }

  private timeSpan(events: AnomalyEvent[]): number {
    if (events.length < 2) return 0;
    const timestamps = events.map(e => e.timestamp.getTime());
    return Math.max(...timestamps) - Math.min(...timestamps);
  }

  private calculateDistance(loc1: any, loc2: any): number {
    // Haversine formula for distance between two points
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(loc2.lat - loc1.lat);
    const dLon = this.toRad(loc2.lon - loc1.lon);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(loc1.lat)) * Math.cos(this.toRad(loc2.lat)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI/180);
  }

  private hashUserAgent(userAgent: string): string {
    // Simple hash function for user agent
    let hash = 0;
    for (let i = 0; i < userAgent.length; i++) {
      const char = userAgent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  private generateAnomalyId(): string {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}