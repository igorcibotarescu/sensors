const express = require('express');
const sensorRoutes = require('./SensorRoutes');

const router = express.Router();

// Mount sensor routes
router.use('/sensors', sensorRoutes);

module.exports = router;
