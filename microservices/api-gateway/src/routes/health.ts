import { Router } from 'express';
import serviceRegistry from '../services/service-registry';
import { getCircuitBreakerStats } from '../middleware/circuit-breaker';
import os from 'os';

const router = Router();

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Detailed health check with service status
router.get('/detailed', async (req, res) => {
  const services = await serviceRegistry.checkAllServices();
  const circuitBreakers = getCircuitBreakerStats();
  
  const allHealthy = services.every(service => service.status === 'healthy');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services,
    circuitBreakers
  });
});

// Service-specific health check
router.get('/services/:serviceName', async (req, res) => {
  const { serviceName } = req.params;
  const service = serviceRegistry.getService(serviceName);
  
  if (!service) {
    res.status(404).json({
      error: 'Service not found',
      service: serviceName
    });
    return;
  }
  
  const health = await serviceRegistry.checkServiceHealth(service);
  const circuitBreakerStats = getCircuitBreakerStats()[serviceName];
  
  res.status(health.status === 'healthy' ? 200 : 503).json({
    ...health,
    circuitBreaker: circuitBreakerStats
  });
});

// System metrics
router.get('/metrics', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  res.json({
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external
      },
      cpu: cpuUsage
    },
    system: {
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length
    }
  });
});

// Readiness check
router.get('/ready', async (req, res) => {
  const services = serviceRegistry.getHealthStatus();
  const criticalServices = ['auth', 'user', 'crm'];
  
  const criticalHealthy = criticalServices.every(serviceName => {
    const service = services.find(s => s.name === serviceName);
    return service && service.status === 'healthy';
  });
  
  if (criticalHealthy) {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: 'Critical services are not healthy'
    });
  }
});

// Liveness check
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

export default router;