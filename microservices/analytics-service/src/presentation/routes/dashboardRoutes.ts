import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  createDashboardSchema,
  updateDashboardSchema,
  addWidgetSchema,
  updateWidgetSchema,
  shareDashboardSchema,
  dashboardFiltersSchema
} from '../validators/dashboardValidators';

export const createDashboardRoutes = (dashboardController: DashboardController): Router => {
  const router = Router();

  // Apply authentication to all routes
  router.use(authenticate);

  // Create a new dashboard
  router.post(
    '/',
    authorize(['analytics:create', 'dashboards:create']),
    validateRequest(createDashboardSchema),
    dashboardController.createDashboard.bind(dashboardController)
  );

  // Get all dashboards
  router.get(
    '/',
    authorize(['analytics:read', 'dashboards:read']),
    validateRequest(dashboardFiltersSchema, 'query'),
    dashboardController.getDashboards.bind(dashboardController)
  );

  // Get public dashboards
  router.get(
    '/public',
    dashboardController.getPublicDashboards.bind(dashboardController)
  );

  // Get a specific dashboard
  router.get(
    '/:id',
    authorize(['analytics:read', 'dashboards:read']),
    dashboardController.getDashboard.bind(dashboardController)
  );

  // Update dashboard
  router.put(
    '/:id',
    authorize(['analytics:update', 'dashboards:update']),
    validateRequest(updateDashboardSchema),
    dashboardController.updateDashboard.bind(dashboardController)
  );

  // Delete dashboard
  router.delete(
    '/:id',
    authorize(['analytics:delete', 'dashboards:delete']),
    dashboardController.deleteDashboard.bind(dashboardController)
  );

  // Clone dashboard
  router.post(
    '/:id/clone',
    authorize(['analytics:create', 'dashboards:create']),
    dashboardController.cloneDashboard.bind(dashboardController)
  );

  // Share dashboard
  router.post(
    '/:id/share',
    authorize(['analytics:share', 'dashboards:share']),
    validateRequest(shareDashboardSchema),
    dashboardController.shareDashboard.bind(dashboardController)
  );

  // Revoke dashboard access
  router.delete(
    '/:id/share/:userId',
    authorize(['analytics:share', 'dashboards:share']),
    dashboardController.revokeDashboardAccess.bind(dashboardController)
  );

  // Widget operations
  router.post(
    '/:id/widgets',
    authorize(['analytics:update', 'dashboards:update']),
    validateRequest(addWidgetSchema),
    dashboardController.addWidget.bind(dashboardController)
  );

  router.put(
    '/:id/widgets/:widgetId',
    authorize(['analytics:update', 'dashboards:update']),
    validateRequest(updateWidgetSchema),
    dashboardController.updateWidget.bind(dashboardController)
  );

  router.delete(
    '/:id/widgets/:widgetId',
    authorize(['analytics:update', 'dashboards:update']),
    dashboardController.removeWidget.bind(dashboardController)
  );

  // Update widget layout
  router.put(
    '/:id/layout',
    authorize(['analytics:update', 'dashboards:update']),
    dashboardController.updateLayout.bind(dashboardController)
  );

  // Get widget data
  router.get(
    '/:id/widgets/:widgetId/data',
    authorize(['analytics:read', 'dashboards:read']),
    dashboardController.getWidgetData.bind(dashboardController)
  );

  // Refresh dashboard data
  router.post(
    '/:id/refresh',
    authorize(['analytics:read', 'dashboards:read']),
    dashboardController.refreshDashboard.bind(dashboardController)
  );

  // Export dashboard
  router.get(
    '/:id/export',
    authorize(['analytics:export', 'dashboards:export']),
    dashboardController.exportDashboard.bind(dashboardController)
  );

  // Import dashboard
  router.post(
    '/import',
    authorize(['analytics:create', 'dashboards:import']),
    dashboardController.importDashboard.bind(dashboardController)
  );

  // Get dashboard templates
  router.get(
    '/templates/list',
    authorize(['analytics:read', 'dashboards:read']),
    dashboardController.getDashboardTemplates.bind(dashboardController)
  );

  // Get widget types
  router.get(
    '/widgets/types',
    authorize(['analytics:read', 'dashboards:read']),
    dashboardController.getWidgetTypes.bind(dashboardController)
  );

  return router;
};