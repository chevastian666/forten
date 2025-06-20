/**
 * Geolocation Service
 * Detects anomalous access locations and generates security alerts
 */

const geoip = require('geoip-lite');
const EventEmitter = require('events');
const { logger } = require('../config/logger');
const redis = require('../config/redis');

class GeolocationService extends EventEmitter {
  constructor() {
    super();
    this.redisClient = null;
    this.isInitialized = false;
    this.models = null;
    
    // Default configuration
    this.config = {
      // Countries considered safe/expected (ISO codes)
      allowedCountries: ['UY', 'AR', 'BR', 'CL', 'PY'], // Uruguay and neighbors
      
      // Risk levels for different scenarios
      riskLevels: {
        UNKNOWN_COUNTRY: 'high',
        SUSPICIOUS_COUNTRY: 'medium', 
        VPN_DETECTED: 'medium',
        TOR_DETECTED: 'high',
        PROXY_DETECTED: 'medium',
        RAPID_LOCATION_CHANGE: 'high'
      },
      
      // Time thresholds for anomaly detection
      rapidChangeThresholdMinutes: 30,
      
      // Distance threshold for rapid change detection (km)
      rapidChangeDistanceKm: 1000,
      
      // Cache settings
      cacheTtlSeconds: 3600, // 1 hour
      
      // Alert settings
      alertCooldownMinutes: 60, // Don't spam alerts
      
      // Known risky countries (can be expanded)
      riskyCountries: ['CN', 'RU', 'KP', 'IR', 'SY'],
      
      // VPN/Proxy detection (basic)
      suspiciousRanges: [
        // Common VPN/proxy ranges (simplified)
        '10.0.0.0/8',
        '172.16.0.0/12', 
        '192.168.0.0/16'
      ]
    };
  }

