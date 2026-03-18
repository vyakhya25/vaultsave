import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createVault } from '../utils/api';
import { formatINR } from '../utils/format';

const GOAL_PRESETS = [
  { label: 'New Phone', icon: '📱' },
  { label: 'Emergency Fund', icon: '🚨' },
  { label: 'Vacation', icon: '✈️' },
  { label: 'New Laptop', icon: '💻' },
  { label: 'Bike/Car', icon: '🚗' },
  { label: 'Education', icon: '🎓' },
];

const DURATION_PRESETS = [
  { label: '1 Month', days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year', days: 365 },
];

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function tomorrow() {
  return addDays(1);
}

export default function CreateVault() {
  const { user, updateBalance } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    goalName: '',
    amount: '',
    unlockDate: addDays(30),
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setError('');
    const amt = parseFloat(form.amount);
    if (!form.goalName.trim()) return setError('Please enter a goal name');
    if (!amt || amt <= 0) return setError('Please enter a valid amount');
    if (!form.unlockDate) return setError('Please select an unlock date');
    if (new Date(form.unlockDate) <= new Date()) return setError('Unlock date must be in the future');
    if (amt > user.walletBalance) {
      return setError(`Insufficient balance. You have ${formatINR(user.walletBalance)} available.`);
    }
    if (!confirmed) return setConfirmed(true);

    setLoading(true);
    try {
      const { data } = await createVault({
        goalName: form.goalName,
        amount: amt,
        unlockDate: form.unlockDate,
      });
      updateBalance(data.walletBalance);
      navigate('/vaults');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create vault');
      setConfirmed(false);
    } finally {
      setLoading(false);
    }
  };

  const amt = parseFloat(form.amount) || 0;
  const remaining = (user?.walletBalance || 0) - amt;

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-white">Create Vault</h1>
        <p className="text-dark-400 mt-1">Lock money towards a savings goal</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        {/* Goal name */}
        <div>
          <label className="label">Goal name</label>
          <input
            type="text"
            name="goalName"
            value={form.goalName}
            onChange={handleChange}
            placeholder="e.g. New Phone, Emergency Fund"
            className="input-field"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {GOAL_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setForm({ ...form, goalName: p.label })}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  form.goalName === p.label
                    ? 'bg-vault-500/10 text-vault-400 border-vault-500/20'
                    : 'bg-dark-800 text-dark-400 border-dark-700 hover:border-dark-500'
                }`}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="label mb-0">Amount to lock</label>
            <span className="text-xs text-dark-500">
              Available: <span className="text-dark-300">{formatINR(user?.walletBalance || 0)}</span>
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-300 font-semibold text-lg">₹</span>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="0"
              className="input-field pl-9 text-xl font-display font-bold"
            />
          </div>
          {amt > 0 && (
            <p className={`text-xs mt-1.5 ${remaining < 0 ? 'text-red-400' : 'text-dark-400'}`}>
              After locking: {formatINR(Math.max(0, remaining))} remaining in wallet
            </p>
          )}
        </div>

        {/* Unlock date */}
        <div>
          <label className="label">Unlock date</label>
          <input
            type="date"
            name="unlockDate"
            value={form.unlockDate}
            min={tomorrow()}
            onChange={handleChange}
            className="input-field"
          />
          <div className="flex gap-2 mt-2 flex-wrap">
            {DURATION_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setForm({ ...form, unlockDate: addDays(p.days) })}
                className="text-xs px-3 py-1.5 rounded-lg bg-dark-800 text-dark-400 border border-dark-700 hover:border-dark-500 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Confirmation preview */}
        {confirmed && !error && (
          <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
            <p className="text-gold-400 text-sm font-semibold mb-2">⚠️ Confirm vault creation</p>
            <p className="text-dark-300 text-sm">
              You're about to lock <strong className="text-white">{formatINR(amt)}</strong> until{' '}
              <strong className="text-white">
                {new Date(form.unlockDate).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </strong>
              . This cannot be undone until the unlock date.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          {confirmed && (
            <button
              onClick={() => setConfirmed(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading || !form.goalName || !form.amount || remaining < 0}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
                Locking...
              </>
            ) : confirmed ? (
              '🔐 Confirm & Lock'
            ) : (
              '🔒 Lock Money'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
