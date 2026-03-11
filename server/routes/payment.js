const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  createPayout,
  handleWebhook,
  getKey,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Public webhook (no auth — Razorpay calls this)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.get('/key', protect, getKey);
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.post('/payout', protect, createPayout);

module.exports = router;
