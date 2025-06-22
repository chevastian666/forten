import { Router } from 'express';
import { MetricController } from '../controllers/MetricController';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  createMetricSchema,
  updateMetricSchema,
  metricFiltersSchema,
  metricValueSchema,
  metricTimeSeriesSchema
} from '../validators/metricValidators';

export const createMetricRoutes = (metricController: MetricController): Router => {
  const router = Router();

  // Apply authentication to all routes
  router.use(authenticate);

  // Create a new metric
  router.post(
    '/',
    authorize(['analytics:create', 'metrics:create']),
    validateRequest(createMetricSchema),
    metricController.createMetric.bind(metricController)
  );

  // Get all metrics
  router.get(
    '/',
    authorize(['analytics:read', 'metrics:read']),
    validateRequest(metricFiltersSchema, 'query'),
    metricController.getMetrics.bind(metricController)
  );

  // Get KPIs
  router.get(
    '/kpis',
    authorize(['analytics:read', 'metrics:read']),
    metricController.getKPIs.bind(metricController)
  );

  // Get metrics by category
  router.get(
    '/category/:category',
    authorize(['analytics:read', 'metrics:read']),
    metricController.getMetricsByCategory.bind(metricController)
  );

  // Get a specific metric
  router.get(
    '/:id',
    authorize(['analytics:read', 'metrics:read']),
    metricController.getMetric.bind(metricController)
  );

  // Update metric
  router.put(
    '/:id',
    authorize(['analytics:update', 'metrics:update']),
    validateRequest(updateMetricSchema),
    metricController.updateMetric.bind(metricController)
  );

  // Delete metric
  router.delete(
    '/:id',
    authorize(['analytics:delete', 'metrics:delete']),
    metricController.deleteMetric.bind(metricController)
  );

  // Record metric value
  router.post(
    '/:id/values',
    authorize(['analytics:write', 'metrics:write']),
    validateRequest(metricValueSchema),
    metricController.recordMetricValue.bind(metricController)
  );

  // Get metric time series
  router.get(
    '/:id/timeseries',
    authorize(['analytics:read', 'metrics:read']),
    validateRequest(metricTimeSeriesSchema, 'query'),
    metricController.getMetricTimeSeries.bind(metricController)
  );

  // Calculate metric
  router.post(
    '/:id/calculate',
    authorize(['analytics:execute', 'metrics:calculate']),
    metricController.calculateMetric.bind(metricController)
  );

  // Calculate all metrics
  router.post(
    '/calculate/all',
    authorize(['analytics:execute', 'metrics:calculate']),
    metricController.calculateAllMetrics.bind(metricController)
  );

  // Get metric alerts
  router.get(
    '/:id/alerts',
    authorize(['analytics:read', 'metrics:read']),
    metricController.getMetricAlerts.bind(metricController)
  );

  // Set metric thresholds
  router.put(
    '/:id/thresholds',
    authorize(['analytics:update', 'metrics:update']),
    metricController.setMetricThresholds.bind(metricController)
  );

  // Get metric aggregations
  router.get(
    '/:id/aggregate',
    authorize(['analytics:read', 'metrics:read']),
    metricController.getMetricAggregation.bind(metricController)
  );

  // Export metrics
  router.get(
    '/export',
    authorize(['analytics:export', 'metrics:export']),
    metricController.exportMetrics.bind(metricController)
  );

  // Import metrics
  router.post(
    '/import',
    authorize(['analytics:create', 'metrics:import']),
    metricController.importMetrics.bind(metricController)
  );

  // Get metric trends
  router.get(
    '/trends/:period',
    authorize(['analytics:read', 'metrics:read']),
    metricController.getMetricTrends.bind(metricController)
  );

  // Compare metrics
  router.post(
    '/compare',
    authorize(['analytics:read', 'metrics:read']),
    metricController.compareMetrics.bind(metricController)
  );

  return router;
};