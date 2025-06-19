const router = require('express').Router();
const { body, query } = require('express-validator');
const accessController = require('../presentation/controllers/access.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate
], accessController.getAccesses);

router.get('/report', [
  authorize('admin', 'supervisor'),
  query('buildingId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validate
], accessController.generateReport);

router.get('/:id', accessController.getAccessById);

router.post('/', [
  body('buildingId').isUUID(),
  body('name').notEmpty().trim(),
  body('phone').optional().isMobilePhone(),
  body('type').isIn(['visitor', 'temporary', 'service', 'emergency']),
  body('validUntil').isISO8601(),
  body('maxUses').optional().isInt({ min: 1 }),
  body('notes').optional().trim(),
  validate
], accessController.createAccess);

router.post('/validate', [
  body('pin').isLength({ min: 6, max: 6 }),
  body('buildingId').optional().isUUID(),
  validate
], accessController.validateAccess);

router.put('/:id', [
  authorize('admin', 'supervisor', 'operator'),
  body('name').optional().notEmpty().trim(),
  body('phone').optional().isMobilePhone(),
  body('validUntil').optional().isISO8601(),
  body('maxUses').optional().isInt({ min: 1 }),
  body('isActive').optional().isBoolean(),
  body('notes').optional().trim(),
  validate
], accessController.updateAccess);

router.delete('/:id', 
  authorize('admin', 'supervisor'), 
  accessController.deleteAccess
);

module.exports = router;