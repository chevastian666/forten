const router = require('express').Router();
const { body, query } = require('express-validator');
const eventController = require('../controllers/eventController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate
], eventController.getEvents);

router.get('/stats', eventController.getEventStats);

router.post('/', [
  body('buildingId').isUUID(),
  body('type').isIn([
    'door_open', 'door_close', 'visitor_call', 'resident_call',
    'access_granted', 'access_denied', 'camera_view', 'alarm',
    'maintenance', 'system'
  ]),
  body('description').notEmpty(),
  validate
], eventController.createEvent);

router.put('/:id/resolve', eventController.resolveEvent);

module.exports = router;