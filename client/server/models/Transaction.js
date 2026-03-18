const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['CREDIT', 'VAULT_LOCK', 'VAULT_UNLOCK', 'PAYOUT'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    vaultRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vault',
      default: null,
    },
    paymentRef: {
      type: String,
      default: null,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
