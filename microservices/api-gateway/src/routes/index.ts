import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { createServiceRoutes } from '../middleware/proxy';
import { circuitBreakerMiddleware } from '../middleware/circuit-breaker';
import healthRoutes from './health';

const router = Router();

// Health and monitoring routes (no auth required)
router.use('/health', healthRoutes);

// Public routes (no auth required)
router.use('/api/auth/login', circuitBreakerMiddleware('auth'), createServiceRoutes('auth', '/api/auth'));
router.use('/api/auth/register', circuitBreakerMiddleware('auth'), createServiceRoutes('auth', '/api/auth'));
router.use('/api/auth/refresh', circuitBreakerMiddleware('auth'), createServiceRoutes('auth', '/api/auth'));
router.use('/api/auth/forgot-password', circuitBreakerMiddleware('auth'), createServiceRoutes('auth', '/api/auth'));
router.use('/api/auth/reset-password', circuitBreakerMiddleware('auth'), createServiceRoutes('auth', '/api/auth'));

// Protected routes (auth required)
// Auth service routes
router.use('/api/auth', 
  authenticateToken, 
  circuitBreakerMiddleware('auth'), 
  createServiceRoutes('auth', '/api/auth')
);

// User service routes
router.use('/api/users',
  authenticateToken,
  circuitBreakerMiddleware('user'),
  createServiceRoutes('user', '/api/users')
);

// CRM service routes
router.use('/api/contacts',
  authenticateToken,
  circuitBreakerMiddleware('crm'),
  createServiceRoutes('crm', '/api/contacts')
);

router.use('/api/companies',
  authenticateToken,
  circuitBreakerMiddleware('crm'),
  createServiceRoutes('crm', '/api/companies')
);

router.use('/api/deals',
  authenticateToken,
  circuitBreakerMiddleware('crm'),
  createServiceRoutes('crm', '/api/deals')
);

router.use('/api/activities',
  authenticateToken,
  circuitBreakerMiddleware('crm'),
  createServiceRoutes('crm', '/api/activities')
);

router.use('/api/tasks',
  authenticateToken,
  circuitBreakerMiddleware('crm'),
  createServiceRoutes('crm', '/api/tasks')
);

router.use('/api/pipelines',
  authenticateToken,
  circuitBreakerMiddleware('crm'),
  createServiceRoutes('crm', '/api/pipelines')
);

// Notification service routes
router.use('/api/notifications',
  authenticateToken,
  circuitBreakerMiddleware('notification'),
  createServiceRoutes('notification', '/api/notifications')
);

// Audit service routes
router.use('/api/audit',
  authenticateToken,
  circuitBreakerMiddleware('audit'),
  createServiceRoutes('audit', '/api/audit')
);

// Catch-all route for undefined endpoints
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

export default router;