const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/menu - Get all menu items
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM menu_items WHERE available = TRUE ORDER BY id'
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/menu - Add new menu item
router.post('/', async (req, res, next) => {
  try {
    const { name, price, emoji } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        error: 'Name and price are required'
      });
    }
    
    const result = await db.query(
      'INSERT INTO menu_items (name, price, emoji) VALUES ($1, $2, $3) RETURNING *',
      [name, price, emoji || '🍜']
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/menu/:id/availability
router.patch('/:id/availability', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { available } = req.body;
    
    const result = await db.query(
      'UPDATE menu_items SET available = $1 WHERE id = $2 RETURNING *',
      [available, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;