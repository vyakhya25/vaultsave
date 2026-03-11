import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBalance, getAllVaults, getTransactions } from '../utils/api';
import { formatINR, formatDate, daysUntilUnlock } from '../utils/format';

export default function Dashboard() {
  const { user, updateBalance } = useAuth();
  const [balance, setBalance] = useState(user?.walletBalance || 0);
  const [vaults, setVaults] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [balRes, vaultRes, txRes] = await Promise.all([
          getBalance(),
          getAllVaults(),
          getTransactions(),
        ]);
        setBalance(balRes.data.walletBalance);
        updateBalance(balRes.data.walletBalance);
        setVaults(vaultRes.data);
        setTransactions(txRes.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const lockedVaults = vaults.filter((v) => v.status === 'LOCKED');
  const totalLocked = lockedVaults.reduce((sum, v) => sum + v.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-vault-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          Good day, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-dark-400 mt-1">Here's your savings overview</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Wallet balance */}
        <div className="glass-card p-6 col-span-1 sm:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm font-medium">Wallet Balance</span>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-display font-bold text-white">{formatINR(balance)}</p>
          <p className="text-dark-500 text-xs mt-1">Available to spend or lock</p>
          <Link
            to="/add-money"
            className="mt-4 inline-flex items-center gap-1 text-vault-400 text-sm hover:text-vault-300 transition-colors"
          >
            + Add Money →
          </Link>
        </div>

        {/* Total locked */}
        <div className="glass-card p-6 border-gold-500/20" style={{ borderColor: 'rgba(251,191,36,0.15)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm font-medium">Total Locked</span>
            <span className="text-2xl">🔒</span>
          </div>
          <p className="text-3xl font-display font-bold text-gold-400">{formatINR(totalLocked)}</p>
          <p className="text-dark-500 text-xs mt-1">Across {lockedVaults.length} active vault{lockedVaults.length !== 1 ? 's' : ''}</p>
          <Link
            to="/vaults"
            className="mt-4 inline-flex items-center gap-1 text-gold-400 text-sm hover:text-gold-400/80 transition-colors"
          >
            View vaults →
          </Link>
        </div>

        {/* Total savings */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm font-medium">Total Savings</span>
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-3xl font-display font-bold text-vault-400">{formatINR(balance + totalLocked)}</p>
          <p className="text-dark-500 text-xs mt-1">Wallet + locked vaults</p>
          <Link
            to="/vault/create"
            className="mt-4 inline-flex items-center gap-1 text-vault-400 text-sm hover:text-vault-300 transition-colors"
          >
            + New vault →
          </Link>
        </div>
      </div>

      {/* Active Vaults */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-white">Active Vaults</h2>
          <Link to="/vaults" className="text-sm text-dark-400 hover:text-vault-400 transition-colors">
            View all
          </Link>
        </div>

        {lockedVaults.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-4xl mb-3">🔓</p>
            <p className="text-dark-300 font-medium mb-1">No active vaults</p>
            <p className="text-dark-500 text-sm mb-5">Lock your money to start saving towards a goal</p>
            <Link to="/vault/create" className="btn-primary inline-block">
              Create Your First Vault
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {lockedVaults.slice(0, 4).map((vault) => {
              const days = daysUntilUnlock(vault.unlockDate);
              return (
                <div key={vault._id} className="glass-card vault-locked p-5 border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-white">{vault.goalName}</p>
                      <p className="text-dark-400 text-xs mt-0.5">
                        Unlocks {formatDate(vault.unlockDate)}
                      </p>
                    </div>
                    <span className="text-xs font-mono bg-gold-500/10 text-gold-400 border border-gold-500/20 px-2 py-1 rounded-lg">
                      🔒 LOCKED
                    </span>
                  </div>
                  <p className="text-2xl font-display font-bold text-gold-400">
                    {formatINR(vault.amount)}
                  </p>
                  {days > 0 && (
                    <p className="text-dark-500 text-xs mt-2">
                      {days} day{days !== 1 ? 's' : ''} remaining
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-white">Recent Transactions</h2>
          <Link to="/transactions" className="text-sm text-dark-400 hover:text-vault-400 transition-colors">
            View all
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <p className="text-dark-400 text-sm">No transactions yet. Deposit some money to get started!</p>
          </div>
        ) : (
          <div className="glass-card divide-y divide-dark-700/50">
            {transactions.map((tx) => (
              <div key={tx._id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {tx.type === 'CREDIT' ? '⬇️' : tx.type === 'VAULT_LOCK' ? '🔒' : '🔓'}
                  </span>
                  <div>
                    <p className="text-dark-200 text-sm font-medium">{tx.description}</p>
                    <p className="text-dark-500 text-xs">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
                <p
                  className={`font-mono font-semibold text-sm ${
                    tx.type === 'CREDIT' || tx.type === 'VAULT_UNLOCK'
                      ? 'text-vault-400'
                      : 'text-red-400'
                  }`}
                >
                  {tx.type === 'VAULT_LOCK' ? '-' : '+'}
                  {formatINR(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
