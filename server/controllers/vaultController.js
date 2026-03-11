const User = require('../models/User');
const Vault = require('../models/Vault');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// @desc    Create a new vault
// @route   POST /api/vault/create
const createVault = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, goalName, unlockDate } = req.body;

    if (!amount || !goalName || !unlockDate) {
      return res.status(400).json({ message: 'Please provide amount, goal name, and unlock date' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const unlock = new Date(unlockDate);
    if (unlock <= new Date()) {
      return res.status(400).json({ message: 'Unlock date must be in the future' });
    }

    // Fetch latest user balance inside session
    const user = await User.findById(req.user._id).session(session);

    if (user.walletBalance < amount) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Insufficient balance. Wallet has ₹${user.walletBalance}, but you're trying to lock ₹${amount}`,
      });
    }

    // Deduct from wallet
    user.walletBalance -= amount;
    await user.save({ session });

    // Create vault
    const [vault] = await Vault.create(
      [
        {
          user: req.user._id,
          goalName,
          amount,
          unlockDate: unlock,
          status: 'LOCKED',
        },
      ],
      { session }
    );

    // Record transaction
    await Transaction.create(
      [
        {
          user: req.user._id,
          type: 'VAULT_LOCK',
          amount,
          description: `Locked ₹${amount} in vault: "${goalName}"`,
          vaultRef: vault._id,
          balanceAfter: user.walletBalance,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      vault,
      walletBalance: user.walletBalance,
      message: `₹${amount} locked successfully in "${goalName}"!`,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Get all vaults for user
// @route   GET /api/vault/all
const getAllVaults = async (req, res) => {
  try {
    const vaults = await Vault.find({ user: req.user._id }).sort({ createdAt: -1 });

    // Auto-update status for unlocked vaults (still LOCKED status but date passed)
    const now = new Date();
    const updatedVaults = await Promise.all(
      vaults.map(async (vault) => {
        if (vault.status === 'LOCKED' && now >= vault.unlockDate) {
          vault.status = 'UNLOCKED';
          await vault.save();
        }
        return vault;
      })
    );

    res.json(updatedVaults);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Withdraw from vault
// @route   POST /api/vault/withdraw/:id
const withdrawVault = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vault = await Vault.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).session(session);

    if (!vault) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Vault not found' });
    }

    if (vault.status === 'UNLOCKED') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'This vault has already been withdrawn' });
    }

    const now = new Date();
    if (now < vault.unlockDate) {
      await session.abortTransaction();
      const unlockDateStr = vault.unlockDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return res.status(403).json({
        message: `🔒 Vault locked until ${unlockDateStr}. You cannot withdraw early.`,
        unlockDate: vault.unlockDate,
      });
    }

    // Add money back to wallet
    const user = await User.findById(req.user._id).session(session);
    user.walletBalance += vault.amount;
    await user.save({ session });

    // Update vault status
    vault.status = 'UNLOCKED';
    vault.withdrawnAt = now;
    await vault.save({ session });

    // Record transaction
    await Transaction.create(
      [
        {
          user: req.user._id,
          type: 'VAULT_UNLOCK',
          amount: vault.amount,
          description: `Withdrew ₹${vault.amount} from vault: "${vault.goalName}"`,
          vaultRef: vault._id,
          balanceAfter: user.walletBalance,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.json({
      vault,
      walletBalance: user.walletBalance,
      message: `₹${vault.amount} successfully withdrawn from "${vault.goalName}"!`,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = { createVault, getAllVaults, withdrawVault };
