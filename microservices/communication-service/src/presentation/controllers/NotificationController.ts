import { Request, Response, NextFunction } from 'express';
import { SendNotificationUseCase, SendNotificationInput } from '../../application/use-cases/SendNotificationUseCase';
import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { Logger } from '../../application/interfaces/ILogger';
import { validateNotification, validateNotificationFilter } from '../validators/notificationValidator';

export class NotificationController {
  constructor(
    private sendNotificationUseCase: SendNotificationUseCase,
    private notificationRepository: INotificationRepository,
    private logger: Logger
  ) {}

  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input
      const validation = validateNotification(req.body);
      if (validation.error) {
        res.status(400).json({ 
          error: 'Validation failed', 
          details: validation.error.details 
        });
        return;
      }

      const input: SendNotificationInput = {
        ...req.body,
        metadata: {
          ...req.body.metadata,
          userId: req.user?.id,
          source: 'api'
        }
      };

      const result = await this.sendNotificationUseCase.execute(input);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      this.logger.error('Failed to send notification', { error: error.message, body: req.body });
      next(error);
    }
  }

  async sendBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notifications } = req.body;

      if (!Array.isArray(notifications) || notifications.length === 0) {
        res.status(400).json({ error: 'Notifications array is required' });
        return;
      }

      if (notifications.length > 1000) {
        res.status(400).json({ error: 'Maximum 1000 notifications per batch' });
        return;
      }

      const results = await Promise.allSettled(
        notifications.map(notification => 
          this.sendNotificationUseCase.execute({
            ...notification,
            metadata: {
              ...notification.metadata,
              userId: req.user?.id,
              source: 'api-batch'
            }
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      res.status(207).json({
        success: true,
        data: {
          total: notifications.length,
          successful,
          failed,
          results: results.map((result, index) => ({
            index,
            status: result.status,
            data: result.status === 'fulfilled' ? result.value : undefined,
            error: result.status === 'rejected' ? result.reason.message : undefined
          }))
        }
      });
    } catch (error: any) {
      this.logger.error('Failed to send batch notifications', { error: error.message });
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const notification = await this.notificationRepository.findById(id);

      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      res.json({
        success: true,
        data: notification
      });
    } catch (error: any) {
      this.logger.error('Failed to get notification', { error: error.message, id: req.params.id });
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = validateNotificationFilter(req.query);
      if (validation.error) {
        res.status(400).json({ 
          error: 'Invalid filter parameters', 
          details: validation.error.details 
        });
        return;
      }

      const filter = {
        ...req.query,
        organizationId: req.user?.organizationId
      };

      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sort: req.query.sort ? {
          field: req.query.sortField as any || 'createdAt',
          direction: req.query.sortDirection as any || 'desc'
        } : undefined
      };

      const result = await this.notificationRepository.find(filter, options);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error: any) {
      this.logger.error('Failed to list notifications', { error: error.message });
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate, channel } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
      }

      const stats = await this.notificationRepository.getDeliveryStats(
        new Date(startDate as string),
        new Date(endDate as string),
        channel as any
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      this.logger.error('Failed to get notification stats', { error: error.message });
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const notification = await this.notificationRepository.findById(id);

      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      if (notification.status !== 'pending' && notification.status !== 'queued') {
        res.status(400).json({ error: 'Can only cancel pending or queued notifications' });
        return;
      }

      await this.notificationRepository.update(id, {
        status: 'cancelled' as any,
        metadata: {
          ...notification.metadata,
          cancelledAt: new Date(),
          cancelledBy: req.user?.id
        }
      });

      res.json({
        success: true,
        message: 'Notification cancelled successfully'
      });
    } catch (error: any) {
      this.logger.error('Failed to cancel notification', { error: error.message, id: req.params.id });
      next(error);
    }
  }

  async retry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const notification = await this.notificationRepository.findById(id);

      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      if (notification.status !== 'failed') {
        res.status(400).json({ error: 'Can only retry failed notifications' });
        return;
      }

      if (!notification.canRetry()) {
        res.status(400).json({ error: 'Notification has exceeded maximum retry attempts' });
        return;
      }

      // Reset status and increment retry count
      notification.status = 'pending' as any;
      notification.incrementRetryCount();

      await this.notificationRepository.update(id, notification);

      // Re-queue the notification
      const result = await this.sendNotificationUseCase.execute({
        ...notification,
        metadata: {
          ...notification.metadata,
          retriedBy: req.user?.id,
          retriedAt: new Date()
        }
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      this.logger.error('Failed to retry notification', { error: error.message, id: req.params.id });
      next(error);
    }
  }
}