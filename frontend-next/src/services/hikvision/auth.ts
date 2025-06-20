/**
 * HikCentral Authentication Service
 * Handles authentication and signature generation for HikCentral API
 */

import crypto from 'crypto';
import { HIKVISION_CONFIG } from './config';

interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

class HikCentralAuth {
  private static instance: HikCentralAuth;
  private token: AuthToken | null = null;
  private tokenExpiry: Date | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): HikCentralAuth {
    if (!HikCentralAuth.instance) {
      HikCentralAuth.instance = new HikCentralAuth();
    }
    return HikCentralAuth.instance;
  }

  /**
   * Generate signature for API requests
   * Based on HikCentral OpenAPI signature algorithm
   */
  generateSignature(
    method: string,
    url: string,
    headers: Record<string, string>,
    appSecret: string
  ): string {
    // Create string to sign
    const stringToSign = [
      method.toUpperCase(),
      headers['Accept'] || '*/*',
      headers['Content-MD5'] || '',
      headers['Content-Type'] || '',
      headers['X-Ca-Timestamp'] || '',
      this.buildCanonicalHeaders(headers),
      url
    ].join('\n');

    // Generate HMAC-SHA256 signature
    const signature = crypto
      .createHmac('sha256', appSecret)
      .update(stringToSign)
      .digest('base64');

    return signature;
  }

  /**
   * Build canonical headers for signature
   */
  private buildCanonicalHeaders(headers: Record<string, string>): string {
    const canonicalHeaders = Object.keys(headers)
      .filter(key => key.toLowerCase().startsWith('x-ca-'))
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key]}`)
      .join('\n');
    
    return canonicalHeaders;
  }

  /**
   * Generate nonce for request
   */
  generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get current timestamp in milliseconds
   */
  getTimestamp(): string {
    return Date.now().toString();
  }

  /**
   * Prepare request headers with authentication
   */
  async prepareHeaders(
    method: string,
    path: string,
    additionalHeaders: Record<string, string> = {}
  ): Promise<Record<string, string>> {
    const timestamp = this.getTimestamp();
    const nonce = this.generateNonce();
    const appKey = HIKVISION_CONFIG.APP_KEY;
    const appSecret = HIKVISION_CONFIG.APP_SECRET;

    const headers = {
      ...HIKVISION_CONFIG.SECURITY_HEADERS,
      ...additionalHeaders,
      'X-Ca-Key': appKey,
      'X-Ca-Timestamp': timestamp,
      'X-Ca-Nonce': nonce
    };

    // Generate signature
    const signature = this.generateSignature(method, path, headers, appSecret);
    headers['X-Ca-Signature'] = signature;
    headers['X-Ca-Signature-Headers'] = 'x-ca-key,x-ca-timestamp,x-ca-nonce';

    // Add authorization token if available
    const token = await this.getValidToken();
    if (token) {
      headers['Authorization'] = `${token.token_type} ${token.access_token}`;
    }

    return headers;
  }

  /**
   * Authenticate with HikCentral
   */
  async authenticate(): Promise<AuthToken> {
    const url = `${HIKVISION_CONFIG.API_BASE_URL}${HIKVISION_CONFIG.ARTEMIS_PATH}${HIKVISION_CONFIG.PATHS.AUTH_TOKEN}`;
    
    const headers = await this.prepareHeaders('POST', HIKVISION_CONFIG.PATHS.AUTH_TOKEN);
    
    const body = {
      appKey: HIKVISION_CONFIG.APP_KEY,
      appSecret: HIKVISION_CONFIG.APP_SECRET
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.code !== '0') {
        throw new Error(`Authentication failed: ${data.msg || 'Unknown error'}`);
      }

      this.token = data.data;
      this.tokenExpiry = new Date(Date.now() + (this.token!.expires_in * 1000));
      
      // Setup auto-refresh
      this.setupTokenRefresh();

      return this.token!;
    } catch (error) {
      console.error('HikCentral authentication error:', error);
      throw error;
    }
  }

  /**
   * Get valid token (authenticate if needed)
   */
  async getValidToken(): Promise<AuthToken | null> {
    if (!this.token || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      try {
        await this.authenticate();
      } catch (error) {
        console.error('Failed to authenticate:', error);
        return null;
      }
    }
    
    return this.token;
  }

  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.token || !this.tokenExpiry) return;

    // Refresh 5 minutes before expiry
    const refreshTime = this.tokenExpiry.getTime() - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, refreshTime);
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<void> {
    if (!this.token?.refresh_token) {
      // No refresh token, re-authenticate
      await this.authenticate();
      return;
    }

    const url = `${HIKVISION_CONFIG.API_BASE_URL}${HIKVISION_CONFIG.ARTEMIS_PATH}${HIKVISION_CONFIG.PATHS.AUTH_TOKEN}`;
    
    const headers = await this.prepareHeaders('POST', HIKVISION_CONFIG.PATHS.AUTH_TOKEN);
    
    const body = {
      grant_type: 'refresh_token',
      refresh_token: this.token.refresh_token
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.code !== '0') {
        throw new Error(`Token refresh failed: ${data.msg || 'Unknown error'}`);
      }

      this.token = data.data;
      this.tokenExpiry = new Date(Date.now() + (this.token!.expires_in * 1000));
      
      // Setup next refresh
      this.setupTokenRefresh();
    } catch (error) {
      console.error('Token refresh error:', error);
      // Re-authenticate on refresh failure
      await this.authenticate();
    }
  }

  /**
   * Logout and clear tokens
   */
  logout() {
    this.token = null;
    this.tokenExpiry = null;
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const hikCentralAuth = HikCentralAuth.getInstance();