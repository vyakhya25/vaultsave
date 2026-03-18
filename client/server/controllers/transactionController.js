const Transaction = require('../models/Transaction');

// @desc    Get all transactions for user
// @route   GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id })
      .populate('vaultRef', 'goalName unlockDate')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTransactions };
