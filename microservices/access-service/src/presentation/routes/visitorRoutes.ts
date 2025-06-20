import { Router } from 'express';
import { VisitorController } from '../controllers/VisitorController';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  createVisitorSchema,
  updateVisitorSchema,
  checkInVisitorSchema,
  searchVisitorsSchema
} from '../schemas/visitorSchemas';

export function createVisitorRoutes(visitorController: VisitorController): Router {
  const router = Router();

  // Create visitor
  router.post(
    '/',
    authenticate,
    authorize(['visitor:create']),
    validateRequest(createVisitorSchema),
    visitorController.createVisitor.bind(visitorController)
  );

  // Pre-register visitor (public endpoint with token)
  router.post(
    '/pre-register',
    validateRequest(createVisitorSchema),
    visitorController.preRegisterVisitor.bind(visitorController)
  );

  // Check in visitor
  router.post(
    '/check-in',
    authenticate,
    authorize(['visitor:checkin']),
    validateRequest(checkInVisitorSchema),
    visitorController.checkInVisitor.bind(visitorController)
  );

  // Check out visitor
  router.post(
    '/:id/check-out',
    authenticate,
    authorize(['visitor:checkout']),
    visitorController.checkOutVisitor.bind(visitorController)
  );

  // Get visitor by ID
  router.get(
    '/:id',
    authenticate,
    authorize(['visitor:read']),
    visitorController.getVisitor.bind(visitorController)
  );

  // Update visitor
  router.put(
    '/:id',
    authenticate,
    authorize(['visitor:update']),
    validateRequest(updateVisitorSchema),
    visitorController.updateVisitor.bind(visitorController)
  );

  // Cancel visitor
  router.post(
    '/:id/cancel',
    authenticate,
    authorize(['visitor:cancel']),
    visitorController.cancelVisitor.bind(visitorController)
  );

  // Search visitors
  router.get(
    '/',
    authenticate,
    authorize(['visitor:read']),
    validateRequest(searchVisitorsSchema, 'query'),
    visitorController.searchVisitors.bind(visitorController)
  );

  // Get expected visitors
  router.get(
    '/expected/:date',
    authenticate,
    authorize(['visitor:read']),
    visitorController.getExpectedVisitors.bind(visitorController)
  );

  // Get checked-in visitors
  router.get(
    '/checked-in/:buildingId',
    authenticate,
    authorize(['visitor:read']),
    visitorController.getCheckedInVisitors.bind(visitorController)
  );

  // Get host's visitors
  router.get(
    '/host/:hostId',
    authenticate,
    authorize(['visitor:read']),
    visitorController.getHostVisitors.bind(visitorController)
  );

  // Upload visitor photo
  router.post(
    '/:id/photo',
    authenticate,
    authorize(['visitor:update']),
    visitorController.uploadVisitorPhoto.bind(visitorController)
  );

  // Accept agreements
  router.post(
    '/:id/agreements',
    authenticate,
    authorize(['visitor:update']),
    visitorController.acceptAgreements.bind(visitorController)
  );

  // Statistics
  router.get(
    '/stats/by-status',
    authenticate,
    authorize(['visitor:read']),
    visitorController.getVisitorStatsByStatus.bind(visitorController)
  );

  router.get(
    '/stats/by-type',
    authenticate,
    authorize(['visitor:read']),
    visitorController.getVisitorStatsByType.bind(visitorController)
  );

  router.get(
    '/stats/host/:hostId',
    authenticate,
    authorize(['visitor:read']),
    visitorController.getHostStatistics.bind(visitorController)
  );

  // Bulk operations
  router.post(
    '/bulk/mark-no-show',
    authenticate,
    authorize(['visitor:update']),
    visitorController.markNoShows.bind(visitorController)
  );

  return router;
}