// Service registry routes for API Gateway

import { Router, Request, Response } from 'express';
import { ServiceRegistry } from '../services/service-registry';
import { Logger } from '@forten/shared';

export const createServiceRegistryRoutes = (registry: ServiceRegistry, logger: Logger) => {
  const router = Router();

  // Register a service
  router.post('/services/register', async (req: Request, res: Response) => {
    try {
      const service = await registry.register(req.body);
      
      logger.info('Service registered', {
        service: service.name,
        id: service.id,
      });
      
      res.status(201).json(service);
    } catch (error) {
      logger.error('Failed to register service', error as Error);
      res.status(500).json({ error: 'Failed to register service' });
    }
  });

  // Deregister a service
  router.post('/services/deregister', async (req: Request, res: Response) => {
    try {
      const { id } = req.body;
      await registry.deregister(id);
      
      logger.info('Service deregistered', { id });
      
      res.status(200).json({ message: 'Service deregistered' });
    } catch (error) {
      logger.error('Failed to deregister service', error as Error);
      res.status(500).json({ error: 'Failed to deregister service' });
    }
  });

  // Discover services
  router.get('/services/discover', async (req: Request, res: Response) => {
    try {
      const { name, version } = req.query;
      const services = await registry.discover(
        name as string,
        version as string | undefined
      );
      
      res.json(services);
    } catch (error) {
      logger.error('Failed to discover services', error as Error);
      res.status(500).json({ error: 'Failed to discover services' });
    }
  });

  // Get all services
  router.get('/services', async (req: Request, res: Response) => {
    try {
      const services = await registry.getAllServices();
      res.json(services);
    } catch (error) {
      logger.error('Failed to get services', error as Error);
      res.status(500).json({ error: 'Failed to get services' });
    }
  });

  // Get service by ID
  router.get('/services/:id', async (req: Request, res: Response) => {
    try {
      const service = await registry.getService(req.params.id);
      
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }
      
      res.json(service);
    } catch (error) {
      logger.error('Failed to get service', error as Error);
      res.status(500).json({ error: 'Failed to get service' });
    }
  });

  // Update service metadata
  router.put('/services/:id', async (req: Request, res: Response) => {
    try {
      const { metadata } = req.body;
      const service = await registry.updateMetadata(req.params.id, metadata);
      
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }
      
      logger.info('Service metadata updated', { id: req.params.id });
      
      res.json(service);
    } catch (error) {
      logger.error('Failed to update service metadata', error as Error);
      res.status(500).json({ error: 'Failed to update service metadata' });
    }
  });

  // Service heartbeat
  router.post('/services/:id/heartbeat', async (req: Request, res: Response) => {
    try {
      const { status, timestamp } = req.body;
      await registry.heartbeat(req.params.id, status, timestamp);
      
      res.status(200).json({ message: 'Heartbeat received' });
    } catch (error) {
      logger.error('Failed to process heartbeat', error as Error);
      res.status(500).json({ error: 'Failed to process heartbeat' });
    }
  });

  // Health check endpoint
  router.get('/services/:id/health', async (req: Request, res: Response) => {
    try {
      const health = await registry.checkHealth(req.params.id);
      
      if (!health) {
        return res.status(404).json({ error: 'Service not found' });
      }
      
      const statusCode = health.status === 'UP' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Failed to check service health', error as Error);
      res.status(500).json({ error: 'Failed to check service health' });
    }
  });

  // Service metrics
  router.get('/services/:id/metrics', async (req: Request, res: Response) => {
    try {
      const metrics = await registry.getServiceMetrics(req.params.id);
      
      if (!metrics) {
        return res.status(404).json({ error: 'Service not found' });
      }
      
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get service metrics', error as Error);
      res.status(500).json({ error: 'Failed to get service metrics' });
    }
  });

  return router;
};