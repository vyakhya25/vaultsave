import { useState, useEffect } from 'react';
import { getTransactions } from '../utils/api';
import { formatINR, formatDateTime } from '../utils/format';

const TYPE_CONFIG = {
  CREDIT: { icon: '⬇️', label: 'Deposit', color: 'text-vault-400', bg: 'bg-vault-500/10', sign: '+' },
  VAULT_LOCK: { icon: '🔒', label: 'Vault Lock', color: 'text-gold-400', bg: 'bg-gold-500/10', sign: '-' },
  VAULT_UNLOCK: { icon: '🔓', label: 'Vault Unlock', color: 'text-vault-400', bg: 'bg-vault-500/10', sign: '+' },
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    getTransactions()
      .then(({ data }) => setTransactions(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? transactions : transactions.filter((t) => t.type === filter);

  const totalDeposited = transactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
  const totalLocked = transactions.filter(t => t.type === 'VAULT_LOCK').reduce((s, t) => s + t.amount, 0);
  const totalUnlocked = transactions.filter(t => t.type === 'VAULT_UNLOCK').reduce((s, t) => s + t.amount, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-vault-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white">Transaction History</h1>
        <p className="text-dark-400 mt-1 text-sm">{transactions.length} total transactions</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass-card p-4">
          <p className="text-xs text-dark-500 mb-1">Total Deposited</p>
          <p className="text-vault-400 font-display font-bold">{formatINR(totalDeposited)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-dark-500 mb-1">Total Locked</p>
          <p className="text-gold-400 font-display font-bold">{formatINR(totalLocked)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-dark-500 mb-1">Total Unlocked</p>
          <p className="text-vault-400 font-display font-bold">{formatINR(totalUnlocked)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'ALL', label: 'All' },
          { key: 'CREDIT', label: '⬇️ Deposits' },
          { key: 'VAULT_LOCK', label: '🔒 Locks' },
          { key: 'VAULT_UNLOCK', label: '🔓 Unlocks' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-vault-500/10 text-vault-400 border border-vault-500/20'
                : 'text-dark-400 hover:text-dark-200 border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-dark-400">No transactions found</p>
        </div>
      ) : (
        <div className="glass-card divide-y divide-dark-700/50">
          {filtered.map((tx) => {
            const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.CREDIT;
            return (
              <div key={tx._id} className="flex items-center justify-between px-5 py-4 hover:bg-dark-800/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center text-lg flex-shrink-0`}>
                    {config.icon}
                  </div>
                  <div>
                    <p className="text-dark-200 text-sm font-medium">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs ${config.color} font-medium`}>{config.label}</span>
                      <span className="text-dark-600 text-xs">·</span>
                      <span className="text-dark-500 text-xs">{formatDateTime(tx.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className={`font-mono font-bold text-sm ${config.color}`}>
                    {config.sign}{formatINR(tx.amount)}
                  </p>
                  <p className="text-dark-500 text-xs mt-0.5">
                    Bal: {formatINR(tx.balanceAfter)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