  /**
   * Initialize the geolocation service
   */
  async initialize(models = null, redisClient = null) {
    try {
      this.models = models;
      this.redisClient = redisClient || redis.getClient();
      
      // Load configuration from database or config service if available
      await this.loadConfiguration();
      
      this.isInitialized = true;
      logger.info('Geolocation service initialized', {
        allowedCountries: this.config.allowedCountries,
        riskyCountries: this.config.riskyCountries.length,
        cacheTtl: this.config.cacheTtlSeconds
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize geolocation service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Load configuration from external sources
   */
  async loadConfiguration() {
    try {
      // Try to load from dynamic config service if available
      if (global.ConfigService) {
        const allowedCountries = await global.ConfigService.get('geolocation.allowed_countries');
        const riskyCountries = await global.ConfigService.get('geolocation.risky_countries');
        
        if (allowedCountries) {
          this.config.allowedCountries = allowedCountries;
        }
        if (riskyCountries) {
          this.config.riskyCountries = riskyCountries;
        }
      }
    } catch (error) {
      logger.debug('Could not load geolocation config from external source', {
        error: error.message
      });
    }
  }

  /**
   * Get geolocation information for an IP address
   */
  getLocation(ip) {
    try {
      // Handle localhost and private IPs
      if (this.isPrivateIP(ip) || ip === '127.0.0.1' || ip === 'localhost') {
        return {
          ip,
          country: 'UY', // Default to Uruguay for local development
          region: 'UY',
          city: 'Montevideo',
          timezone: 'America/Montevideo',
          coordinates: [-34.9011, -56.1645], // Montevideo coordinates
          isPrivate: true,
          provider: 'Local Network'
        };
      }

      const geo = geoip.lookup(ip);
      
      if (!geo) {
        return {
          ip,
          country: 'Unknown',
          region: 'Unknown',
          city: 'Unknown',
          timezone: null,
          coordinates: [0, 0],
          isPrivate: false,
          provider: 'Unknown'
        };
      }

      return {
        ip,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone,
        coordinates: geo.ll, // [latitude, longitude]
        isPrivate: false,
        provider: this.detectProvider(ip, geo)
      };
    } catch (error) {
      logger.error('Error getting geolocation', {
        ip,
        error: error.message
      });
      
      return {
        ip,
        country: 'Error',
        region: 'Error',
        city: 'Error',
        timezone: null,
        coordinates: [0, 0],
        isPrivate: false,
        provider: 'Error',
        error: error.message
      };
    }
  }

  /**
   * Analyze access for anomalies and security risks
   */
  async analyzeAccess(ip, userId = null, additionalContext = {}) {
    if (!this.isInitialized) {
      throw new Error('Geolocation service not initialized');
    }

    try {
      const location = this.getLocation(ip);
      const analysis = {
        location,
        riskLevel: 'low',
        risks: [],
        alerts: [],
        timestamp: new Date(),
        userId,
        context: additionalContext
      };

      // Skip analysis for private IPs in development
      if (location.isPrivate && process.env.NODE_ENV === 'development') {
        analysis.riskLevel = 'low';
        analysis.risks.push({
          type: 'PRIVATE_IP',
          level: 'info',
          message: 'Access from private IP address (development)'
        });
        return analysis;
      }

      // Check if country is allowed
      if (!this.config.allowedCountries.includes(location.country)) {
        analysis.riskLevel = this.elevateRiskLevel(analysis.riskLevel, 'medium');
        analysis.risks.push({
          type: 'UNKNOWN_COUNTRY',
          level: this.config.riskLevels.UNKNOWN_COUNTRY,
          message: `Access from non-whitelisted country: ${location.country}`,
          country: location.country
        });
      }

      // Check if country is specifically risky
      if (this.config.riskyCountries.includes(location.country)) {
        analysis.riskLevel = this.elevateRiskLevel(analysis.riskLevel, 'high');
        analysis.risks.push({
          type: 'SUSPICIOUS_COUNTRY',
          level: this.config.riskLevels.SUSPICIOUS_COUNTRY,
          message: `Access from high-risk country: ${location.country}`,
          country: location.country
        });
      }

      // Check for VPN/Proxy indicators
      const vpnCheck = this.detectVPN(ip, location);
      if (vpnCheck.isVPN) {
        analysis.riskLevel = this.elevateRiskLevel(analysis.riskLevel, vpnCheck.riskLevel);
        analysis.risks.push({
          type: vpnCheck.type,
          level: vpnCheck.riskLevel,
          message: vpnCheck.message,
          details: vpnCheck.details
        });
      }

      // Check for rapid location changes (if user provided)
      if (userId) {
        const rapidChangeCheck = await this.checkRapidLocationChange(userId, location);
        if (rapidChangeCheck.isRapid) {
          analysis.riskLevel = this.elevateRiskLevel(analysis.riskLevel, 'high');
          analysis.risks.push({
            type: 'RAPID_LOCATION_CHANGE',
            level: this.config.riskLevels.RAPID_LOCATION_CHANGE,
            message: `Rapid location change detected`,
            details: rapidChangeCheck
          });
        }
      }

      // Store access history
      await this.storeAccessHistory(userId, ip, location, analysis);

      // Generate alerts if necessary
      if (analysis.riskLevel === 'high' || analysis.riskLevel === 'medium') {
        const alerts = await this.generateAlerts(analysis);
        analysis.alerts = alerts;
      }

      logger.info('Geolocation analysis completed', {
        ip,
        userId,
        country: location.country,
        city: location.city,
        riskLevel: analysis.riskLevel,
        risksCount: analysis.risks.length,
        alertsCount: analysis.alerts.length
      });

      return analysis;
    } catch (error) {
      logger.error('Error analyzing access', {
        ip,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if IP is private/local
   */
  isPrivateIP(ip) {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./, // Link-local
      /^::1$/, // IPv6 localhost
      /^fc00:/, // IPv6 private
      /^fe80:/ // IPv6 link-local
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Detect VPN/Proxy usage
   */
  detectVPN(ip, location) {
    // Basic VPN/Proxy detection (can be enhanced with external services)
    const checks = {
      isVPN: false,
      type: 'CLEAN',
      riskLevel: 'low',
      message: 'No VPN/Proxy detected',
      details: {}
    };

    // Check for suspicious ranges
    for (const range of this.config.suspiciousRanges) {
      if (this.ipInRange(ip, range)) {
        checks.isVPN = true;
        checks.type = 'PROXY_DETECTED';
        checks.riskLevel = 'medium';
        checks.message = 'Possible proxy/VPN detected (IP range analysis)';
        checks.details.range = range;
        break;
      }
    }

    // Check for TOR exit nodes (simplified check)
    if (this.isTorExitNode(ip)) {
      checks.isVPN = true;
      checks.type = 'TOR_DETECTED';
      checks.riskLevel = 'high';
      checks.message = 'TOR exit node detected';
      checks.details.tor = true;
    }

    // Check for hosting providers (often used for VPNs)
    if (this.isHostingProvider(location)) {
      checks.isVPN = true;
      checks.type = 'VPN_DETECTED';
      checks.riskLevel = 'medium';
      checks.message = 'Access from hosting provider (possible VPN)';
      checks.details.hosting = true;
    }

    return checks;
  }

  /**
   * Check if IP is in a given CIDR range
   */
  ipInRange(ip, range) {
    try {
      const [rangeIp, rangeBits] = range.split('/');
      const rangeNum = this.ipToNumber(rangeIp);
      const ipNum = this.ipToNumber(ip);
      const mask = -1 << (32 - parseInt(rangeBits));
      
      return (ipNum & mask) === (rangeNum & mask);
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert IP to number for range checking
   */
  ipToNumber(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Check if IP is a known TOR exit node (simplified)
   */
  isTorExitNode(ip) {
    // This is a simplified check. In production, you'd want to use
    // a real TOR exit node list or external service
    const knownTorRanges = [
      '199.87.154.0/24',
      '176.10.104.0/24'
    ];
    
    return knownTorRanges.some(range => this.ipInRange(ip, range));
  }

  /**
   * Check if location indicates hosting provider
   */
  isHostingProvider(location) {
    // Simplified check for hosting providers
    // In production, you'd want a comprehensive database
    const hostingIndicators = [
      'amazon', 'aws', 'google', 'microsoft', 'digitalocean',
      'linode', 'vultr', 'ovh', 'hetzner'
    ];
    
    const provider = (location.provider || '').toLowerCase();
    return hostingIndicators.some(indicator => provider.includes(indicator));
  }

  /**
   * Detect provider from IP and geo data
   */
  detectProvider(ip, geo) {
    // This is a simplified implementation
    // In production, you might use additional IP intelligence services
    
    if (ip.startsWith('8.8.')) return 'Google';
    if (ip.startsWith('1.1.')) return 'Cloudflare';
    if (ip.startsWith('208.67.')) return 'OpenDNS';
    
    return geo.org || 'Unknown';
  }

  /**
   * Check for rapid location changes
   */
  async checkRapidLocationChange(userId, currentLocation) {
    try {
      if (!this.redisClient) {
        return { isRapid: false, reason: 'No Redis available' };
      }

      const cacheKey = `geolocation:history:${userId}`;
      const historyData = await this.redisClient.get(cacheKey);
      
      if (!historyData) {
        return { isRapid: false, reason: 'No previous location data' };
      }

      const lastAccess = JSON.parse(historyData);
      const timeDiff = (Date.now() - new Date(lastAccess.timestamp).getTime()) / (1000 * 60); // minutes
      
      if (timeDiff > this.config.rapidChangeThresholdMinutes) {
        return { isRapid: false, reason: 'Time difference within threshold' };
      }

      // Calculate distance between locations
      const distance = this.calculateDistance(
        lastAccess.coordinates,
        currentLocation.coordinates
      );

      if (distance > this.config.rapidChangeDistanceKm) {
        return {
          isRapid: true,
          previousLocation: lastAccess,
          currentLocation,
          distance,
          timeDifference: timeDiff,
          reason: `${distance.toFixed(0)}km in ${timeDiff.toFixed(0)} minutes`
        };
      }

      return { 
        isRapid: false, 
        reason: 'Distance within acceptable range',
        distance,
        timeDifference: timeDiff
      };
    } catch (error) {
      logger.error('Error checking rapid location change', {
        userId,
        error: error.message
      });
      return { isRapid: false, reason: 'Error checking history' };
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(coords1, coords2) {
    const [lat1, lon1] = coords1;
    const [lat2, lon2] = coords2;
    
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Store access history for analysis
   */
  async storeAccessHistory(userId, ip, location, analysis) {
    try {
      if (!this.redisClient || !userId) return;

      const accessData = {
        ip,
        location,
        timestamp: new Date().toISOString(),
        riskLevel: analysis.riskLevel,
        risksCount: analysis.risks.length
      };

      // Store individual access
      const cacheKey = `geolocation:history:${userId}`;
      await this.redisClient.setex(
        cacheKey,
        this.config.cacheTtlSeconds,
        JSON.stringify(accessData)
      );

      // Store in access log for trending
      const logKey = `geolocation:log:${userId}:${Date.now()}`;
      await this.redisClient.setex(logKey, 86400, JSON.stringify(accessData)); // 24 hours

    } catch (error) {
      logger.error('Error storing access history', {
        userId,
        ip,
        error: error.message
      });
    }
  }

  /**
   * Generate security alerts
   */
  async generateAlerts(analysis) {
    const alerts = [];

    try {
      // Check if we should generate alerts (cooldown)
      if (analysis.userId && await this.isInAlertCooldown(analysis.userId)) {
        return alerts;
      }

      for (const risk of analysis.risks) {
        if (risk.level === 'high' || risk.level === 'medium') {
          const alert = {
            id: require('uuid').v4(),
            type: 'GEOLOCATION_ANOMALY',
            severity: risk.level,
            title: this.getAlertTitle(risk.type),
            message: risk.message,
            details: {
              ip: analysis.location.ip,
              country: analysis.location.country,
              city: analysis.location.city,
              riskType: risk.type,
              userId: analysis.userId,
              timestamp: analysis.timestamp,
              coordinates: analysis.location.coordinates
            },
            timestamp: new Date(),
            userId: analysis.userId
          };

          alerts.push(alert);

          // Emit event for other systems to handle
          this.emit('geolocationAlert', alert);

          // Log the alert
          logger.warn('Geolocation security alert generated', {
            alertId: alert.id,
            type: risk.type,
            severity: risk.level,
            ip: analysis.location.ip,
            country: analysis.location.country,
            userId: analysis.userId
          });
        }
      }

      // Set alert cooldown
      if (analysis.userId && alerts.length > 0) {
        await this.setAlertCooldown(analysis.userId);
      }

    } catch (error) {
      logger.error('Error generating geolocation alerts', {
        error: error.message
      });
    }

    return alerts;
  }

  /**
   * Get alert title based on risk type
   */
  getAlertTitle(riskType) {
    const titles = {
      UNKNOWN_COUNTRY: 'Access from Unexpected Country',
      SUSPICIOUS_COUNTRY: 'Access from High-Risk Country',
      VPN_DETECTED: 'VPN/Proxy Access Detected',
      TOR_DETECTED: 'TOR Network Access Detected',
      PROXY_DETECTED: 'Proxy Server Access Detected',
      RAPID_LOCATION_CHANGE: 'Rapid Location Change Detected'
    };

    return titles[riskType] || 'Geolocation Security Alert';
  }

  /**
   * Check if user is in alert cooldown period
   */
  async isInAlertCooldown(userId) {
    try {
      if (!this.redisClient) return false;

      const cooldownKey = `geolocation:alert_cooldown:${userId}`;
      const cooldown = await this.redisClient.get(cooldownKey);
      return cooldown !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set alert cooldown for user
   */
  async setAlertCooldown(userId) {
    try {
      if (!this.redisClient) return;

      const cooldownKey = `geolocation:alert_cooldown:${userId}`;
      const cooldownSeconds = this.config.alertCooldownMinutes * 60;
      await this.redisClient.setex(cooldownKey, cooldownSeconds, '1');
    } catch (error) {
      logger.error('Error setting alert cooldown', {
        userId,
        error: error.message
      });
    }
  }

  /**
   * Elevate risk level
   */
  elevateRiskLevel(currentLevel, newLevel) {
    const levels = { low: 1, medium: 2, high: 3 };
    const current = levels[currentLevel] || 1;
    const proposed = levels[newLevel] || 1;
    
    if (proposed > current) {
      return newLevel;
    }
    return currentLevel;
  }

  /**
   * Get access statistics for a user
   */
  async getUserAccessStats(userId, days = 30) {
    try {
      if (!this.redisClient) {
        return { error: 'Redis not available' };
      }

      const pattern = `geolocation:log:${userId}:*`;
      const keys = await this.redisClient.keys(pattern);
      
      const accessLogs = [];
      for (const key of keys) {
        const data = await this.redisClient.get(key);
        if (data) {
          accessLogs.push(JSON.parse(data));
        }
      }

      // Filter by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentAccess = accessLogs.filter(log => 
        new Date(log.timestamp) > cutoffDate
      );

      // Calculate statistics
      const countries = [...new Set(recentAccess.map(log => log.location.country))];
      const cities = [...new Set(recentAccess.map(log => log.location.city))];
      const riskDistribution = recentAccess.reduce((acc, log) => {
        acc[log.riskLevel] = (acc[log.riskLevel] || 0) + 1;
        return acc;
      }, {});

      return {
        totalAccess: recentAccess.length,
        uniqueCountries: countries.length,
        uniqueCities: cities.length,
        countries,
        cities,
        riskDistribution,
        recentAccess: recentAccess.slice(-10) // Last 10 access
      };
    } catch (error) {
      logger.error('Error getting user access stats', {
        userId,
        error: error.message
      });
      return { error: error.message };
    }
  }

  /**
   * Update service configuration
   */
  async updateConfig(newConfig) {
    try {
      this.config = { ...this.config, ...newConfig };
      
      logger.info('Geolocation service configuration updated', {
        allowedCountries: this.config.allowedCountries,
        riskyCountries: this.config.riskyCountries.length
      });

      this.emit('configUpdated', this.config);
      return this.config;
    } catch (error) {
      logger.error('Error updating geolocation config', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      allowedCountries: this.config.allowedCountries,
      riskyCountriesCount: this.config.riskyCountries.length,
      rapidChangeThreshold: this.config.rapidChangeThresholdMinutes,
      cacheEnabled: !!this.redisClient,
      geoipVersion: geoip.pretty(1234567890) // Test to see if geoip-lite is working
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    this.isInitialized = false;
    this.removeAllListeners();
    logger.info('Geolocation service shut down');
  }
}

// Export singleton
module.exports = new GeolocationService();