/**
 * Notification Queue System
 * Bull-based notification processing with automatic retries and exponential backoff
 */

const Queue = require('bull');
const { getRedisClient } = require('../config/redis');

// Notification priorities
const PRIORITIES = {
  CRITICAL: 1,     // Security alerts, system failures
  HIGH: 2,         // Access denied, important events
  MEDIUM: 3,       // Access granted, general notifications
  LOW: 4          // System info, non-urgent updates
};

// Notification types
const NOTIFICATION_TYPES = {
  SECURITY_ALERT: 'security_alert',
  ACCESS_GRANTED: 'access_granted',
  ACCESS_DENIED: 'access_denied',
  SYSTEM_EVENT: 'system_event',
  USER_ACTIVITY: 'user_activity',
  DEVICE_STATUS: 'device_status',
  MAINTENANCE: 'maintenance',
  REPORT_GENERATED: 'report_generated'
};

// Delivery channels
const CHANNELS = {
  EMAIL: 'email',
  WEBSOCKET: 'websocket',
  WHATSAPP: 'whatsapp',
  SMS: 'sms'
};

// Queue configuration
const QUEUE_CONFIG = {
  redis: {
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || 'localhost',
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0
  },
  defaultJobOptions: {
    removeOnComplete: 100, // Keep 100 completed jobs
    removeOnFail: 50,      // Keep 50 failed jobs
    attempts: 3,           // 3 retry attempts
    backoff: {
      type: 'exponential',
      delay: 2000          // Start with 2 seconds
    },
    delay: 0               // No initial delay
  }
};

// Create notification queues
const notificationQueue = new Queue('notifications', QUEUE_CONFIG);
const emailQueue = new Queue('email-notifications', QUEUE_CONFIG);
const websocketQueue = new Queue('websocket-notifications', QUEUE_CONFIG);
const whatsappQueue = new Queue('whatsapp-notifications', QUEUE_CONFIG);

// Queue event handlers
function setupQueueEvents(queue, queueName) {
  queue.on('completed', (job, result) => {
    console.log(`✅ ${queueName} job ${job.id} completed:`, result);
  });

  queue.on('failed', (job, err) => {
    console.error(`❌ ${queueName} job ${job.id} failed:`, err.message);
  });

  queue.on('stalled', (job) => {
    console.warn(`⚠️  ${queueName} job ${job.id} stalled`);
  });

  queue.on('progress', (job, progress) => {
    console.log(`🔄 ${queueName} job ${job.id} progress: ${progress}%`);
  });

  queue.on('waiting', (jobId) => {
    console.log(`⏳ ${queueName} job ${jobId} waiting`);
  });

  queue.on('active', (job, jobPromise) => {
    console.log(`🚀 ${queueName} job ${job.id} started`);
  });
}

// Setup event handlers for all queues
setupQueueEvents(notificationQueue, 'Notification');
setupQueueEvents(emailQueue, 'Email');
setupQueueEvents(websocketQueue, 'WebSocket');
setupQueueEvents(whatsappQueue, 'WhatsApp');

/**
 * Add notification to appropriate queue
 */
async function addNotification(type, data, options = {}) {
  try {
    const notification = {
      id: require('uuid').v4(),
      type,
      data,
      timestamp: new Date().toISOString(),
      channels: options.channels || [CHANNELS.WEBSOCKET],
      priority: options.priority || PRIORITIES.MEDIUM,
      recipients: options.recipients || [],
      metadata: options.metadata || {}
    };

    // Job options with priority and retry configuration
    const jobOptions = {
      ...QUEUE_CONFIG.defaultJobOptions,
      priority: notification.priority,
      delay: options.delay || 0,
      attempts: options.attempts || 3,
      backoff: options.backoff || {
        type: 'exponential',
        delay: 2000
      }
    };

    // Add to main notification queue
    const job = await notificationQueue.add('process-notification', notification, jobOptions);
    
    console.log(`📢 Notification queued: ${type} (Job ID: ${job.id})`);
    
    return {
      success: true,
      jobId: job.id,
      notificationId: notification.id,
      type: type,
      channels: notification.channels
    };
  } catch (error) {
    console.error('❌ Failed to queue notification:', error);
    throw error;
  }
}

