const router = require('express').Router();
const { body, query, param } = require('express-validator');
const EventsController = require('../presentation/controllers/events.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const eventsController = new EventsController();

router.use(authenticate);

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('buildingId').optional().isUUID(),
  query('type').optional().isIn([
    'door_open', 'door_close', 'visitor_call', 'resident_call',
    'access_granted', 'access_denied', 'camera_view', 'alarm',
    'maintenance', 'system'
  ]),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('resolved').optional().isBoolean(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validate
], eventsController.getEvents.bind(eventsController));

router.get('/stats', eventsController.getEventStats.bind(eventsController));

router.get('/:id', [
  param('id').isUUID(),
  validate
], eventsController.getEventById.bind(eventsController));

router.post('/', [
  body('buildingId').isUUID(),
  body('type').isIn([
    'door_open', 'door_close', 'visitor_call', 'resident_call',
    'access_granted', 'access_denied', 'camera_view', 'alarm',
    'maintenance', 'system'
  ]),
  body('description').notEmpty(),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('metadata').optional().isObject(),
  validate
], eventsController.createEvent.bind(eventsController));

router.put('/:id', [
  param('id').isUUID(),
  body('type').optional().isIn([
    'door_open', 'door_close', 'visitor_call', 'resident_call',
    'access_granted', 'access_denied', 'camera_view', 'alarm',
    'maintenance', 'system'
  ]),
  body('description').optional().notEmpty(),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('metadata').optional().isObject(),
  body('resolved').optional().isBoolean(),
  validate
], eventsController.updateEvent.bind(eventsController));

router.put('/:id/resolve', [
  param('id').isUUID(),
  validate
], eventsController.resolveEvent.bind(eventsController));

module.exports = router;