import { Router } from 'express';
import { AccessController } from '../controllers/AccessController';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { 
  createAccessSchema,
  updateAccessSchema,
  generatePINSchema,
  validateAccessSchema
} from '../schemas/accessSchemas';

export function createAccessRoutes(accessController: AccessController): Router {
  const router = Router();

  // Generate PIN for user
  router.post(
    '/generate-pin',
    authenticate,
    authorize(['access:create']),
    validateRequest(generatePINSchema),
    accessController.generatePIN.bind(accessController)
  );

  // Validate access attempt
  router.post(
    '/validate',
    validateRequest(validateAccessSchema),
    accessController.validateAccess.bind(accessController)
  );

  // Create access
  router.post(
    '/',
    authenticate,
    authorize(['access:create']),
    validateRequest(createAccessSchema),
    accessController.createAccess.bind(accessController)
  );

  // Get access by ID
  router.get(
    '/:id',
    authenticate,
    authorize(['access:read']),
    accessController.getAccess.bind(accessController)
  );

  // Update access
  router.put(
    '/:id',
    authenticate,
    authorize(['access:update']),
    validateRequest(updateAccessSchema),
    accessController.updateAccess.bind(accessController)
  );

  // Suspend access
  router.post(
    '/:id/suspend',
    authenticate,
    authorize(['access:suspend']),
    accessController.suspendAccess.bind(accessController)
  );

  // Revoke access
  router.post(
    '/:id/revoke',
    authenticate,
    authorize(['access:revoke']),
    accessController.revokeAccess.bind(accessController)
  );

  // Reactivate access
  router.post(
    '/:id/reactivate',
    authenticate,
    authorize(['access:update']),
    accessController.reactivateAccess.bind(accessController)
  );

  // Get user accesses
  router.get(
    '/user/:userId',
    authenticate,
    authorize(['access:read']),
    accessController.getUserAccesses.bind(accessController)
  );

  // Get building accesses
  router.get(
    '/building/:buildingId',
    authenticate,
    authorize(['access:read']),
    accessController.getBuildingAccesses.bind(accessController)
  );

  // Bulk operations
  router.post(
    '/bulk/suspend',
    authenticate,
    authorize(['access:suspend']),
    accessController.bulkSuspend.bind(accessController)
  );

  router.post(
    '/bulk/revoke',
    authenticate,
    authorize(['access:revoke']),
    accessController.bulkRevoke.bind(accessController)
  );

  // Statistics
  router.get(
    '/stats/by-status',
    authenticate,
    authorize(['access:read']),
    accessController.getAccessStatsByStatus.bind(accessController)
  );

  router.get(
    '/stats/by-type',
    authenticate,
    authorize(['access:read']),
    accessController.getAccessStatsByType.bind(accessController)
  );

  return router;
}