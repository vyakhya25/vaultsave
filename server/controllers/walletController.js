const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
const getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('walletBalance name');
    res.json({ walletBalance: user.walletBalance, name: user.name });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Deposit money to wallet
// @route   POST /api/wallet/deposit
const deposit = async (req, res) => {
  try {
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Please enter a valid amount' });
    }

    if (amount > 1000000) {
      return res.status(400).json({ message: 'Maximum deposit limit is ₹10,00,000' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { walletBalance: amount } },
      { new: true }
    );

    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'CREDIT',
      amount,
      description: description || `Deposit of ₹${amount}`,
      balanceAfter: user.walletBalance,
    });

    res.json({
      walletBalance: user.walletBalance,
      transaction,
      message: `₹${amount} added to wallet successfully!`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getBalance, deposit };
