const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
    sensor_id: {
        type: String,
        required: true
    },
    params: [
        {
            type: new mongoose.Schema({
                name: { type: String, required: true },
                value: { type: Number, required: true },
                units: { type: String, required: true }
            }),
            required: true
        }
    ],
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SensorData', sensorDataSchema);