/**
 * Add security alert notification
 */
async function addSecurityAlert(alert, recipients = []) {
  return await addNotification(NOTIFICATION_TYPES.SECURITY_ALERT, alert, {
    priority: PRIORITIES.CRITICAL,
    channels: [CHANNELS.EMAIL, CHANNELS.WEBSOCKET, CHANNELS.WHATSAPP],
    recipients,
    attempts: 5, // More attempts for critical alerts
    metadata: {
      category: 'security',
      urgency: 'critical'
    }
  });
}

/**
 * Add access notification
 */
async function addAccessNotification(accessEvent, recipients = []) {
  const type = accessEvent.status === 'granted' ? 
    NOTIFICATION_TYPES.ACCESS_GRANTED : 
    NOTIFICATION_TYPES.ACCESS_DENIED;
  
  const priority = accessEvent.status === 'denied' ? 
    PRIORITIES.HIGH : 
    PRIORITIES.MEDIUM;

  return await addNotification(type, accessEvent, {
    priority,
    channels: [CHANNELS.WEBSOCKET, CHANNELS.EMAIL],
    recipients,
    metadata: {
      category: 'access',
      buildingId: accessEvent.buildingId,
      userId: accessEvent.userId
    }
  });
}

/**
 * Add system event notification
 */
async function addSystemEvent(event, recipients = []) {
  const priority = event.severity === 'high' ? PRIORITIES.HIGH : PRIORITIES.MEDIUM;
  
  return await addNotification(NOTIFICATION_TYPES.SYSTEM_EVENT, event, {
    priority,
    channels: [CHANNELS.WEBSOCKET],
    recipients,
    metadata: {
      category: 'system',
      severity: event.severity
    }
  });
}

/**
 * Add user activity notification
 */
async function addUserActivity(activity, recipients = []) {
  return await addNotification(NOTIFICATION_TYPES.USER_ACTIVITY, activity, {
    priority: PRIORITIES.LOW,
    channels: [CHANNELS.WEBSOCKET],
    recipients,
    metadata: {
      category: 'user',
      userId: activity.userId
    }
  });
}

/**
 * Add device status notification
 */
async function addDeviceStatus(device, recipients = []) {
  const priority = device.status === 'offline' ? PRIORITIES.HIGH : PRIORITIES.MEDIUM;
  
  return await addNotification(NOTIFICATION_TYPES.DEVICE_STATUS, device, {
    priority,
    channels: [CHANNELS.EMAIL, CHANNELS.WEBSOCKET],
    recipients,
    metadata: {
      category: 'device',
      deviceId: device.id,
      status: device.status
    }
  });
}

/**
 * Add maintenance notification
 */
async function addMaintenanceNotification(maintenance, recipients = []) {
  return await addNotification(NOTIFICATION_TYPES.MAINTENANCE, maintenance, {
    priority: PRIORITIES.MEDIUM,
    channels: [CHANNELS.EMAIL, CHANNELS.WEBSOCKET],
    recipients,
    delay: maintenance.scheduleTime ? new Date(maintenance.scheduleTime).getTime() - Date.now() : 0,
    metadata: {
      category: 'maintenance',
      scheduleTime: maintenance.scheduleTime
    }
  });
}

/**
 * Get queue statistics
 */
async function getQueueStats() {
  try {
    const [
      notificationStats,
      emailStats,
      websocketStats,
      whatsappStats
    ] = await Promise.all([
      getQueueStatus(notificationQueue),
      getQueueStatus(emailQueue),
      getQueueStatus(websocketQueue),
      getQueueStatus(whatsappQueue)
    ]);

    return {
      notification: notificationStats,
      email: emailStats,
      websocket: websocketStats,
      whatsapp: whatsappStats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    throw error;
  }
}

/**
 * Get individual queue status
 */
async function getQueueStatus(queue) {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(),
    queue.getFailed(),
    queue.getDelayed()
  ]);

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
    total: waiting.length + active.length + completed.length + failed.length + delayed.length
  };
}

/**
 * Clean old jobs from queues
 */
