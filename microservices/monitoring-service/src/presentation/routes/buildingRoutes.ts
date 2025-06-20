import { Router } from 'express';
import { BuildingController } from '../controllers/BuildingController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { RoleMiddleware } from '../middleware/RoleMiddleware';

export function createBuildingRoutes(
  buildingController: BuildingController,
  authMiddleware: AuthMiddleware,
  roleMiddleware: RoleMiddleware
): Router {
  const router = Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware.authenticate);

  // Create building - Admin or Manager only
  router.post(
    '/',
    roleMiddleware.requireRoles(['admin', 'manager']),
    buildingController.createBuilding.bind(buildingController)
  );

  // Get all buildings - All authenticated users
  router.get(
    '/',
    buildingController.getBuildings.bind(buildingController)
  );

  // Get buildings by location - All authenticated users
  router.get(
    '/location',
    buildingController.getBuildingsByLocation.bind(buildingController)
  );

  // Get specific building - All authenticated users
  router.get(
    '/:id',
    buildingController.getBuilding.bind(buildingController)
  );

  // Update building - Admin or Manager only
  router.put(
    '/:id',
    roleMiddleware.requireRoles(['admin', 'manager']),
    buildingController.updateBuilding.bind(buildingController)
  );

  // Delete building - Admin only
  router.delete(
    '/:id',
    roleMiddleware.requireRoles(['admin']),
    buildingController.deleteBuilding.bind(buildingController)
  );

  // Update building status - Admin or Manager only
  router.patch(
    '/:id/status',
    roleMiddleware.requireRoles(['admin', 'manager']),
    buildingController.updateBuildingStatus.bind(buildingController)
  );

  // Get building statistics - All authenticated users
  router.get(
    '/:id/stats',
    buildingController.getBuildingStats.bind(buildingController)
  );

  return router;
}