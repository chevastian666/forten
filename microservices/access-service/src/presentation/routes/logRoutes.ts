import { Router } from 'express';
import { LogController } from '../controllers/LogController';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  logAccessSchema,
  searchLogsSchema,
  exportLogsSchema
} from '../schemas/logSchemas';

export function createLogRoutes(logController: LogController): Router {
  const router = Router();

  // Log access attempt (internal use)
  router.post(
    '/',
    validateRequest(logAccessSchema),
    logController.logAccess.bind(logController)
  );

  // Search logs
  router.get(
    '/',
    authenticate,
    authorize(['logs:read']),
    validateRequest(searchLogsSchema, 'query'),
    logController.searchLogs.bind(logController)
  );

  // Get log by ID
  router.get(
    '/:id',
    authenticate,
    authorize(['logs:read']),
    logController.getLog.bind(logController)
  );

  // Get recent logs
  router.get(
    '/recent/:limit',
    authenticate,
    authorize(['logs:read']),
    logController.getRecentLogs.bind(logController)
  );

  // Get failures
  router.get(
    '/failures/:period',
    authenticate,
    authorize(['logs:read']),
    logController.getFailures.bind(logController)
  );

  // Get user access history
  router.get(
    '/user/:userId',
    authenticate,
    authorize(['logs:read']),
    logController.getUserAccessHistory.bind(logController)
  );

  // Get visitor access history
  router.get(
    '/visitor/:visitorId',
    authenticate,
    authorize(['logs:read']),
    logController.getVisitorAccessHistory.bind(logController)
  );

  // Get door access history
  router.get(
    '/door/:doorId',
    authenticate,
    authorize(['logs:read']),
    logController.getDoorAccessHistory.bind(logController)
  );

  // Analytics
  router.get(
    '/analytics/statistics',
    authenticate,
    authorize(['logs:analytics']),
    logController.getAccessStatistics.bind(logController)
  );

  router.get(
    '/analytics/hourly/:date',
    authenticate,
    authorize(['logs:analytics']),
    logController.getHourlyDistribution.bind(logController)
  );

  router.get(
    '/analytics/top-doors/:period',
    authenticate,
    authorize(['logs:analytics']),
    logController.getTopAccessPoints.bind(logController)
  );

  router.get(
    '/analytics/patterns/:userId',
    authenticate,
    authorize(['logs:analytics']),
    logController.getUserAccessPatterns.bind(logController)
  );

  // Export for audit
  router.post(
    '/export',
    authenticate,
    authorize(['logs:export']),
    validateRequest(exportLogsSchema),
    logController.exportLogs.bind(logController)
  );

  // Real-time monitoring subscription endpoint
  router.get(
    '/stream',
    authenticate,
    authorize(['logs:monitor']),
    logController.streamLogs.bind(logController)
  );

  return router;
}