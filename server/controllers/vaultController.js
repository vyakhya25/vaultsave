const User = require('../models/User');
const Vault = require('../models/Vault');
const Transaction = require('../models/Transaction');

const createVault = async (req, res) => {
  try {
    const { amount, goalName, unlockDate } = req.body;

    if (!amount || !goalName || !unlockDate)
      return res.status(400).json({ message: 'Please provide amount, goal name, and unlock date' });
    if (amount <= 0)
      return res.status(400).json({ message: 'Amount must be greater than 0' });

    const unlock = new Date(unlockDate);
    if (unlock <= new Date())
      return res.status(400).json({ message: 'Unlock date must be in the future' });

    // Atomic deduction — only succeeds if balance is enough
    const user = await User.findOneAndUpdate(
      { _id: req.user._id, walletBalance: { $gte: amount } },
      { $inc: { walletBalance: -amount } },
      { new: true }
    );

    if (!user) {
      const current = await User.findById(req.user._id);
      return res.status(400).json({
        message: `Insufficient balance. Wallet has ₹${current.walletBalance}, trying to lock ₹${amount}`,
      });
    }

    const vault = await Vault.create({
      user: req.user._id,
      goalName,
      amount,
      unlockDate: unlock,
      status: 'LOCKED',
    });

    await Transaction.create({
      user: req.user._id,
      type: 'VAULT_LOCK',
      amount,
      description: `Locked ₹${amount} in vault: "${goalName}"`,
      vaultRef: vault._id,
      balanceAfter: user.walletBalance,
    });

    res.status(201).json({
      vault,
      walletBalance: user.walletBalance,
      message: `₹${amount} locked successfully in "${goalName}"!`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllVaults = async (req, res) => {
  try {
    const vaults = await Vault.find({ user: req.user._id }).sort({ createdAt: -1 });
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

const withdrawVault = async (req, res) => {
  try {
    const vault = await Vault.findOne({ _id: req.params.id, user: req.user._id });

    if (!vault) return res.status(404).json({ message: 'Vault not found' });
    if (vault.status === 'UNLOCKED')
      return res.status(400).json({ message: 'This vault has already been withdrawn' });

    const now = new Date();
    if (now < vault.unlockDate) {
      const unlockDateStr = vault.unlockDate.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      return res.status(403).json({
        message: `🔒 Vault locked until ${unlockDateStr}. You cannot withdraw early.`,
        unlockDate: vault.unlockDate,
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { walletBalance: vault.amount } },
      { new: true }
    );

    vault.status = 'UNLOCKED';
    vault.withdrawnAt = now;
    await vault.save();

    await Transaction.create({
      user: req.user._id,
      type: 'VAULT_UNLOCK',
      amount: vault.amount,
      description: `Withdrew ₹${vault.amount} from vault: "${vault.goalName}"`,
      vaultRef: vault._id,
      balanceAfter: user.walletBalance,
    });

    res.json({
      vault,
      walletBalance: user.walletBalance,
      message: `₹${vault.amount} successfully withdrawn from "${vault.goalName}"!`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createVault, getAllVaults, withdrawVault };