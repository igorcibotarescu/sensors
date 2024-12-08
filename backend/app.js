const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./routes');

const app = express();

// Middleware
app.use(bodyParser.json());

// Allow requests from your frontend
const corsOptions = {
    origin: process.env.FRONT_URI || 'http://localhost:3000', // Frontend URL
    methods: ['GET', 'POST'], // Allowed methods
    credentials: true,       // Allow cookies and headers
};

app.use(cors(corsOptions));

// WebSocket middleware
app.use((req, res, next) => {
    req.io = global.io; // Make `io` accessible in routes
    next();
});

// Mount routes
app.use('/api', routes);

module.exports = app;
