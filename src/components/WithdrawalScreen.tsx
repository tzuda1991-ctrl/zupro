import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowUpCircle,
  Wallet,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';

export const WithdrawalScreen: React.FC = () => {
  const { user, submitWithdrawal, withdrawalRequests, setActiveScreen } = useApp();

  const [amount, setAmount] = useState<number>(500);
  const [method, setMethod] = useState<'upi' | 'bank'>('upi');
  const [upiVpa, setUpiVpa] = useState<string>('');
  
  // Bank fields
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [confirmAccount, setConfirmAccount] = useState<string>('');
  const [ifsc, setIfsc] = useState<string>('');
  const [holderName, setHolderName] = useState<string>('');

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const availableBalance = user.walletBalance - user.frozenBalance;
  const MIN_WITHDRAWAL = 300;
  const MAX_WITHDRAWAL = 100000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (amount < MIN_WITHDRAWAL) {
      setMessage({ text: `Minimum withdrawal is ₹${MIN_WITHDRAWAL}`, type: 'error' });
      return;
    }

    if (amount > availableBalance) {
      setMessage({
        text: `Insufficient available points! You have ₹${availableBalance.toFixed(2)} available.`,
        type: 'error',
      });
      return;
    }

    let payoutDetails = '';

    if (method === 'upi') {
      if (!upiVpa || !upiVpa.includes('@')) {
        setMessage({ text: 'Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm)', type: 'error' });
        return;
      }
      payoutDetails = `UPI: ${upiVpa.trim()}`;
    } else {
      if (!accountNumber || accountNumber !== confirmAccount) {
        setMessage({ text: 'Bank Account Numbers do not match!', type: 'error' });
        return;
      }
      if (!ifsc || ifsc.trim().length !== 11) {
        setMessage({ text: 'Please enter valid 11-character IFSC code', type: 'error' });
        return;
      }
      if (!holderName || holderName.trim().length < 3) {
        setMessage({ text: 'Please enter account holder name', type: 'error' });
        return;
      }
      payoutDetails = `A/C: ${accountNumber.trim()} | IFSC: ${ifsc.trim().toUpperCase()} | Name: ${holderName.trim()}`;
    }

    const res = submitWithdrawal(amount, method, payoutDetails);

    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      setUpiVpa('');
      setAccountNumber('');
      setConfirmAccount('');
      setIfsc('');
      setHolderName('');
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24 text-slate-100">
      {/* Top Banner Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0b1c3a] via-[#10274f] to-[#09172f] border border-amber-500/30 shadow-xl flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-xs uppercase font-extrabold text-sky-400 tracking-wider flex items-center gap-1.5">
            <ArrowUpCircle className="w-3.5 h-3.5" /> Instant Bank & UPI Payouts
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5">
            Withdraw Points to Cash
          </h2>
          <p className="text-xs text-slate-300">
            Processed directly to your UPI ID or Bank Account (IMPS/NEFT)
          </p>
        </div>

        <div className="text-right bg-slate-900/90 px-4 py-2 rounded-xl border border-amber-500/30">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Available Points</span>
          <span className="text-xl font-black text-emerald-400">
            ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          {user.frozenBalance > 0 && (
            <span className="text-[10px] text-amber-400/90 block">
              ₹{user.frozenBalance.toFixed(2)} in pending review
            </span>
          )}
        </div>
      </div>

      {/* Rules Information Card */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-slate-300">
          <p>
            • Minimum withdrawal is <strong className="text-amber-300">₹300</strong> and maximum is <strong className="text-amber-300">₹1,00,000</strong> per request.
          </p>
          <p>
            • 0% withdrawal fee. Funds are dispatched directly via IMPS 24x7.
          </p>
        </div>
      </div>

      {/* Withdrawal Form */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Withdrawal Points / Amount (₹)
            </label>
            <button
              type="button"
              onClick={() => setAmount(Math.floor(availableBalance))}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300"
            >
              Withdraw All (₹{Math.floor(availableBalance)})
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-amber-400">
              ₹
            </span>
            <input
              type="number"
              min={MIN_WITHDRAWAL}
              max={MAX_WITHDRAWAL}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
              className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-black text-amber-300 focus:border-amber-400 outline-none"
              placeholder="e.g. 500"
            />
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {[300, 500, 1000, 2000, 5000].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  amount === p
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                ₹{p}
              </button>
            ))}
          </div>
        </div>

        {/* Method Selector */}
        <div>
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
            2. Choose Payout Destination
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod('upi')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                method === 'upi'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wallet className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold">UPI ID (Fastest)</span>
              <span className="text-[10px] text-slate-400">GPay, PhonePe, Paytm</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('bank')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                method === 'bank'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-5 h-5 text-sky-400" />
              <span className="text-xs font-bold">Bank Account</span>
              <span className="text-[10px] text-slate-400">Direct IMPS / NEFT</span>
            </button>
          </div>
        </div>

        {/* Method Fields */}
        {method === 'upi' ? (
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Your UPI ID / VPA:
            </label>
            <input
              type="text"
              required
              value={upiVpa}
              onChange={(e) => setUpiVpa(e.target.value)}
              placeholder="e.g. mobile@paytm or yourname@okhdfcbank"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-amber-300 focus:border-amber-400 outline-none"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Account Holder Full Name:</label>
              <input
                type="text"
                required
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Name as per bank account"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-amber-400 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Bank Account Number:</label>
                <input
                  type="password"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter Account Number"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Confirm Account Number:</label>
                <input
                  type="text"
                  required
                  value={confirmAccount}
                  onChange={(e) => setConfirmAccount(e.target.value)}
                  placeholder="Re-enter Account Number"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Bank IFSC Code:</label>
              <input
                type="text"
                required
                maxLength={11}
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001042"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 uppercase focus:border-amber-400 outline-none"
              />
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={amount > availableBalance || amount < MIN_WITHDRAWAL}
          className={`w-full py-3 rounded-xl font-black text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
            amount > availableBalance || amount < MIN_WITHDRAWAL
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 hover:brightness-110 shadow-amber-500/20'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          <span>Request Payout of ₹{amount.toLocaleString('en-IN')}</span>
        </button>
      </form>

      {/* Withdrawal History */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" /> Withdrawal Requests Status
          </h3>
          <button
            onClick={() => setActiveScreen('passbook')}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300"
          >
            Passbook ›
          </button>
        </div>

        {withdrawalRequests.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">No withdrawal requests yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                  <th className="py-2">Req ID</th>
                  <th className="py-2">Points</th>
                  <th className="py-2">Method</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {withdrawalRequests.slice(0, 5).map((w) => (
                  <tr key={w.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 font-mono text-slate-400">#{w.id.slice(-6)}</td>
                    <td className="py-2.5 font-black text-amber-300">
                      ₹{w.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 uppercase text-slate-400">{w.method}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          w.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : w.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-[11px] text-slate-400">
                      {w.payoutReference || (w.status === 'pending' ? 'In Queue' : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
