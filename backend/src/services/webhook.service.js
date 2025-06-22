/**
 * Webhook Service
 * Manages webhook subscriptions and deliveries with HMAC-SHA256 signatures
 */

const crypto = require('crypto');
const axios = require('axios');
const Bull = require('bull');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');
const CacheService = require('./cache.service');

// Webhook queue for async delivery
let webhookQueue = null;

class WebhookService {
  constructor() {
    this.webhookModel = null;
    this.deliveryModel = null;
    this.isInitialized = false;
  }

  /**
   * Initialize service with models and queue
   */
  async initialize(webhookModel, deliveryModel, redisClient = null) {
    this.webhookModel = webhookModel;
    this.deliveryModel = deliveryModel;
    
    // Initialize webhook delivery queue
    if (redisClient) {
      webhookQueue = new Bull('webhook-delivery', {
        redis: redisClient,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: true,
          removeOnFail: false
        }
      });

      // Process webhook deliveries
      webhookQueue.process('deliver', 5, this.processWebhookDelivery.bind(this));
      webhookQueue.process('retry', 3, this.processWebhookRetry.bind(this));
      
      // Start retry checker
      this.startRetryChecker();
      
      logger.info('Webhook queue initialized');
    }
    
    this.isInitialized = true;
    logger.info('Webhook service initialized');
  }

  /**
   * Register a new webhook
   */
  async createWebhook(data) {
    try {
      const {
        name,
        url,
        events,
        filters = {},
        headers = {},
        userId,
        buildingId
      } = data;

      // Validate URL
      await this.validateWebhookUrl(url);

      // Generate secret
      const secret = this.generateSecret();

      // Create webhook
      const webhook = await this.webhookModel.create({
        name,
        url,
        secret,
        events,
        filters,
        headers,
        user_id: userId,
        building_id: buildingId
      });

      logger.info('Webhook created', {
        webhookId: webhook.id,
        name,
        events
      });

      // Send test event
      await this.sendTestEvent(webhook);

      return {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        secret: webhook.secret,
        events: webhook.events,
        is_active: webhook.is_active
      };

    } catch (error) {
      logger.error('Error creating webhook', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update webhook
   */
  async updateWebhook(webhookId, updates) {
    try {
      const webhook = await this.webhookModel.findByPk(webhookId);
      if (!webhook) {
        throw new Error('Webhook not found');
      }

      // Validate URL if changed
      if (updates.url && updates.url !== webhook.url) {
        await this.validateWebhookUrl(updates.url);
      }

      // Update webhook
      await webhook.update(updates);

      logger.info('Webhook updated', {
        webhookId,
        updates: Object.keys(updates)
      });

      return webhook;

    } catch (error) {
      logger.error('Error updating webhook', {
        error: error.message,
        webhookId
      });
      throw error;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId) {
    try {
      const webhook = await this.webhookModel.findByPk(webhookId);
      if (!webhook) {
        throw new Error('Webhook not found');
      }

      await webhook.destroy();

      logger.info('Webhook deleted', {
        webhookId
      });

      return true;

    } catch (error) {
      logger.error('Error deleting webhook', {
        error: error.message,
        webhookId
      });
      throw error;
    }
  }

  /**
   * Trigger event for all matching webhooks
   */
  async triggerEvent(eventType, eventData) {
    try {
      // Get active webhooks for this event
      const webhooks = await this.webhookModel.getActiveWebhooksForEvent(
        eventType,
        eventData
      );

      if (webhooks.length === 0) {
        return { triggered: 0 };
      }

      logger.info('Triggering webhooks for event', {
        eventType,
        webhookCount: webhooks.length
      });

      // Queue deliveries
      const deliveries = [];
      for (const webhook of webhooks) {
        const delivery = await this.queueDelivery(webhook, eventType, eventData);
        deliveries.push(delivery);
      }

      return {
        triggered: deliveries.length,
        deliveries
      };

    } catch (error) {
      logger.error('Error triggering webhooks', {
        error: error.message,
        eventType
      });
      throw error;
    }
  }

  /**
   * Queue webhook delivery
   */
  async queueDelivery(webhook, eventType, eventData) {
    try {
      // Create event payload
      const payload = this.createEventPayload(eventType, eventData);
      
      // Check payload size
      const payloadSize = Buffer.byteLength(JSON.stringify(payload));
      if (payloadSize > webhook.max_payload_size) {
        throw new Error(`Payload size ${payloadSize} exceeds limit ${webhook.max_payload_size}`);
      }

      // Generate signature
      const signature = this.generateSignature(webhook.secret, payload);

      // Create delivery record
      const delivery = await this.deliveryModel.create({
        webhook_id: webhook.id,
        event_id: payload.id,
        event_type: eventType,
        payload,
        signature,
        status: 'pending'
      });

      // Queue for delivery
      if (webhookQueue) {
        await webhookQueue.add('deliver', {
          deliveryId: delivery.id,
          webhookId: webhook.id
        }, {
          delay: 0,
          priority: eventData.priority || 0
        });
      } else {
        // Direct delivery if no queue
        await this.deliverWebhook(delivery.id);
      }

      return delivery.id;

    } catch (error) {
      logger.error('Error queueing webhook delivery', {
        error: error.message,
        webhookId: webhook.id,
        eventType
      });
      throw error;
    }
  }

  /**
   * Process webhook delivery from queue
   */
  async processWebhookDelivery(job) {
    const { deliveryId } = job.data;
    return this.deliverWebhook(deliveryId);
  }

  /**
   * Deliver webhook
   */
  async deliverWebhook(deliveryId) {
    const startTime = Date.now();
    let delivery;
    let webhook;

    try {
      // Get delivery and webhook
      delivery = await this.deliveryModel.findByPk(deliveryId, {
        include: [{
          model: this.webhookModel,
          as: 'webhook'
        }]
      });

      if (!delivery || !delivery.webhook) {
        throw new Error('Delivery or webhook not found');
      }

      webhook = delivery.webhook;

      // Skip if webhook is inactive
      if (!webhook.is_active) {
        await delivery.update({ 
          status: 'failed',
          error_message: 'Webhook is inactive'
        });
        return;
      }

      // Prepare request
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-ID': webhook.id,
        'X-Webhook-Event': delivery.event_type,
        'X-Webhook-Delivery': delivery.id,
        'X-Webhook-Signature': delivery.signature,
        'X-Webhook-Timestamp': new Date().toISOString(),
        ...webhook.headers
      };

      // Make request
      const response = await axios({
        method: 'POST',
        url: webhook.url,
        data: delivery.payload,
        headers,
        timeout: webhook.timeout,
        validateStatus: null, // Don't throw on any status
        maxRedirects: 5
      });

      const duration = Date.now() - startTime;

      // Check response
      if (response.status >= 200 && response.status < 300) {
        // Success
        await delivery.markSuccess(response, duration);
        await webhook.incrementDeliveryStats(true);
        
        logger.info('Webhook delivered successfully', {
          deliveryId,
          webhookId: webhook.id,
          status: response.status,
          duration
        });
      } else {
        // HTTP error
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Webhook delivery failed', {
        deliveryId,
        webhookId: webhook?.id,
        error: error.message,
        duration
      });

      if (delivery && webhook) {
        await delivery.markFailure(error, duration);
        await webhook.incrementDeliveryStats(false);
        
        // Update webhook error
        await webhook.update({
          last_error: error.message
        });

        // Check if should retry
        if (delivery.attempt_count < webhook.retry_config.max_retries) {
          await delivery.scheduleRetry(webhook.retry_config);
          
          // Queue retry
          if (webhookQueue) {
            const delay = delivery.next_retry_at - new Date();
            await webhookQueue.add('retry', {
              deliveryId: delivery.id
            }, {
              delay: Math.max(0, delay)
            });
          }
        } else {
          // Max retries reached
          await delivery.update({ status: 'failed' });
          
          // Check if should disable webhook
          if (webhook.shouldDisable()) {
            await webhook.update({ 
              is_active: false,
              last_error: 'Disabled after 10 consecutive failures'
            });
            
            logger.warn('Webhook disabled after consecutive failures', {
              webhookId: webhook.id
            });
          }
        }
      }
      
      throw error;
    }
  }

  /**
   * Process webhook retry
   */
  async processWebhookRetry(job) {
    const { deliveryId } = job.data;
    return this.deliverWebhook(deliveryId);
  }

  /**
   * Generate HMAC-SHA256 signature
   */
  generateSignature(secret, payload) {
    const timestamp = Date.now();
    const message = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
    
    return `t=${timestamp},v1=${signature}`;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(secret, payload, signature) {
    try {
      const parts = signature.split(',');
      const timestamp = parts[0].split('=')[1];
      const receivedSignature = parts[1].split('=')[1];
      
      // Check timestamp (5 minute tolerance)
      const age = Date.now() - parseInt(timestamp);
      if (age > 300000) {
        return false;
      }
      
      // Calculate expected signature
      const message = `${timestamp}.${JSON.stringify(payload)}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');
      
      // Constant time comparison
      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Create event payload
   */
  createEventPayload(eventType, eventData) {
    return {
      id: `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
      type: eventType,
      created_at: new Date().toISOString(),
      data: eventData,
      environment: process.env.NODE_ENV || 'development',
      version: '1.0'
    };
  }

  /**
   * Generate webhook secret
   */
  generateSecret() {
    return `whsec_${crypto.randomBytes(32).toString('base64url')}`;
  }

  /**
   * Validate webhook URL
   */
  async validateWebhookUrl(url) {
    try {
      const parsedUrl = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol, must be HTTP or HTTPS');
      }
      
      // Block local URLs in production
      if (process.env.NODE_ENV === 'production') {
        const hostname = parsedUrl.hostname;
        if (
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.endsWith('.local')
        ) {
          throw new Error('Local URLs are not allowed');
        }
      }
      
      // Test connectivity with HEAD request
      await axios.head(url, {
        timeout: 5000,
        validateStatus: null
      });
      
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('URL is not reachable');
      }
      throw error;
    }
  }

  /**
   * Send test event to webhook
   */
  async sendTestEvent(webhook) {
    const testEvent = {
      test: true,
      webhook_id: webhook.id,
      message: 'This is a test event from FORTEN'
    };
    
    return this.triggerEvent('webhook.test', testEvent);
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(webhookId) {
    try {
      const webhook = await this.webhookModel.findByPk(webhookId);
      if (!webhook) {
        throw new Error('Webhook not found');
      }

      // Get recent deliveries
      const recentDeliveries = await this.deliveryModel.findAll({
        where: {
          webhook_id: webhookId,
          created_at: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        attributes: [
          'status',
          [this.deliveryModel.sequelize.fn('COUNT', '*'), 'count'],
          [this.deliveryModel.sequelize.fn('AVG', 
            this.deliveryModel.sequelize.col('duration_ms')
          ), 'avg_duration']
        ],
        group: ['status']
      });

      // Calculate stats
      const stats = {
        total_deliveries: webhook.total_deliveries,
        successful_deliveries: webhook.successful_deliveries,
        failed_deliveries: webhook.failed_deliveries,
        success_rate: webhook.total_deliveries > 0 
          ? (webhook.successful_deliveries / webhook.total_deliveries * 100).toFixed(2) 
          : 0,
        consecutive_failures: webhook.consecutive_failures,
        last_delivery_at: webhook.last_delivery_at,
        last_success_at: webhook.last_success_at,
        last_failure_at: webhook.last_failure_at,
        last_error: webhook.last_error,
        recent_24h: {}
      };

      // Add recent stats
      recentDeliveries.forEach(stat => {
        stats.recent_24h[stat.status] = {
          count: parseInt(stat.dataValues.count),
          avg_duration: Math.round(stat.dataValues.avg_duration || 0)
        };
      });

      return stats;

    } catch (error) {
      logger.error('Error getting webhook stats', {
        error: error.message,
        webhookId
      });
      throw error;
    }
  }

  /**
   * Get delivery history
   */
  async getDeliveryHistory(webhookId, options = {}) {
    const { limit = 50, offset = 0, status } = options;
    
    const where = { webhook_id: webhookId };
    if (status) {
      where.status = status;
    }

    return this.deliveryModel.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  }

  /**
   * Retry failed delivery
   */
  async retryDelivery(deliveryId) {
    try {
      const delivery = await this.deliveryModel.findByPk(deliveryId);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      if (delivery.status === 'success') {
        throw new Error('Cannot retry successful delivery');
      }

      // Reset for retry
      await delivery.update({
        status: 'pending',
        attempt_count: 0,
        next_retry_at: null
      });

      // Queue for immediate delivery
      if (webhookQueue) {
        await webhookQueue.add('deliver', {
          deliveryId: delivery.id,
          webhookId: delivery.webhook_id
        });
      } else {
        await this.deliverWebhook(delivery.id);
      }

      return true;

    } catch (error) {
      logger.error('Error retrying delivery', {
        error: error.message,
        deliveryId
      });
      throw error;
    }
  }

  /**
   * Start retry checker
   */
  startRetryChecker() {
    setInterval(async () => {
      try {
        const pendingRetries = await this.deliveryModel.getPendingRetries();
        
        for (const delivery of pendingRetries) {
          await webhookQueue.add('retry', {
            deliveryId: delivery.id
          });
        }
      } catch (error) {
        logger.error('Error checking pending retries', {
          error: error.message
        });
      }
    }, 60000); // Check every minute
  }

  /**
   * Clean old deliveries
   */
  async cleanOldDeliveries(daysToKeep = 30) {
    try {
      const deleted = await this.deliveryModel.cleanOldDeliveries(daysToKeep);
      
      logger.info('Cleaned old webhook deliveries', {
        deleted,
        daysToKeep
      });
      
      return deleted;
    } catch (error) {
      logger.error('Error cleaning old deliveries', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(webhookId) {
    return this.webhookModel.findByPk(webhookId);
  }

  /**
   * List webhooks
   */
  async listWebhooks(filters = {}) {
    const where = {};
    
    if (filters.userId) {
      where.user_id = filters.userId;
    }
    
    if (filters.buildingId) {
      where.building_id = filters.buildingId;
    }
    
    if (filters.isActive !== undefined) {
      where.is_active = filters.isActive;
    }

    return this.webhookModel.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(webhookId) {
    const webhook = await this.webhookModel.findByPk(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    return this.sendTestEvent(webhook);
  }
}

// Export singleton
module.exports = new WebhookService();