async function cleanOldJobs(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
  try {
    const queues = [notificationQueue, emailQueue, websocketQueue, whatsappQueue];
    const results = [];

    for (const queue of queues) {
      const cleaned = await queue.clean(maxAge, 'completed');
      results.push({
        queue: queue.name,
        cleaned: cleaned.length
      });
    }

    console.log('🧹 Queue cleanup completed:', results);
    return results;
  } catch (error) {
    console.error('Error cleaning queues:', error);
    throw error;
  }
}

/**
 * Pause all queues
 */
async function pauseAllQueues() {
  await Promise.all([
    notificationQueue.pause(),
    emailQueue.pause(),
    websocketQueue.pause(),
    whatsappQueue.pause()
  ]);
  console.log('⏸️  All notification queues paused');
}

/**
 * Resume all queues
 */
async function resumeAllQueues() {
  await Promise.all([
    notificationQueue.resume(),
    emailQueue.resume(),
    websocketQueue.resume(),
    whatsappQueue.resume()
  ]);
  console.log('▶️  All notification queues resumed');
}

/**
 * Get failed jobs for retry
 */
async function getFailedJobs(queueName = 'all') {
  try {
    let queues = [];
    
    if (queueName === 'all') {
      queues = [notificationQueue, emailQueue, websocketQueue, whatsappQueue];
    } else {
      const queueMap = {
        'notifications': notificationQueue,
        'email': emailQueue,
        'websocket': websocketQueue,
        'whatsapp': whatsappQueue
      };
      queues = [queueMap[queueName]];
    }

    const failedJobs = [];
    
    for (const queue of queues) {
      const failed = await queue.getFailed();
      failedJobs.push(...failed.map(job => ({
        id: job.id,
        queue: queue.name,
        data: job.data,
        failedReason: job.failedReason,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        attemptsMade: job.attemptsMade,
        opts: job.opts
      })));
    }

    return failedJobs;
  } catch (error) {
    console.error('Error getting failed jobs:', error);
    throw error;
  }
}

/**
 * Retry failed jobs
 */
async function retryFailedJobs(queueName = 'all', jobIds = []) {
  try {
    const queues = queueName === 'all' ? 
      [notificationQueue, emailQueue, websocketQueue, whatsappQueue] :
      [{ 'notifications': notificationQueue, 'email': emailQueue, 'websocket': websocketQueue, 'whatsapp': whatsappQueue }[queueName]];

    let retriedCount = 0;

    for (const queue of queues) {
      const failed = await queue.getFailed();
      
      for (const job of failed) {
        if (jobIds.length === 0 || jobIds.includes(job.id)) {
          await job.retry();
          retriedCount++;
        }
      }
    }

    console.log(`🔄 Retried ${retriedCount} failed jobs`);
    return { retriedCount };
  } catch (error) {
    console.error('Error retrying failed jobs:', error);
    throw error;
  }
}

/**
 * Health check for notification system
 */
async function healthCheck() {
  try {
    const stats = await getQueueStats();
    const redisClient = getRedisClient();
    
    const health = {
      status: 'healthy',
      redis: !!redisClient,
      queues: {
        notification: stats.notification.total,
        email: stats.email.total,
        websocket: stats.websocket.total,
        whatsapp: stats.whatsapp.total
      },
      activeJobs: stats.notification.active + stats.email.active + stats.websocket.active + stats.whatsapp.active,
      failedJobs: stats.notification.failed + stats.email.failed + stats.websocket.failed + stats.whatsapp.failed,
      timestamp: new Date().toISOString()
    };

    // Check Redis connection
    if (redisClient) {
      try {
        await redisClient.ping();
        health.redisStatus = 'connected';
      } catch (error) {
        health.redisStatus = 'error';
        health.status = 'degraded';
      }
    }

    return health;
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  // Queues
  notificationQueue,
  emailQueue,
  websocketQueue,
  whatsappQueue,
  
  // Constants
  PRIORITIES,
  NOTIFICATION_TYPES,
  CHANNELS,
  
  // Main functions
  addNotification,
  
  // Specialized notification functions
  addSecurityAlert,
  addAccessNotification,
  addSystemEvent,
  addUserActivity,
  addDeviceStatus,
  addMaintenanceNotification,
  
  // Queue management
  getQueueStats,
  cleanOldJobs,
  pauseAllQueues,
  resumeAllQueues,
  getFailedJobs,
  retryFailedJobs,
  healthCheck
};