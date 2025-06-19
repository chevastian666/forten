const router = require('express').Router();
const { body, query } = require('express-validator');
const accessController = require('../controllers/accessController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate
], accessController.getAccesses);

router.post('/', [
  body('buildingId').isUUID(),
  body('name').notEmpty().trim(),
  body('type').isIn(['visitor', 'temporary', 'service', 'emergency']),
  body('validUntil').isISO8601(),
  body('maxUses').optional().isInt({ min: 1 }),
  validate
], accessController.createAccess);

router.post('/validate', [
  body('pin').isLength({ min: 6, max: 6 }),
  body('buildingId').optional().isUUID(),
  validate
], accessController.validateAccess);

router.put('/:id', [
  authorize('admin', 'supervisor', 'operator'),
  validate
], accessController.updateAccess);

router.delete('/:id', 
  authorize('admin', 'supervisor'), 
  accessController.deleteAccess
);

module.exports = router;