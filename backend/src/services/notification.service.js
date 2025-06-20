/**
 * Notification Service Manager
 * Unified interface for managing all notification queues and processors
 */

const {
  notificationQueue,
  emailQueue,
  websocketQueue,
  whatsappQueue,
  addNotification,
  addSecurityAlert,
  addAccessNotification,
  addSystemEvent,
  addUserActivity,
  addDeviceStatus,
  addMaintenanceNotification,
  getQueueStats,
  cleanOldJobs,
  pauseAllQueues,
  resumeAllQueues,
  getFailedJobs,
  retryFailedJobs,
  healthCheck,
  PRIORITIES,
  NOTIFICATION_TYPES,
  CHANNELS
} = require('../queues/notification.queue');

const { processEmailNotification } = require('../queues/processors/email.processor');
const { processWebSocketNotification } = require('../queues/processors/websocket.processor');
const { processWhatsAppNotification } = require('../queues/processors/whatsapp.processor');
const { notification: notifLogger } = require('../config/logger');

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.socketIo = null;
    this.processors = {
      email: processEmailNotification,
      websocket: processWebSocketNotification,
      whatsapp: processWhatsAppNotification
    };
  }

  /**
   * Initialize the notification service with Socket.IO instance
   */
  async initialize(socketIo = null) {
    try {
      notifLogger.info('Initializing Notification Service...');
      
      this.socketIo = socketIo;
      
      // Setup queue processors
      await this.setupProcessors();
      
      // Setup automatic cleanup
      await this.setupCleanup();
      
      this.isInitialized = true;
      notifLogger.info('Notification Service initialized successfully', {
        hasSocketIO: !!socketIo
      });
      
      return { success: true, message: 'Notification service initialized' };
    } catch (error) {
      notifLogger.error('Failed to initialize Notification Service:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Setup queue processors
   */
  async setupProcessors() {
    // Main notification processor - distributes to specific queues
    notificationQueue.process('process-notification', async (job) => {
      const { data } = job;
      notifLogger.debug('Processing notification', {
        type: data.type,
        priority: data.priority,
        channels: data.channels,
        userId: data.userId
      });
      
      job.progress(10);
      
      const results = [];
      
      // Process each channel
      for (const channel of data.channels) {
        try {
          let result;
          
          switch (channel) {
            case CHANNELS.EMAIL:
              result = await emailQueue.add('send-email', data, {
                priority: data.priority,
                attempts: 3
              });
              results.push({ channel: 'email', jobId: result.id, status: 'queued' });
              break;
              
            case CHANNELS.WEBSOCKET:
              result = await websocketQueue.add('send-websocket', data, {
                priority: data.priority,
                attempts: 2,
                opts: { io: this.socketIo }
              });
              results.push({ channel: 'websocket', jobId: result.id, status: 'queued' });
              break;
              
            case CHANNELS.WHATSAPP:
              result = await whatsappQueue.add('send-whatsapp', data, {
                priority: data.priority,
                attempts: 3
              });
              results.push({ channel: 'whatsapp', jobId: result.id, status: 'queued' });
              break;
              
            default:
              notifLogger.warn('Unknown channel', {
                channel,
                notificationType: data.type
              });
          }
          
          job.progress(30 + (results.length / data.channels.length) * 60);
        } catch (error) {
          notifLogger.error('Failed to queue notification', {
            channel,
            error: error.message,
            notificationType: data.type
          });
          results.push({ channel, status: 'failed', error: error.message });
        }
      }
      
      job.progress(100);
      
      return {
        notificationId: data.id,
        type: data.type,
        channels: data.channels.length,
        results: results,
        timestamp: new Date().toISOString()
      };
    });

    // Email processor
    emailQueue.process('send-email', async (job) => {
      return await this.processors.email(job);
    });

    // WebSocket processor
    websocketQueue.process('send-websocket', async (job) => {
      // Inject Socket.IO instance and building rooms manager
      job.opts.io = this.socketIo;
      job.opts.buildingRoomsManager = global.buildingRoomsManager;
      return await this.processors.websocket(job);
    });

    // WhatsApp processor
    whatsappQueue.process('send-whatsapp', async (job) => {
      return await this.processors.whatsapp(job);
    });

    notifLogger.info('Notification processors setup completed');
  }

  /**
   * Setup automatic cleanup
   */
  async setupCleanup() {
    // Clean old jobs every hour
    setInterval(async () => {
      try {
        await cleanOldJobs(24 * 60 * 60 * 1000); // 24 hours
      } catch (error) {
        notifLogger.error('Auto cleanup failed:', {
          error: error.message
        });
      }
    }, 60 * 60 * 1000); // 1 hour

    notifLogger.info('Automatic cleanup scheduled', {
      interval: 'every hour'
    });
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(alertData, recipients = []) {
    if (!this.isInitialized) {
      throw new Error('Notification service not initialized');
    }

    return await addSecurityAlert(alertData, recipients);
  }

  /**
   * Send access notification
   */
  async sendAccessNotification(accessData, recipients = []) {
    if (!this.isInitialized) {
      throw new Error('Notification service not initialized');
    }

    return await addAccessNotification(accessData, recipients);
  }

  /**
   * Send system event notification
   */
  async sendSystemEvent(eventData, recipients = []) {
    if (!this.isInitialized) {
      throw new Error('Notification service not initialized');
    }

    return await addSystemEvent(eventData, recipients);
  }

  /**
   * Send user activity notification
   */
  async sendUserActivity(activityData, recipients = []) {
    if (!this.isInitialized) {
      throw new Error('Notification service not initialized');
    }

    return await addUserActivity(activityData, recipients);
  }

  /**
   * Send device status notification
   */
  async sendDeviceStatus(deviceData, recipients = []) {
    if (!this.isInitialized) {
      throw new Error('Notification service not initialized');
    }

    return await addDeviceStatus(deviceData, recipients);
  }

  /**
   * Send maintenance notification
   */
  async sendMaintenanceNotification(maintenanceData, recipients = []) {
    if (!this.isInitialized) {
      throw new Error('Notification service not initialized');
    }

    return await addMaintenanceNotification(maintenanceData, recipients);
  }

  /**
   * Send custom notification
   */
  async sendCustomNotification(type, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Notification service not initialized');
    }

    return await addNotification(type, data, options);
  }

  /**
   * Get notification statistics
   */
  async getStats() {
    return await getQueueStats();
  }

  /**
   * Get failed notifications
   */
  async getFailedNotifications(queueName = 'all') {
    return await getFailedJobs(queueName);
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(queueName = 'all', jobIds = []) {
    return await retryFailedJobs(queueName, jobIds);
  }

  /**
   * Pause notification processing
   */
  async pauseNotifications() {
    await pauseAllQueues();
    return { status: 'paused', timestamp: new Date().toISOString() };
  }

  /**
   * Resume notification processing
   */
  async resumeNotifications() {
    await resumeAllQueues();
    return { status: 'resumed', timestamp: new Date().toISOString() };
  }

  /**
   * Clean old notifications
   */
  async cleanOldNotifications(maxAge = 24 * 60 * 60 * 1000) {
    return await cleanOldJobs(maxAge);
  }

  /**
   * Health check
   */
  async getHealthStatus() {
    const health = await healthCheck();
    health.serviceInitialized = this.isInitialized;
    health.socketIoAvailable = !!this.socketIo;
    return health;
  }

  /**
   * Shutdown notification service
   */
  async shutdown() {
    try {
      notifLogger.info('Shutting down Notification Service...');
      
      // Pause all queues
      await pauseAllQueues();
      
      // Close all queues
      await Promise.all([
        notificationQueue.close(),
        emailQueue.close(),
        websocketQueue.close(),
        whatsappQueue.close()
      ]);
      
      this.isInitialized = false;
      notifLogger.info('Notification Service shutdown completed');
    } catch (error) {
      notifLogger.error('Error during notification service shutdown:', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get queue dashboard data
   */
  async getDashboardData() {
    try {
      const [stats, health, failedJobs] = await Promise.all([
        this.getStats(),
        this.getHealthStatus(),
        this.getFailedNotifications()
      ]);

      return {
        stats,
        health,
        failedJobs: failedJobs.length,
        recentFailedJobs: failedJobs.slice(0, 10), // Last 10 failed jobs
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      notifLogger.error('Error getting dashboard data:', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Test notification system
   */
  async testNotifications() {
    try {
      const testData = {
        description: 'Test notification from FORTEN system',
        timestamp: new Date().toISOString(),
        test: true
      };

      const results = [];

      // Test each channel
      const channels = [CHANNELS.EMAIL, CHANNELS.WEBSOCKET, CHANNELS.WHATSAPP];
      
      for (const channel of channels) {
        try {
          const result = await this.sendCustomNotification('system_test', testData, {
            channels: [channel],
            priority: PRIORITIES.LOW,
            recipients: [{ email: 'test@forten.com.uy', phone: '+59899999999' }]
          });
          
          results.push({
            channel,
            status: 'success',
            jobId: result.jobId
          });
        } catch (error) {
          results.push({
            channel,
            status: 'failed',
            error: error.message
          });
        }
      }

      return {
        testCompleted: true,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      notifLogger.error('Notification test failed:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = {
  notificationService,
  NotificationService,
  
  // Export constants for convenience
  PRIORITIES,
  NOTIFICATION_TYPES,
  CHANNELS
};