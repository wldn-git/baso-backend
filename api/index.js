const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const menuRoutes = require('../routes/menu');
const ordersRoutes = require('../routes/orders');
const qrRoutes = require('../routes/qr');

// Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/qr', qrRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Warung Baso API - Running on Vercel',
    endpoints: {
      health: '/health',
      menu: '/api/menu',
      orders: '/api/orders',
      qr: '/api/qr'
    }
  });
});

// Export for Vercel serverless
module.exports = app;