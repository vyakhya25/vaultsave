import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllVaults, withdrawVault, createPayout } from '../utils/api';
import { formatINR, formatDate } from '../utils/format';

const INDIAN_BANKS = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
  'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda',
  'Canara Bank', 'Union Bank of India', 'IndusInd Bank',
  'Yes Bank', 'IDFC First Bank', 'Federal Bank', 'South Indian Bank',
];

export default function WithdrawToBank() {
  const { updateBalance } = useAuth();
  const navigate = useNavigate();
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: select vault, 2: bank details, 3: confirm, 4: success
  const [selectedVault, setSelectedVault] = useState(null);
  const [withdrawOption, setWithdrawOption] = useState('wallet'); // 'wallet' or 'bank'
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    bankName: '',
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    getAllVaults()
      .then(({ data }) => {
        const now = new Date();
        setVaults(data.filter(v => v.status === 'LOCKED' && new Date(v.unlockDate) <= now));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectVault = (vault) => {
    setSelectedVault(vault);
    setStep(2);
    setError('');
  };

  const handleBankChange = (e) => {
    setBankDetails({ ...bankDetails, [e.target.name]: e.target.value });
  };

  const handleProceed = () => {
    setError('');
    if (withdrawOption === 'bank') {
      if (!bankDetails.accountHolderName.trim()) return setError('Enter account holder name');
      if (!bankDetails.accountNumber.trim()) return setError('Enter account number');
      if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) return setError('Account numbers do not match');
      if (!bankDetails.ifscCode.trim()) return setError('Enter IFSC code');
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode.toUpperCase())) return setError('Enter a valid IFSC code (e.g. SBIN0001234)');
    }
    setStep(3);
  };

  const handleConfirm = async () => {
    setProcessing(true);
    setError('');
    try {
      // Step 1: Withdraw vault → wallet
      const { data: withdrawData } = await withdrawVault(selectedVault._id);
      updateBalance(withdrawData.walletBalance);

      if (withdrawOption === 'wallet') {
        setResult({
          type: 'wallet',
          amount: selectedVault.amount,
          walletBalance: withdrawData.walletBalance,
          message: withdrawData.message,
        });
        setStep(4);
        return;
      }

      // Step 2: Payout to bank
      const { data: payoutData } = await createPayout({
        accountNumber: bankDetails.accountNumber,
        ifscCode: bankDetails.ifscCode.toUpperCase(),
        accountHolderName: bankDetails.accountHolderName,
        amount: selectedVault.amount,
        vaultId: selectedVault._id,
      });

      // Deduct from wallet (backend handles this in payout route)
      setResult({
        type: 'bank',
        amount: selectedVault.amount,
        payoutId: payoutData.payoutId,
        isTestMode: payoutData.isTestMode,
        message: payoutData.message,
        bankName: bankDetails.bankName || 'Your bank',
        last4: bankDetails.accountNumber.slice(-4),
      });
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || 'Withdrawal failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-vault-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-white">Withdraw Funds</h1>
        <p className="text-dark-400 mt-1">Transfer unlocked vault money to wallet or bank</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {['Select Vault', 'Options', 'Confirm', 'Done'].map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 ${i < 3 ? 'flex-1' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                step > i + 1 ? 'bg-vault-500 text-dark-950' :
                step === i + 1 ? 'bg-vault-500/20 text-vault-400 border border-vault-500/40' :
                'bg-dark-800 text-dark-500 border border-dark-700'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${step === i + 1 ? 'text-dark-200' : 'text-dark-600'}`}>
                {label}
              </span>
            </div>
            {i < 3 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-vault-500/40' : 'bg-dark-700'}`} />}
          </div>
        ))}
      </div>

      {/* STEP 1: Select vault */}
      {step === 1 && (
        <div className="space-y-4">
          {vaults.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <p className="text-4xl mb-3">🔒</p>
              <p className="text-dark-300 font-medium mb-1">No unlocked vaults</p>
              <p className="text-dark-500 text-sm mb-5">
                Vaults can only be withdrawn after their unlock date
              </p>
              <button onClick={() => navigate('/vaults')} className="btn-secondary">
                View My Vaults
              </button>
            </div>
          ) : (
            <>
              <p className="text-dark-400 text-sm">{vaults.length} vault{vaults.length !== 1 ? 's' : ''} ready to withdraw</p>
              {vaults.map((vault) => (
                <button
                  key={vault._id}
                  onClick={() => handleSelectVault(vault)}
                  className="glass-card vault-unlocked border w-full p-5 text-left hover:border-vault-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white group-hover:text-vault-300 transition-colors">
                        {vault.goalName}
                      </p>
                      <p className="text-dark-400 text-xs mt-1">Unlocked on {formatDate(vault.unlockDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-display font-bold text-vault-400">
                        {formatINR(vault.amount)}
                      </p>
                      <p className="text-xs text-vault-500 mt-1">Tap to withdraw →</p>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* STEP 2: Choose where to send */}
      {step === 2 && selectedVault && (
        <div className="space-y-5">
          <div className="glass-card p-4 border border-vault-500/20">
            <p className="text-xs text-dark-400 mb-1">Withdrawing from</p>
            <p className="font-semibold text-white">{selectedVault.goalName}</p>
            <p className="text-vault-400 font-display font-bold text-xl">{formatINR(selectedVault.amount)}</p>
          </div>

          <div>
            <label className="label">Send money to</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setWithdrawOption('wallet')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  withdrawOption === 'wallet'
                    ? 'bg-vault-500/10 border-vault-500/30 text-vault-400'
                    : 'bg-dark-800 border-dark-700 text-dark-300 hover:border-dark-500'
                }`}
              >
                <p className="text-2xl mb-2">💰</p>
                <p className="font-semibold text-sm">VaultSave Wallet</p>
                <p className="text-xs opacity-70 mt-1">Instant · No fees</p>
              </button>
              <button
                onClick={() => setWithdrawOption('bank')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  withdrawOption === 'bank'
                    ? 'bg-vault-500/10 border-vault-500/30 text-vault-400'
                    : 'bg-dark-800 border-dark-700 text-dark-300 hover:border-dark-500'
                }`}
              >
                <p className="text-2xl mb-2">🏦</p>
                <p className="font-semibold text-sm">Bank Account</p>
                <p className="text-xs opacity-70 mt-1">Via IMPS · ~30 mins</p>
              </button>
            </div>
          </div>

          {withdrawOption === 'bank' && (
            <div className="space-y-4">
              <div>
                <label className="label">Account holder name</label>
                <input
                  name="accountHolderName"
                  value={bankDetails.accountHolderName}
                  onChange={handleBankChange}
                  placeholder="As per bank records"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Bank name</label>
                <select
                  name="bankName"
                  value={bankDetails.bankName}
                  onChange={handleBankChange}
                  className="input-field"
                >
                  <option value="">Select bank</option>
                  {INDIAN_BANKS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Account number</label>
                <input
                  name="accountNumber"
                  value={bankDetails.accountNumber}
                  onChange={handleBankChange}
                  placeholder="Enter account number"
                  className="input-field font-mono"
                  type="password"
                />
              </div>
              <div>
                <label className="label">Confirm account number</label>
                <input
                  name="confirmAccountNumber"
                  value={bankDetails.confirmAccountNumber}
                  onChange={handleBankChange}
                  placeholder="Re-enter account number"
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="label">IFSC code</label>
                <input
                  name="ifscCode"
                  value={bankDetails.ifscCode}
                  onChange={handleBankChange}
                  placeholder="e.g. SBIN0001234"
                  className="input-field font-mono uppercase"
                  maxLength={11}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
            <button onClick={handleProceed} className="btn-primary flex-1">Continue →</button>
          </div>
        </div>
      )}

      {/* STEP 3: Confirm */}
      {step === 3 && selectedVault && (
        <div className="space-y-5">
          <div className="glass-card p-5 space-y-3">
            <p className="font-semibold text-dark-300 text-sm uppercase tracking-wide">Transfer Summary</p>
            <div className="flex justify-between py-2 border-b border-dark-700">
              <span className="text-dark-400 text-sm">Amount</span>
              <span className="text-white font-bold font-display">{formatINR(selectedVault.amount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-dark-700">
              <span className="text-dark-400 text-sm">From vault</span>
              <span className="text-dark-200 text-sm">{selectedVault.goalName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-dark-700">
              <span className="text-dark-400 text-sm">Destination</span>
              <span className="text-dark-200 text-sm">
                {withdrawOption === 'wallet' ? '💰 VaultSave Wallet' : `🏦 ****${bankDetails.accountNumber.slice(-4)}`}
              </span>
            </div>
            {withdrawOption === 'bank' && (
              <>
                <div className="flex justify-between py-2 border-b border-dark-700">
                  <span className="text-dark-400 text-sm">Bank</span>
                  <span className="text-dark-200 text-sm">{bankDetails.bankName || 'Bank Account'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-700">
                  <span className="text-dark-400 text-sm">IFSC</span>
                  <span className="text-dark-200 text-sm font-mono">{bankDetails.ifscCode.toUpperCase()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-dark-400 text-sm">Transfer mode</span>
                  <span className="text-dark-200 text-sm">IMPS (~30 min)</span>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} disabled={processing} className="btn-secondary flex-1">← Back</button>
            <button onClick={handleConfirm} disabled={processing} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                '✅ Confirm Transfer'
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Success */}
      {step === 4 && result && (
        <div className="glass-card p-8 text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-vault-500/10 border-2 border-vault-500/30 flex items-center justify-center text-4xl mx-auto animate-pulse-slow">
            {result.type === 'wallet' ? '💰' : '🏦'}
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white mb-2">Transfer Successful!</h2>
            <p className="text-vault-400 text-2xl font-display font-bold">{formatINR(result.amount)}</p>
          </div>
          <p className="text-dark-300 text-sm">{result.message}</p>
          {result.isTestMode && (
            <p className="text-gold-400 text-xs bg-gold-500/10 border border-gold-500/20 rounded-lg px-3 py-2">
              ⚠️ Test mode — in live mode funds arrive in 30 minutes via IMPS
            </p>
          )}
          {result.payoutId && (
            <p className="text-dark-500 text-xs font-mono">Payout ID: {result.payoutId}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => navigate('/dashboard')} className="btn-primary flex-1">Go to Dashboard</button>
            <button onClick={() => navigate('/transactions')} className="btn-secondary flex-1">View Transactions</button>
          </div>
        </div>
      )}
    </div>
  );
}
