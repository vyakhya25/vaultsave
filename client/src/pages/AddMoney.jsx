import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createRazorpayOrder, verifyRazorpayPayment } from '../utils/api';
import { formatINR } from '../utils/format';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];

export default function AddMoney() {
  const { user, updateBalance } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setError('');
    setSuccess('');
    const amt = parseFloat(amount);
    if (!amt || amt < 1) return setError('Please enter a valid amount (minimum Rs.1)');
    if (amt > 500000) return setError('Maximum deposit is Rs.5,00,000 per transaction');

    setLoading(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        setError('Failed to load Razorpay. Please check your internet connection.');
        setLoading(false);
        return;
      }

      const { data: order } = await createRazorpayOrder({ amount: amt });

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'VaultSave',
        description: 'Add money to wallet',
        order_id: order.orderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: { color: '#22c55e' },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment cancelled.');
          },
        },
        handler: async (response) => {
          try {
            const { data } = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            updateBalance(data.walletBalance);
            setSuccess('Rs.' + amt + ' successfully added to your VaultSave wallet!');
            setAmount('');
            setTimeout(() => navigate('/dashboard'), 2500);
          } catch (err) {
            setError(err.response?.data?.message || 'Payment verification failed.');
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setError('Payment failed: ' + response.error.description);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  const amt = parseFloat(amount) || 0;

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-white">Add Money</h1>
        <p className="text-dark-400 mt-1">Pay via GPay, UPI, Card or NetBanking via Razorpay</p>
      </div>

      <div className="glass-card p-4 mb-6 border border-vault-500/10">
        <p className="text-xs text-dark-400 font-medium mb-2 uppercase tracking-wide">How it works</p>
        <div className="flex items-center gap-2 text-sm text-dark-300 flex-wrap">
          <span className="text-vault-400">① Pay via GPay/UPI</span>
          <span className="text-dark-600">→</span>
          <span className="text-vault-400">② Razorpay verifies</span>
          <span className="text-dark-600">→</span>
          <span className="text-vault-400">③ Wallet credited instantly</span>
        </div>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div>
          <label className="label">Amount to add</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-300 font-semibold text-lg">₹</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="input-field pl-9 text-2xl font-display font-bold"
            />
          </div>
          {amt > 0 && (
            <p className="text-xs text-dark-500 mt-1.5">
              Current wallet: <span className="text-dark-300">{formatINR(user?.walletBalance || 0)}</span>
              {' → '}After: <span className="text-vault-400">{formatINR((user?.walletBalance || 0) + amt)}</span>
            </p>
          )}
        </div>

        <div>
          <label className="label">Quick select</label>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                  amount === String(a)
                    ? 'bg-vault-500/20 text-vault-400 border border-vault-500/30'
                    : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-500'
                }`}
              >
                {formatINR(a)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Accepted payment methods</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: '🟢', label: 'GPay' },
              { icon: '🟣', label: 'PhonePe' },
              { icon: '💳', label: 'Card' },
              { icon: '🏦', label: 'NetBanking' },
            ].map((m) => (
              <div key={m.label} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-dark-800 border border-dark-700">
                <span className="text-xl">{m.icon}</span>
                <span className="text-xs text-dark-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="px-4 py-3 rounded-xl bg-vault-500/10 border border-vault-500/20 text-vault-400 text-sm">
            ✅ {success}
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={loading || !amount || amt <= 0}
          className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
              Opening Razorpay...
            </>
          ) : (
            <>💸 Pay {amt > 0 ? formatINR(amt) : ''} via GPay / UPI</>
          )}
        </button>

        <p className="text-center text-xs text-dark-500">
          🔒 Secured by Razorpay · PCI DSS Compliant · 256-bit SSL
        </p>
      </div>

      <div className="mt-4 p-4 rounded-xl bg-gold-500/5 border border-gold-500/15">
        <p className="text-gold-400 text-xs font-semibold mb-1">⚠️ Test Mode</p>
        <p className="text-dark-400 text-xs">
          Test UPI: <span className="font-mono text-dark-200">success@razorpay</span> — Test card: <span className="font-mono text-dark-200">4111 1111 1111 1111</span> (any future expiry/CVV)
        </p>
      </div>
    </div>
  );
}
