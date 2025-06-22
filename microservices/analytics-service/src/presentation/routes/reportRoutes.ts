import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { 
  createReportSchema,
  updateReportSchema,
  scheduleReportSchema,
  reportFiltersSchema
} from '../validators/reportValidators';

export const createReportRoutes = (reportController: ReportController): Router => {
  const router = Router();

  // Apply authentication to all routes
  router.use(authenticate);

  // Create a new report
  router.post(
    '/',
    authorize(['analytics:create', 'reports:create']),
    validateRequest(createReportSchema),
    reportController.createReport.bind(reportController)
  );

  // Get all reports with filters
  router.get(
    '/',
    authorize(['analytics:read', 'reports:read']),
    validateRequest(reportFiltersSchema, 'query'),
    reportController.getReports.bind(reportController)
  );

  // Get a specific report
  router.get(
    '/:id',
    authorize(['analytics:read', 'reports:read']),
    reportController.getReport.bind(reportController)
  );

  // Update report
  router.put(
    '/:id',
    authorize(['analytics:update', 'reports:update']),
    validateRequest(updateReportSchema),
    reportController.updateReport.bind(reportController)
  );

  // Delete report
  router.delete(
    '/:id',
    authorize(['analytics:delete', 'reports:delete']),
    reportController.deleteReport.bind(reportController)
  );

  // Download report file
  router.get(
    '/:id/download',
    authorize(['analytics:read', 'reports:read']),
    reportController.downloadReport.bind(reportController)
  );

  // Generate report immediately
  router.post(
    '/:id/generate',
    authorize(['analytics:create', 'reports:generate']),
    reportController.generateReport.bind(reportController)
  );

  // Schedule report
  router.post(
    '/:id/schedule',
    authorize(['analytics:create', 'reports:schedule']),
    validateRequest(scheduleReportSchema),
    reportController.scheduleReport.bind(reportController)
  );

  // Get report status
  router.get(
    '/:id/status',
    authorize(['analytics:read', 'reports:read']),
    reportController.getReportStatus.bind(reportController)
  );

  // Share report
  router.post(
    '/:id/share',
    authorize(['analytics:share', 'reports:share']),
    reportController.shareReport.bind(reportController)
  );

  // Get scheduled reports
  router.get(
    '/scheduled/list',
    authorize(['analytics:read', 'reports:read']),
    reportController.getScheduledReports.bind(reportController)
  );

  // Get report templates
  router.get(
    '/templates/list',
    authorize(['analytics:read', 'reports:read']),
    reportController.getReportTemplates.bind(reportController)
  );

  // Preview report data
  router.post(
    '/preview',
    authorize(['analytics:read', 'reports:preview']),
    reportController.previewReport.bind(reportController)
  );

  return router;
};