const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const businessRoutes = require('./routes/business');
const gstRoutes = require('./routes/gst');
const reportsRoutes = require('./routes/reports');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: ['http://127.0.0.1:5501', 'http://localhost:5501', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());
app.use(express.static('public'));

// Database connection
mongoose.set('debug', true);
mongoose.connect("mongodb://127.0.0.1:27017/newdb")
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/gst', gstRoutes);
app.use('/api/reports', reportsRoutes);

// Add this after your other routes
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running' });
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something broke!', error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 