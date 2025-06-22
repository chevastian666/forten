import Bull from 'bull';
import { Notification } from '../../domain/entities/Notification';
import { Campaign } from '../../domain/entities/Campaign';
import { IQueueService, QueueOptions } from '../../application/interfaces/IQueueService';
import { Logger } from '../../application/interfaces/ILogger';

export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions?: Bull.JobOptions;
}

export class QueueService implements IQueueService {
  private notificationQueue: Bull.Queue;
  private campaignQueue: Bull.Queue;

  constructor(
    private config: QueueConfig,
    private logger: Logger
  ) {
    this.notificationQueue = new Bull('notifications', {
      redis: this.config.redis,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        ...this.config.defaultJobOptions
      }
    });

    this.campaignQueue = new Bull('campaigns', {
      redis: this.config.redis,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        ...this.config.defaultJobOptions
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Notification queue events
    this.notificationQueue.on('completed', (job) => {
      this.logger.debug('Notification job completed', { jobId: job.id, notificationId: job.data.id });
    });

    this.notificationQueue.on('failed', (job, err) => {
      this.logger.error('Notification job failed', { 
        jobId: job.id, 
        notificationId: job.data.id,
        error: err.message 
      });
    });

    // Campaign queue events
    this.campaignQueue.on('completed', (job) => {
      this.logger.debug('Campaign job completed', { jobId: job.id, campaignId: job.data.id });
    });

    this.campaignQueue.on('failed', (job, err) => {
      this.logger.error('Campaign job failed', { 
        jobId: job.id, 
        campaignId: job.data.id,
        error: err.message 
      });
    });
  }

  async queueNotification(notification: Notification, options?: QueueOptions): Promise<void> {
    const jobOptions: Bull.JobOptions = {
      priority: this.mapPriority(notification.priority),
      delay: options?.delay,
      attempts: options?.attempts || this.getDefaultAttempts(notification.priority),
      backoff: options?.backoff || {
        type: 'exponential',
        delay: 2000
      }
    };

    const job = await this.notificationQueue.add('send', notification, jobOptions);

    this.logger.info('Notification queued', {
      notificationId: notification.id,
      jobId: job.id,
      priority: jobOptions.priority,
      delay: jobOptions.delay
    });
  }

  async queueNotificationBatch(notifications: Notification[], options?: QueueOptions): Promise<void> {
    const jobs = notifications.map(notification => ({
      name: 'send',
      data: notification,
      opts: {
        priority: this.mapPriority(notification.priority),
        delay: options?.delay,
        attempts: options?.attempts || this.getDefaultAttempts(notification.priority),
        backoff: options?.backoff || {
          type: 'exponential' as const,
          delay: 2000
        }
      }
    }));

    await this.notificationQueue.addBulk(jobs);

    this.logger.info('Notification batch queued', {
      count: notifications.length,
      notificationIds: notifications.map(n => n.id)
    });
  }

  async scheduleNotification(notification: Notification, scheduledAt: Date): Promise<void> {
    const delay = scheduledAt.getTime() - Date.now();
    
    if (delay < 0) {
      // If scheduled time is in the past, queue immediately
      await this.queueNotification(notification);
      return;
    }

    await this.queueNotification(notification, { delay });
  }

  async removeNotification(notificationId: string): Promise<boolean> {
    try {
      const jobs = await this.notificationQueue.getJobs(['waiting', 'delayed']);
      const job = jobs.find(j => j.data.id === notificationId);
      
      if (job) {
        await job.remove();
        this.logger.info('Notification removed from queue', { notificationId, jobId: job.id });
        return true;
      }

      return false;
    } catch (error: any) {
      this.logger.error('Failed to remove notification from queue', { 
        notificationId,
        error: error.message 
      });
      return false;
    }
  }

  async queueCampaign(campaign: Campaign): Promise<void> {
    const jobOptions: Bull.JobOptions = {
      priority: this.mapPriority(campaign.settings.priority),
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    };

    const job = await this.campaignQueue.add('process', campaign, jobOptions);

    this.logger.info('Campaign queued', {
      campaignId: campaign.id,
      jobId: job.id,
      type: campaign.type
    });
  }

  async scheduleCampaign(campaign: Campaign, scheduledAt: Date): Promise<void> {
    const delay = scheduledAt.getTime() - Date.now();
    
    if (delay < 0) {
      await this.queueCampaign(campaign);
      return;
    }

    const jobOptions: Bull.JobOptions = {
      delay,
      priority: this.mapPriority(campaign.settings.priority),
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    };

    const job = await this.campaignQueue.add('process', campaign, jobOptions);

    this.logger.info('Campaign scheduled', {
      campaignId: campaign.id,
      jobId: job.id,
      scheduledAt
    });
  }

  async removeCampaign(campaignId: string): Promise<boolean> {
    try {
      const jobs = await this.campaignQueue.getJobs(['waiting', 'delayed', 'active', 'paused']);
      const campaignJobs = jobs.filter(j => j.data.id === campaignId);
      
      for (const job of campaignJobs) {
        await job.remove();
      }

      if (campaignJobs.length > 0) {
        this.logger.info('Campaign removed from queue', { 
          campaignId, 
          jobsRemoved: campaignJobs.length 
        });
        return true;
      }

      return false;
    } catch (error: any) {
      this.logger.error('Failed to remove campaign from queue', { 
        campaignId,
        error: error.message 
      });
      return false;
    }
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [notificationStats, campaignStats] = await Promise.all([
      this.getQueueStatsForQueue(this.notificationQueue),
      this.getQueueStatsForQueue(this.campaignQueue)
    ]);

    return {
      waiting: notificationStats.waiting + campaignStats.waiting,
      active: notificationStats.active + campaignStats.active,
      completed: notificationStats.completed + campaignStats.completed,
      failed: notificationStats.failed + campaignStats.failed,
      delayed: notificationStats.delayed + campaignStats.delayed
    };
  }

  private async getQueueStatsForQueue(queue: Bull.Queue): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async pauseQueue(): Promise<void> {
    await Promise.all([
      this.notificationQueue.pause(),
      this.campaignQueue.pause()
    ]);

    this.logger.info('Queues paused');
  }

  async resumeQueue(): Promise<void> {
    await Promise.all([
      this.notificationQueue.resume(),
      this.campaignQueue.resume()
    ]);

    this.logger.info('Queues resumed');
  }

  async clearQueue(): Promise<void> {
    await Promise.all([
      this.notificationQueue.empty(),
      this.campaignQueue.empty()
    ]);

    this.logger.warn('Queues cleared');
  }

  private mapPriority(priority?: string): number {
    switch (priority) {
      case 'urgent':
        return 10;
      case 'high':
        return 5;
      case 'medium':
        return 0;
      case 'low':
        return -5;
      default:
        return 0;
    }
  }

  private getDefaultAttempts(priority?: string): number {
    switch (priority) {
      case 'urgent':
        return 5;
      case 'high':
        return 3;
      default:
        return 2;
    }
  }

  // Graceful shutdown
  async close(): Promise<void> {
    await Promise.all([
      this.notificationQueue.close(),
      this.campaignQueue.close()
    ]);

    this.logger.info('Queue connections closed');
  }
}