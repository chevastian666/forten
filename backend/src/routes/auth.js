const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate
], authController.login);

router.post('/refresh', [
  body('refreshToken').notEmpty(),
  validate
], authController.refreshToken);

router.post('/logout', authenticate, authController.logout);

router.get('/profile', authenticate, authController.profile);

module.exports = router;