const router = require('express').Router();

router.use('/auth', require('./auth'));
router.use('/buildings', require('./buildings'));
router.use('/events', require('./events'));
router.use('/access', require('./access'));

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

module.exports = router;