const Razorpay = require("razorpay");
const crypto = require("crypto");
const axios = require("axios");

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Payment = require("../models/Payment");

// Initialize Razorpay
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error(
      "Razorpay keys missing! Add them to server/.env"
    );
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// ─────────────────────────────────────────────
// Create Razorpay Order
// ─────────────────────────────────────────────
const createOrder = async (req, res) => {
  try {
    console.log("Create order request:", req.body);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { amount } = req.body;

    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid amount",
      });
    }

    if (parsedAmount < 1) {
      return res.status(400).json({
        success: false,
        message: "Minimum deposit is ₹1",
      });
    }

    if (parsedAmount > 500000) {
      return res.status(400).json({
        success: false,
        message: "Maximum deposit is ₹5,00,000",
      });
    }

    const razorpay = getRazorpay();

  const options = {
  amount: Math.round(parsedAmount * 100),
  currency: "INR",
  receipt: `r_${req.user._id.toString().slice(-6)}_${Date.now()}`,
  notes: {
    userId: req.user._id.toString(),
    userEmail: req.user.email,
    purpose: "VaultSave Wallet Deposit",
  },
};

    const order = await razorpay.orders.create(options);

    await Payment.create({
      user: req.user._id,
      razorpayOrderId: order.id,
      amount: parsedAmount,
      status: "PENDING",
      type: "DEPOSIT",
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      userName: req.user.name,
      userEmail: req.user.email,
    });
  } catch (error) {
    console.error("❌ Razorpay createOrder error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment order",
    });
  }
};

// ─────────────────────────────────────────────
// Verify Payment
// ─────────────────────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification data",
      });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: "FAILED" }
      );

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    if (payment.status === "SUCCESS") {
      return res.status(400).json({
        success: false,
        message: "Payment already processed",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { walletBalance: payment.amount } },
      { new: true }
    );

    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: "SUCCESS",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      }
    );

    await Transaction.create({
      user: req.user._id,
      type: "CREDIT",
      amount: payment.amount,
      description: `Deposited ₹${payment.amount} via Razorpay`,
      paymentRef: razorpay_payment_id,
      balanceAfter: user.walletBalance,
    });

    res.json({
      success: true,
      walletBalance: user.walletBalance,
      message: `₹${payment.amount} added to wallet`,
    });
  } catch (error) {
    console.error("❌ Payment verify error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Payment verification failed",
    });
  }
};

// ─────────────────────────────────────────────
// Payout
// ─────────────────────────────────────────────
const createPayout = async (req, res) => {
  try {
    const { accountNumber, ifscCode, accountHolderName, amount } = req.body;

    if (!accountNumber || !ifscCode || !accountHolderName || !amount) {
      return res.status(400).json({
        success: false,
        message: "Provide all bank details",
      });
    }

    const isTestMode =
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_ID.startsWith("rzp_test_");

    if (isTestMode) {
      return res.json({
        success: true,
        payoutId: `test_${Date.now()}`,
        status: "processing",
        message: `TEST MODE payout ₹${amount}`,
      });
    }

    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const payoutData = {
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      amount: Math.round(amount * 100),
      currency: "INR",
      mode: "IMPS",
      purpose: "payout",
      fund_account: {
        account_type: "bank_account",
        bank_account: {
          name: accountHolderName,
          ifsc: ifscCode,
          account_number: accountNumber,
        },
      },
    };

    const response = await axios.post(
      "https://api.razorpay.com/v1/payouts",
      payoutData,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      success: true,
      payoutId: response.data.id,
      status: response.data.status,
    });
  } catch (error) {
    console.error("❌ Payout error:", error.response?.data || error);

    res.status(500).json({
      success: false,
      message:
        error.response?.data?.error?.description ||
        error.message ||
        "Payout failed",
    });
  }
};

// ─────────────────────────────────────────────
// Webhook
// ─────────────────────────────────────────────
const handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (expectedSig !== signature) {
        return res.status(400).json({ message: "Invalid webhook signature" });
      }
    }

    console.log("Webhook event:", req.body.event);

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);

    res.status(500).json({
      message: error.message || "Webhook error",
    });
  }
};

// ─────────────────────────────────────────────
// Get Razorpay key
// ─────────────────────────────────────────────
const getKey = async (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID) {
    return res.status(500).json({
      message: "Razorpay key not configured",
    });
  }

  res.json({
    keyId: process.env.RAZORPAY_KEY_ID,
  });
};

module.exports = {
  createOrder,
  verifyPayment,
  createPayout,
  handleWebhook,
  getKey,
};