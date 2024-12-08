const express = require('express');
const SensorData = require('../models/SensorData');
const sensorDataValidationSchema = require('../validation/SensorDataValidation');
const router = express.Router();

// Middleware for validation
const validateSensorData = (req, res, next) => {
    const { error } = sensorDataValidationSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({
            error: 'Validation Error',
            details: error.details.map(err => err.message)
        });
    }
    next();
};

// Endpoint: Add sensor data
router.post('/add-sensor-data', validateSensorData, async (req, res) => {
    try {
        const { sensor_id, params } = req.body;

        const newSensorData = new SensorData({ sensor_id, params });
        const result = await newSensorData.save();

        req.io.emit('new-data', newSensorData); // Notify clients
        res.status(201).json({ message: 'Data added successfully', id: result._id });

    } catch (err) {
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Endpoint: Get latest sensor data
router.get('/get-sensor-readings', async (req, res) => {
    try {
        const data = await SensorData.find({}, '-_id -__v').sort({ timestamp: -1 }).limit(1000);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Endpoint: Delete all sensor data
router.post('/delete-sensor-readings', async (req, res) => {
    try {
        await SensorData.deleteMany({});
        req.io.emit('delete-data'); // Notify clients
        res.status(200).json({ message: 'All sensor data deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});


router.get('/get-all-sensors', async (req, res) => {
    try {
        const sensors = await SensorData.distinct('sensor_id');
        res.status(200).json(sensors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching sensor data' });
    }
});

// Route to fetch sensor data based on filters
router.get('/filter/sensor-readings', async (req, res) => {
    const { sensorId, startDate, endDate, page = 1, limit = 20 } = req.query;

    if (!sensorId) {
      return res.status(400).json({ error: 'Sensor ID is required' });
    }
  
    try {
      // Build Query
      const query = { sensor_id: sensorId };
      if (startDate) {
        query.timestamp = { $gte: new Date(startDate) };
      }
      if (endDate) {
        query.timestamp = { ...query.timestamp, $lte: new Date(endDate) };
      }
  
      // Pagination
      const total = await SensorData.countDocuments(query);
      const data = await SensorData.find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));
  
      res.json({
        total,
        data,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch sensor data. Please try again later.' });
    }
  });


module.exports = router;
