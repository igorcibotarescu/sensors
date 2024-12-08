const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');
const SensorData = require('./models/SensorData');

dotenv.config();

// Start the server
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));


// Configure WebSocket
global.io = socketIo(server, {
    cors: {
        origin: process.env.FRONT_URI,
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    
    console.log('New client connected');

    // Send the latest sensor data when the client connects
    SensorData.find().sort({ timestamp: -1 }).limit(10)
        .then(data => {
            socket.emit('initial-data', data);
        })
        .catch(err => {
            console.error('Error fetching initial data:', err.message || err);
            socket.emit('error', { message: 'Failed to fetch initial data' });
        });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
        console.log(`Client disconnected. Reason: ${reason}`);
    });

    // Handle errors during communication
    socket.on('error', (err) => {
        console.error('Socket error occurred:', err.message || err);
    });

    // Custom event to handle client-side errors (optional)
    socket.on('client-error', (err) => {
        console.warn('Error reported by client:', err);
    });
    
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
