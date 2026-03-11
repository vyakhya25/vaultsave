const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Payment = require('../models/Payment');

// Initialize Razorpay lazily (after dotenv has loaded)
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error(
      'Razorpay keys are missing! Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your server/.env file. Get keys from https://dashboard.razorpay.com → Settings → API Keys'
    );
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// ─────────────────────────────────────────────
// @desc    Create Razorpay order (for depositing money)
// @route   POST /api/payment/create-order
// ─────────────────────────────────────────────
const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Please enter a valid amount' });
    }
    if (amount < 1) {
      return res.status(400).json({ message: 'Minimum deposit is ₹1' });
    }
    if (amount > 500000) {
      return res.status(400).json({ message: 'Maximum deposit is ₹5,00,000 per transaction' });
    }

    // Get Razorpay instance (will throw clear error if keys missing)
    const razorpay = getRazorpay();

    const options = {
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `rcpt_${req.user._id}_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        userEmail: req.user.email,
        purpose: 'VaultSave Wallet Deposit',
      },
    };

    const order = await razorpay.orders.create(options);

    // Save pending payment record
    await Payment.create({
      user: req.user._id,
      razorpayOrderId: order.id,
      amount,
      status: 'PENDING',
      type: 'DEPOSIT',
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      userName: req.user.name,
      userEmail: req.user.email,
    });
  } catch (error) {
    console.error('❌ Razorpay createOrder error:', error.message);
    res.status(500).json({ message: 'Failed to create payment order: ' + error.message });
  }
};

// ─────────────────────────────────────────────
// @desc    Verify Razorpay payment & credit wallet
// @route   POST /api/payment/verify
// ─────────────────────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification data' });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ message: 'Razorpay secret key not configured on server' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'FAILED' }
      );
      return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
    }

    // Find the pending payment
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }
    if (payment.status === 'SUCCESS') {
      return res.status(400).json({ message: 'Payment already processed' });
    }

    // Credit user wallet
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { walletBalance: payment.amount } },
      { new: true }
    );

    // Update payment record
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: 'SUCCESS',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      }
    );

    // Record transaction
    await Transaction.create({
      user: req.user._id,
      type: 'CREDIT',
      amount: payment.amount,
      description: `Deposited ₹${payment.amount} via UPI/GPay (Razorpay)`,
      paymentRef: razorpay_payment_id,
      balanceAfter: user.walletBalance,
    });

    res.json({
      success: true,
      walletBalance: user.walletBalance,
      message: `₹${payment.amount} successfully added to your wallet!`,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error('❌ Payment verify error:', error.message);
    res.status(500).json({ message: 'Payment verification failed: ' + error.message });
  }
};

// ─────────────────────────────────────────────
// @desc    Payout to bank (vault withdrawal → bank)
// @route   POST /api/payment/payout
// ─────────────────────────────────────────────
const createPayout = async (req, res) => {
  try {
    const { accountNumber, ifscCode, accountHolderName, amount, vaultId } = req.body;

    if (!accountNumber || !ifscCode || !accountHolderName || !amount) {
      return res.status(400).json({ message: 'Please provide all bank account details' });
    }

    const isTestMode = process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_');

    if (isTestMode) {
      // Simulate payout in test mode
      return res.json({
        success: true,
        payoutId: `pout_test_${Date.now()}`,
        status: 'processing',
        message: `TEST MODE: ₹${amount} payout initiated to ${accountHolderName}'s account ending ****${accountNumber.slice(-4)}. In live mode, funds arrive within 30 minutes via IMPS.`,
        isTestMode: true,
      });
    }

    // Live mode: actual Razorpay Payouts API
    const axios = require('axios');
    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');

    const payoutData = {
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      fund_account: {
        account_type: 'bank_account',
        bank_account: {
          name: accountHolderName,
          ifsc: ifscCode,
          account_number: accountNumber,
        },
        contact: {
          name: req.user.name,
          email: req.user.email,
          type: 'customer',
        },
      },
      amount: Math.round(amount * 100),
      currency: 'INR',
      mode: 'IMPS',
      purpose: 'payout',
      queue_if_low_balance: false,
      notes: {
        userId: req.user._id.toString(),
        vaultId: vaultId || '',
      },
    };

    const response = await axios.post('https://api.razorpay.com/v1/payouts', payoutData, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        'X-Payout-Idempotency': `vault_${vaultId}_${Date.now()}`,
      },
    });

    res.json({
      success: true,
      payoutId: response.data.id,
      status: response.data.status,
      message: `₹${amount} payout initiated! Funds arrive in your bank within 30 minutes via IMPS.`,
    });
  } catch (error) {
    console.error('❌ Payout error:', error?.response?.data || error.message);
    res.status(500).json({
      message: error?.response?.data?.error?.description || 'Payout failed: ' + error.message,
    });
  }
};

// ─────────────────────────────────────────────
// @desc    Razorpay webhook
// @route   POST /api/payment/webhook
// ─────────────────────────────────────────────
const handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (expectedSig !== signature) {
        return res.status(400).json({ message: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    console.log(`📩 Razorpay webhook: ${event}`);
    res.json({ received: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Razorpay key for frontend
// @route   GET /api/payment/key
const getKey = async (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID) {
    return res.status(500).json({ message: 'Razorpay key not configured' });
  }
  res.json({ keyId: process.env.RAZORPAY_KEY_ID });
};

module.exports = { createOrder, verifyPayment, createPayout, handleWebhook, getKey };
