const router = require('express').Router();
const { body, query } = require('express-validator');
const buildingController = require('../controllers/buildingController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate
], buildingController.getBuildings);

router.get('/:id', buildingController.getBuilding);

router.post('/', [
  authorize('admin', 'supervisor'),
  body('name').notEmpty().trim(),
  body('address').notEmpty().trim(),
  body('city').notEmpty().trim(),
  body('email').optional().isEmail(),
  validate
], buildingController.createBuilding);

router.put('/:id', [
  authorize('admin', 'supervisor'),
  body('name').optional().trim(),
  body('email').optional().isEmail(),
  validate
], buildingController.updateBuilding);

router.delete('/:id', 
  authorize('admin'), 
  buildingController.deleteBuilding
);

module.exports = router;