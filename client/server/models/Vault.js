const mongoose = require('mongoose');

const vaultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    goalName: {
      type: String,
      required: [true, 'Goal name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least ₹1'],
    },
    unlockDate: {
      type: Date,
      required: [true, 'Unlock date is required'],
    },
    status: {
      type: String,
      enum: ['LOCKED', 'UNLOCKED'],
      default: 'LOCKED',
    },
    withdrawnAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Virtual: check if vault is currently unlockable
vaultSchema.virtual('isUnlockable').get(function () {
  return new Date() >= new Date(this.unlockDate);
});

module.exports = mongoose.model('Vault', vaultSchema);
