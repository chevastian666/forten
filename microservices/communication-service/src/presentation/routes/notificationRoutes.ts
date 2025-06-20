import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

export function createNotificationRoutes(controller: NotificationController): Router {
  const router = Router();

  // Apply authentication to all routes
  router.use(authenticate);

  // Send single notification
  router.post(
    '/',
    rateLimiter({ windowMs: 60000, max: 100 }), // 100 requests per minute
    controller.send.bind(controller)
  );

  // Send batch notifications
  router.post(
    '/batch',
    rateLimiter({ windowMs: 60000, max: 10 }), // 10 batch requests per minute
    controller.sendBatch.bind(controller)
  );

  // Get notification by ID
  router.get(
    '/:id',
    controller.getById.bind(controller)
  );

  // List notifications with filters
  router.get(
    '/',
    controller.list.bind(controller)
  );

  // Get notification statistics
  router.get(
    '/stats/delivery',
    controller.getStats.bind(controller)
  );

  // Cancel a pending/queued notification
  router.post(
    '/:id/cancel',
    controller.cancel.bind(controller)
  );

  // Retry a failed notification
  router.post(
    '/:id/retry',
    controller.retry.bind(controller)
  );

  return router;
}