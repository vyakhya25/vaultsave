import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllVaults, withdrawVault } from '../utils/api';
import { formatINR, formatDate, daysUntilUnlock, progressPercent } from '../utils/format';

export default function VaultList() {
  const { updateBalance } = useAuth();
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(null);
  const [messages, setMessages] = useState({});
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchVaults();
  }, []);

  const fetchVaults = async () => {
    try {
      const { data } = await getAllVaults();
      setVaults(data);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (vault) => {
    setWithdrawing(vault._id);
    setErrors((p) => ({ ...p, [vault._id]: '' }));
    setMessages((p) => ({ ...p, [vault._id]: '' }));
    try {
      const { data } = await withdrawVault(vault._id);
      updateBalance(data.walletBalance);
      setMessages((p) => ({ ...p, [vault._id]: data.message }));
      setVaults((prev) =>
        prev.map((v) => (v._id === vault._id ? { ...v, status: 'UNLOCKED' } : v))
      );
    } catch (err) {
      setErrors((p) => ({
        ...p,
        [vault._id]: err.response?.data?.message || 'Withdrawal failed',
      }));
    } finally {
      setWithdrawing(null);
    }
  };

  const filtered = filter === 'ALL' ? vaults : vaults.filter((v) => v.status === filter);
  const lockedCount = vaults.filter((v) => v.status === 'LOCKED').length;
  const unlockedCount = vaults.filter((v) => v.status === 'UNLOCKED').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-vault-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">My Vaults</h1>
          <p className="text-dark-400 mt-1 text-sm">
            {lockedCount} locked · {unlockedCount} withdrawn
          </p>
        </div>
        <Link to="/vault/create" className="btn-primary text-sm">
          + New Vault
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {['ALL', 'LOCKED', 'UNLOCKED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f
                ? 'bg-vault-500/10 text-vault-400 border border-vault-500/20'
                : 'text-dark-400 hover:text-dark-200 border border-transparent'
            }`}
          >
            {f === 'ALL' ? 'All' : f === 'LOCKED' ? '🔒 Locked' : '🔓 Withdrawn'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-3">🏦</p>
          <p className="text-dark-300 font-medium mb-1">No vaults found</p>
          <p className="text-dark-500 text-sm mb-6">
            {filter !== 'ALL' ? `No ${filter.toLowerCase()} vaults` : 'Create your first vault to start saving'}
          </p>
          <Link to="/vault/create" className="btn-primary">
            Create Vault
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((vault) => {
            const days = daysUntilUnlock(vault.unlockDate);
            const progress = progressPercent(vault.createdAt, vault.unlockDate);
            const isLocked = vault.status === 'LOCKED';
            const canWithdraw = isLocked && days <= 0;

            return (
              <div
                key={vault._id}
                className={`glass-card border p-6 ${
                  isLocked ? 'vault-locked' : 'vault-unlocked'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display font-semibold text-white text-lg">{vault.goalName}</h3>
                    <p className="text-dark-400 text-xs mt-0.5">
                      Created {formatDate(vault.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-mono px-2 py-1 rounded-lg border ${
                      isLocked
                        ? 'bg-gold-500/10 text-gold-400 border-gold-500/20'
                        : 'bg-vault-500/10 text-vault-400 border-vault-500/20'
                    }`}
                  >
                    {isLocked ? '🔒 LOCKED' : '🔓 DONE'}
                  </span>
                </div>

                {/* Amount */}
                <p className={`text-3xl font-display font-bold ${isLocked ? 'text-gold-400' : 'text-vault-400'}`}>
                  {formatINR(vault.amount)}
                </p>

                {/* Unlock date */}
                <p className="text-dark-400 text-sm mt-2">
                  {isLocked ? 'Unlocks on' : 'Unlocked on'}: <span className="text-dark-200">{formatDate(vault.unlockDate)}</span>
                </p>

                {/* Progress bar */}
                {isLocked && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-dark-500 mb-1.5">
                      <span>Progress</span>
                      <span>{days > 0 ? `${days} days left` : 'Ready to unlock!'}</span>
                    </div>
                    <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Messages */}
                {errors[vault._id] && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {errors[vault._id]}
                  </div>
                )}
                {messages[vault._id] && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-vault-500/10 border border-vault-500/20 text-vault-400 text-xs">
                    {messages[vault._id]}
                  </div>
                )}

                {/* Action */}
                {isLocked && (
                  <button
                    onClick={() => handleWithdraw(vault)}
                    disabled={!canWithdraw || withdrawing === vault._id}
                    className={`mt-4 w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                      canWithdraw
                        ? 'btn-primary'
                        : 'bg-dark-800 text-dark-500 border border-dark-700 cursor-not-allowed'
                    }`}
                  >
                    {withdrawing === vault._id ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
                        Withdrawing...
                      </span>
                    ) : canWithdraw ? (
                      '💰 Withdraw Now'
                    ) : (
                      `🔒 Locked until ${formatDate(vault.unlockDate)}`
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
