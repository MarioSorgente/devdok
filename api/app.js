// app.js

const express = require('express');
const app = express();
const documentationRoutes = require('./routes/documentationRoutes');
const errorHandler = require('./utils/errorHandler');

app.use(express.json());

// Routes
app.use('/api', documentationRoutes);

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;

