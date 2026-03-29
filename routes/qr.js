const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

// GET /api/qr
router.get('/', async (req, res, next) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL parameter is required'
      });
    }
    
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    res.json({
      success: true,
      data: {
        qr_code: qrDataUrl,
        url: url
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/qr/image
router.get('/image', async (req, res, next) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).send('URL parameter is required');
    }
    
    const qrBuffer = await QRCode.toBuffer(url, {
      width: 300,
      margin: 2
    });
    
    res.setHeader('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (error) {
    next(error);
  }
});

module.exports = router;