const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/orders
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    
    let query = 'SELECT * FROM orders ORDER BY created_at DESC';
    let params = [];
    
    if (status) {
      query = 'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC';
      params = [status];
    }
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/queue
router.get('/queue', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT COALESCE(MAX(queue_number), 0) + 1 as next_queue FROM orders'
    );
    
    res.json({
      success: true,
      data: {
        next_queue: result.rows[0].next_queue
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/orders
router.post('/', async (req, res, next) => {
  try {
    const { items, customer_name } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items are required'
      });
    }
    
    // Get menu items
    const menuIds = items.map(item => item.menu_item_id);
    const menuResult = await db.query(
      'SELECT * FROM menu_items WHERE id = ANY($1)',
      [menuIds]
    );
    
    const menuMap = {};
    menuResult.rows.forEach(item => {
      menuMap[item.id] = item;
    });
    
    // Calculate total
    let total = 0;
    const orderItems = items.map(item => {
      const menuItem = menuMap[item.menu_item_id];
      if (!menuItem) {
        throw new Error(`Menu item ${item.menu_item_id} not found`);
      }
      
      const subtotal = menuItem.price * item.quantity;
      total += subtotal;
      
      return {
        menu_item_id: item.menu_item_id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,
        subtotal
      };
    });
    
    // Get next queue number
    const queueResult = await db.query(
      'SELECT COALESCE(MAX(queue_number), 0) + 1 as next_queue FROM orders'
    );
    const queueNumber = queueResult.rows[0].next_queue;
    
    // Insert order
    const result = await db.query(
      `INSERT INTO orders (queue_number, customer_name, items, total, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [queueNumber, customer_name, JSON.stringify(orderItems), total, 'waiting']
    );
    
    const order = result.rows[0];
    
    // Emit WebSocket
    const io = req.app.get('io');
    io.to('vendor').emit('order_created', {
      queue_number: order.queue_number,
      total: order.total
    });
    
    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['waiting', 'cooking', 'done'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }
    
    const result = await db.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    const order = result.rows[0];
    
    // Emit WebSocket
    const io = req.app.get('io');
    io.to('vendor').emit('order_updated', {
      id: order.id,
      queue_number: order.queue_number,
      status: order.status
    });
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;