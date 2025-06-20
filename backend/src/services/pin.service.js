/**
 * Secure PIN Generation Service
 * Generates cryptographically secure PINs with anti-predictability measures
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const CacheService = require('./cache.service');
const { logger } = require('../config/logger');

// PIN generation configuration
const PIN_CONFIG = {
  DEFAULT_LENGTH: 6,
  MIN_LENGTH: 4,
  MAX_LENGTH: 10,
  DEFAULT_EXPIRATION_HOURS: 24,
  MAX_EXPIRATION_DAYS: 30,
  SALT_ROUNDS: 10,
  MAX_ATTEMPTS: 100,
  CACHE_TTL: 300 // 5 minutes
};

// Patterns to avoid (predictable sequences)
const FORBIDDEN_PATTERNS = [
  // Sequential ascending
  /012345|123456|234567|345678|456789|567890/,
  // Sequential descending
  /987654|876543|765432|654321|543210|432109/,
  // Repeated digits
  /^(\d)\1{3,}$/,
  // Common patterns
  /^0000|1111|2222|3333|4444|5555|6666|7777|8888|9999$/,
  /^1234|4321|1357|2468|1379|9731|8642|2580$/,
  // Date patterns (MMDDYY, DDMMYY, YYMMDD)
  /^(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{2}$/,
  /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d{2}$/,
  // Birth years
  /^19\d{2}$|^20\d{2}$/
];

class PinService {
  constructor() {
    this.pinModel = null; // Will be injected
    this.activePinsCache = new Map(); // buildingId -> Set of active PINs
  }

  /**
   * Initialize service with database model
   */
  initialize(pinModel) {
    this.pinModel = pinModel;
    logger.info('PIN Service initialized');
  }

  /**
   * Generate a secure PIN
   */
  async generatePin(options = {}) {
    const {
      length = PIN_CONFIG.DEFAULT_LENGTH,
      buildingId,
      userId,
      purpose = 'access',
      expirationHours = PIN_CONFIG.DEFAULT_EXPIRATION_HOURS,
      metadata = {}
    } = options;

    try {
      // Validate inputs
      this.validatePinOptions(options);

      // Generate unique secure PIN
      const pin = await this.generateUniquePin(length, buildingId);
      
      // Hash the PIN
      const hashedPin = await bcrypt.hash(pin, PIN_CONFIG.SALT_ROUNDS);
      
      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);

      // Store in database
      const pinRecord = await this.pinModel.create({
        pin_hash: hashedPin,
        building_id: buildingId,
        user_id: userId,
        purpose,
        expires_at: expiresAt,
        metadata: JSON.stringify(metadata),
        is_active: true,
        created_at: new Date()
      });

      // Cache the PIN hash for quick validation
      const cacheKey = `pin:${buildingId}:${pin}`;
      await CacheService.set(cacheKey, {
        id: pinRecord.id,
        hash: hashedPin,
        userId,
        purpose,
        expiresAt
      }, PIN_CONFIG.CACHE_TTL);

      // Update active PINs cache
      this.updateActivePinsCache(buildingId, pin);

      logger.info('PIN generated successfully', {
        pinId: pinRecord.id,
        buildingId,
        userId,
        purpose,
        expiresAt
      });

      return {
        pin,
        id: pinRecord.id,
        expiresAt,
        purpose
      };

    } catch (error) {
      logger.error('PIN generation failed', {
        error: error.message,
        buildingId,
        userId
      });
      throw error;
    }
  }

  /**
   * Generate unique secure PIN with anti-predictability measures
   */
  async generateUniquePin(length, buildingId) {
    let attempts = 0;
    
    while (attempts < PIN_CONFIG.MAX_ATTEMPTS) {
      attempts++;
      
      // Generate cryptographically secure random PIN
      const pin = this.generateSecureRandomPin(length);
      
      // Check against forbidden patterns
      if (this.isPredictable(pin)) {
        continue;
      }

      // Check uniqueness within building
      if (await this.isPinUnique(pin, buildingId)) {
        return pin;
      }
    }

    throw new Error('Unable to generate unique PIN after maximum attempts');
  }

  /**
   * Generate cryptographically secure random PIN
   */
  generateSecureRandomPin(length) {
    const digits = '0123456789';
    let pin = '';
    
    // Use crypto.randomBytes for true randomness
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      // Convert random byte to digit (0-9)
      const randomIndex = randomBytes[i] % 10;
      pin += digits[randomIndex];
    }
    
    return pin;
  }

  /**
   * Check if PIN matches forbidden patterns
   */
  isPredictable(pin) {
    // Check against all forbidden patterns
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(pin)) {
        return true;
      }
    }

    // Check for too many repeated digits
    const digitCounts = {};
    for (const digit of pin) {
      digitCounts[digit] = (digitCounts[digit] || 0) + 1;
      // If any digit appears more than half the length, it's predictable
      if (digitCounts[digit] > Math.ceil(pin.length / 2)) {
        return true;
      }
    }

    // Check for simple sequences
    const ascending = this.isSequential(pin, 1);
    const descending = this.isSequential(pin, -1);
    
    if (ascending || descending) {
      return true;
    }

    return false;
  }

  /**
   * Check if PIN is sequential
   */
  isSequential(pin, direction) {
    for (let i = 1; i < pin.length; i++) {
      const diff = parseInt(pin[i]) - parseInt(pin[i - 1]);
      if (diff !== direction) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if PIN is unique within building
   */
  async isPinUnique(pin, buildingId) {
    // First check cache
    const cachedPins = this.activePinsCache.get(buildingId);
    if (cachedPins && cachedPins.has(pin)) {
      return false;
    }

    // Check cache for specific PIN
    const cacheKey = `pin:${buildingId}:${pin}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return false;
    }

    // Check database for active PINs
    if (this.pinModel) {
      const existingPins = await this.pinModel.findAll({
        where: {
          building_id: buildingId,
          is_active: true,
          expires_at: { [Op.gt]: new Date() }
        }
      });

      // Check each existing PIN
      for (const record of existingPins) {
        const matches = await bcrypt.compare(pin, record.pin_hash);
        if (matches) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate PIN
   */
  async validatePin(pin, buildingId, options = {}) {
    const { purpose } = options;

    try {
      // Check cache first
      const cacheKey = `pin:${buildingId}:${pin}`;
      const cached = await CacheService.get(cacheKey);
      
      if (cached) {
        // Validate from cache
        if (new Date(cached.expiresAt) > new Date()) {
          if (!purpose || cached.purpose === purpose) {
            return {
              valid: true,
              id: cached.id,
              userId: cached.userId,
              purpose: cached.purpose
            };
          }
        }
      }

      // Check database
      if (!this.pinModel) {
        throw new Error('PIN model not initialized');
      }

      const pinRecords = await this.pinModel.findAll({
        where: {
          building_id: buildingId,
          is_active: true,
          expires_at: { [Op.gt]: new Date() },
          ...(purpose && { purpose })
        }
      });

      // Check each record
      for (const record of pinRecords) {
        const matches = await bcrypt.compare(pin, record.pin_hash);
        if (matches) {
          // Update last used timestamp
          await record.update({
            last_used_at: new Date(),
            usage_count: record.usage_count + 1
          });

          // Cache for future lookups
          await CacheService.set(cacheKey, {
            id: record.id,
            hash: record.pin_hash,
            userId: record.user_id,
            purpose: record.purpose,
            expiresAt: record.expires_at
          }, PIN_CONFIG.CACHE_TTL);

          logger.info('PIN validated successfully', {
            pinId: record.id,
            buildingId,
            purpose: record.purpose
          });

          return {
            valid: true,
            id: record.id,
            userId: record.user_id,
            purpose: record.purpose
          };
        }
      }

      logger.warn('Invalid PIN attempt', {
        buildingId,
        purpose
      });

      return { valid: false };

    } catch (error) {
      logger.error('PIN validation error', {
        error: error.message,
        buildingId
      });
      throw error;
    }
  }

  /**
   * Revoke a PIN
   */
  async revokePin(pinId, revokedBy) {
    try {
      if (!this.pinModel) {
        throw new Error('PIN model not initialized');
      }

      const pin = await this.pinModel.findByPk(pinId);
      if (!pin) {
        throw new Error('PIN not found');
      }

      await pin.update({
        is_active: false,
        revoked_at: new Date(),
        revoked_by: revokedBy
      });

      // Clear from cache
      const cacheKey = `pin:${pin.building_id}:*`;
      await CacheService.deletePattern(cacheKey);

      logger.info('PIN revoked', {
        pinId,
        buildingId: pin.building_id,
        revokedBy
      });

      return true;

    } catch (error) {
      logger.error('PIN revocation error', {
        error: error.message,
        pinId
      });
      throw error;
    }
  }

  /**
   * Bulk generate PINs
   */
  async bulkGeneratePins(count, options = {}) {
    const pins = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      try {
        const pin = await this.generatePin(options);
        pins.push(pin);
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    logger.info('Bulk PIN generation completed', {
      requested: count,
      generated: pins.length,
      failed: errors.length
    });

    return { pins, errors };
  }

  /**
   * Get PIN statistics
   */
  async getPinStats(buildingId) {
    try {
      if (!this.pinModel) {
        throw new Error('PIN model not initialized');
      }

      const now = new Date();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

      const stats = await this.pinModel.findAll({
        where: {
          building_id: buildingId
        },
        attributes: [
          [this.pinModel.sequelize.fn('COUNT', '*'), 'total'],
          [this.pinModel.sequelize.fn('SUM', 
            this.pinModel.sequelize.literal(
              `CASE WHEN is_active = true AND expires_at > NOW() THEN 1 ELSE 0 END`
            )
          ), 'active'],
          [this.pinModel.sequelize.fn('SUM',
            this.pinModel.sequelize.literal(
              `CASE WHEN created_at > '${oneDayAgo.toISOString()}' THEN 1 ELSE 0 END`
            )
          ), 'createdToday'],
          [this.pinModel.sequelize.fn('SUM',
            this.pinModel.sequelize.literal(
              `CASE WHEN last_used_at > '${oneWeekAgo.toISOString()}' THEN 1 ELSE 0 END`
            )
          ), 'usedThisWeek']
        ],
        raw: true
      });

      return stats[0] || {
        total: 0,
        active: 0,
        createdToday: 0,
        usedThisWeek: 0
      };

    } catch (error) {
      logger.error('Error getting PIN stats', {
        error: error.message,
        buildingId
      });
      throw error;
    }
  }

  /**
   * Clean expired PINs
   */
  async cleanExpiredPins() {
    try {
      if (!this.pinModel) {
        return { cleaned: 0 };
      }

      const result = await this.pinModel.update(
        { is_active: false },
        {
          where: {
            is_active: true,
            expires_at: { [Op.lt]: new Date() }
          }
        }
      );

      // Clear cache
      await CacheService.deletePattern('pin:*');
      this.activePinsCache.clear();

      logger.info('Expired PINs cleaned', {
        count: result[0]
      });

      return { cleaned: result[0] };

    } catch (error) {
      logger.error('Error cleaning expired PINs', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate PIN options
   */
  validatePinOptions(options) {
    const { length, buildingId, expirationHours } = options;

    if (length && (length < PIN_CONFIG.MIN_LENGTH || length > PIN_CONFIG.MAX_LENGTH)) {
      throw new Error(`PIN length must be between ${PIN_CONFIG.MIN_LENGTH} and ${PIN_CONFIG.MAX_LENGTH}`);
    }

    if (!buildingId) {
      throw new Error('Building ID is required');
    }

    if (expirationHours && expirationHours > PIN_CONFIG.MAX_EXPIRATION_DAYS * 24) {
      throw new Error(`PIN expiration cannot exceed ${PIN_CONFIG.MAX_EXPIRATION_DAYS} days`);
    }
  }

  /**
   * Update active PINs cache
   */
  updateActivePinsCache(buildingId, pin) {
    if (!this.activePinsCache.has(buildingId)) {
      this.activePinsCache.set(buildingId, new Set());
    }
    this.activePinsCache.get(buildingId).add(pin);

    // Limit cache size
    const cache = this.activePinsCache.get(buildingId);
    if (cache.size > 1000) {
      // Remove oldest entries
      const toRemove = cache.size - 1000;
      const iterator = cache.values();
      for (let i = 0; i < toRemove; i++) {
        cache.delete(iterator.next().value);
      }
    }
  }

  /**
   * Generate PIN for temporary access
   */
  async generateTemporaryAccessPin(buildingId, visitorInfo, validHours = 4) {
    return this.generatePin({
      buildingId,
      purpose: 'temporary_access',
      expirationHours: validHours,
      metadata: {
        visitorName: visitorInfo.name,
        visitorDocument: visitorInfo.document,
        authorizedBy: visitorInfo.authorizedBy,
        accessAreas: visitorInfo.accessAreas || ['entrance']
      }
    });
  }

  /**
   * Generate PIN for delivery
   */
  async generateDeliveryPin(buildingId, deliveryInfo, validHours = 2) {
    return this.generatePin({
      buildingId,
      purpose: 'delivery',
      expirationHours: validHours,
      metadata: {
        company: deliveryInfo.company,
        recipientUnit: deliveryInfo.unit,
        trackingNumber: deliveryInfo.trackingNumber,
        deliveryType: deliveryInfo.type
      }
    });
  }

  /**
   * Generate emergency PIN
   */
  async generateEmergencyPin(buildingId, authorizedBy) {
    return this.generatePin({
      buildingId,
      purpose: 'emergency',
      expirationHours: 24,
      length: 8, // Longer for added security
      metadata: {
        authorizedBy,
        generatedAt: new Date(),
        type: 'emergency_access'
      }
    });
  }
}

// Export singleton instance
module.exports = new PinService();