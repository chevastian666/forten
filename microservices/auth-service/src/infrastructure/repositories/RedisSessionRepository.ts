import Redis from 'ioredis';
import { ISessionRepository, Session } from '../../domain/repositories/ISessionRepository';

export class RedisSessionRepository implements ISessionRepository {
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly REFRESH_TOKEN_PREFIX = 'refresh:';
  private static readonly USER_SESSIONS_PREFIX = 'user_sessions:';

  constructor(private redis: Redis) {}

  async create(session: Session): Promise<void> {
    const sessionKey = this.getSessionKey(session.id);
    const refreshTokenKey = this.getRefreshTokenKey(session.refreshToken);
    const userSessionsKey = this.getUserSessionsKey(session.userId);

    const sessionData = JSON.stringify({
      id: session.id,
      userId: session.userId,
      token: session.token,
      refreshToken: session.refreshToken,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString()
    });

    const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);

    await Promise.all([
      // Store session by ID
      this.redis.setex(sessionKey, ttl, sessionData),
      
      // Store session ID by refresh token
      this.redis.setex(refreshTokenKey, ttl, session.id),
      
      // Add session to user's session set
      this.redis.sadd(userSessionsKey, session.id),
      
      // Set expiry for user sessions set (cleanup after 30 days)
      this.redis.expire(userSessionsKey, 30 * 24 * 60 * 60)
    ]);
  }

  async findByToken(token: string): Promise<Session | null> {
    // We need to find session by token, which requires scanning all sessions
    // In a real implementation, you might want to maintain a token->sessionId mapping
    const keys = await this.redis.keys(`${RedisSessionRepository.SESSION_PREFIX}*`);
    
    for (const key of keys) {
      const sessionData = await this.redis.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.token === token) {
          return this.mapToSession(session);
        }
      }
    }
    
    return null;
  }

  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    const refreshTokenKey = this.getRefreshTokenKey(refreshToken);
    const sessionId = await this.redis.get(refreshTokenKey);
    
    if (!sessionId) return null;
    
    const sessionKey = this.getSessionKey(sessionId);
    const sessionData = await this.redis.get(sessionKey);
    
    if (!sessionData) return null;
    
    return this.mapToSession(JSON.parse(sessionData));
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const userSessionsKey = this.getUserSessionsKey(userId);
    const sessionIds = await this.redis.smembers(userSessionsKey);
    
    const sessions: Session[] = [];
    
    for (const sessionId of sessionIds) {
      const sessionKey = this.getSessionKey(sessionId);
      const sessionData = await this.redis.get(sessionKey);
      
      if (sessionData) {
        const session = this.mapToSession(JSON.parse(sessionData));
        
        // Check if session is expired
        if (session.expiresAt > new Date()) {
          sessions.push(session);
        } else {
          // Remove expired session from user's set
          await this.redis.srem(userSessionsKey, sessionId);
        }
      }
    }
    
    return sessions;
  }

  async delete(sessionId: string): Promise<void> {
    const sessionKey = this.getSessionKey(sessionId);
    const sessionData = await this.redis.get(sessionKey);
    
    if (sessionData) {
      const session = JSON.parse(sessionData);
      const refreshTokenKey = this.getRefreshTokenKey(session.refreshToken);
      const userSessionsKey = this.getUserSessionsKey(session.userId);
      
      await Promise.all([
        this.redis.del(sessionKey),
        this.redis.del(refreshTokenKey),
        this.redis.srem(userSessionsKey, sessionId)
      ]);
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    const userSessionsKey = this.getUserSessionsKey(userId);
    const sessionIds = await this.redis.smembers(userSessionsKey);
    
    if (sessionIds.length === 0) return;
    
    const deletePromises: Promise<any>[] = [];
    
    for (const sessionId of sessionIds) {
      const sessionKey = this.getSessionKey(sessionId);
      const sessionData = await this.redis.get(sessionKey);
      
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const refreshTokenKey = this.getRefreshTokenKey(session.refreshToken);
        
        deletePromises.push(
          this.redis.del(sessionKey),
          this.redis.del(refreshTokenKey)
        );
      }
    }
    
    // Delete user sessions set
    deletePromises.push(this.redis.del(userSessionsKey));
    
    await Promise.all(deletePromises);
  }

  async deleteExpired(): Promise<number> {
    // Redis automatically handles TTL expiration, but we clean up user session sets
    const userSessionKeys = await this.redis.keys(`${RedisSessionRepository.USER_SESSIONS_PREFIX}*`);
    let deletedCount = 0;
    
    for (const userSessionKey of userSessionKeys) {
      const sessionIds = await this.redis.smembers(userSessionKey);
      const expiredSessionIds: string[] = [];
      
      for (const sessionId of sessionIds) {
        const sessionKey = this.getSessionKey(sessionId);
        const exists = await this.redis.exists(sessionKey);
        
        if (!exists) {
          expiredSessionIds.push(sessionId);
        }
      }
      
      if (expiredSessionIds.length > 0) {
        await this.redis.srem(userSessionKey, ...expiredSessionIds);
        deletedCount += expiredSessionIds.length;
      }
    }
    
    return deletedCount;
  }

  async extendSession(sessionId: string, newExpiresAt: Date): Promise<void> {
    const sessionKey = this.getSessionKey(sessionId);
    const sessionData = await this.redis.get(sessionKey);
    
    if (!sessionData) return;
    
    const session = JSON.parse(sessionData);
    session.expiresAt = newExpiresAt.toISOString();
    
    const newTtl = Math.floor((newExpiresAt.getTime() - Date.now()) / 1000);
    const refreshTokenKey = this.getRefreshTokenKey(session.refreshToken);
    
    await Promise.all([
      this.redis.setex(sessionKey, newTtl, JSON.stringify(session)),
      this.redis.expire(refreshTokenKey, newTtl)
    ]);
  }

  async countActiveSessionsByUserId(userId: string): Promise<number> {
    const sessions = await this.findByUserId(userId);
    return sessions.length;
  }

  private getSessionKey(sessionId: string): string {
    return `${RedisSessionRepository.SESSION_PREFIX}${sessionId}`;
  }

  private getRefreshTokenKey(refreshToken: string): string {
    return `${RedisSessionRepository.REFRESH_TOKEN_PREFIX}${refreshToken}`;
  }

  private getUserSessionsKey(userId: string): string {
    return `${RedisSessionRepository.USER_SESSIONS_PREFIX}${userId}`;
  }

  private mapToSession(data: any): Session {
    return {
      id: data.id,
      userId: data.userId,
      token: data.token,
      refreshToken: data.refreshToken,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      expiresAt: new Date(data.expiresAt),
      createdAt: new Date(data.createdAt)
    };
  }
}