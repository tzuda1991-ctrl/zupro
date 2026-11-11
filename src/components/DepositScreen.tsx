import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Wallet,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const DepositScreen: React.FC = () => {
  const { user, submitDeposit, paymentRequests, setActiveScreen, activeUpi } = useApp();

  const [amount, setAmount] = useState<number>(500);
  const [method, setMethod] = useState<'upi' | 'qr' | 'bank'>('qr');
  const [utr, setUtr] = useState<string>('');
  const [proofPreview, setProofPreview] = useState<string>('');
  const [autoApprove, setAutoApprove] = useState<boolean>(true);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const UPI_ID = activeUpi?.upiId || 'star777matka@axl';
  const BANK_DETAILS = {
    bankName: activeUpi?.bankName || 'Axis Bank Ltd',
    accountNumber: '50200084920194',
    ifsc: 'HDFC0001042',
    accountHolder: activeUpi?.accountHolder || 'STAR777 ENTERTAINMENT PVT LTD',
  };

  const PRESETS = [200, 500, 1000, 2000, 5000, 10000];

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(BANK_DETAILS.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ text: 'File too large! Max size is 2MB.', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (amount < 100) {
      setMessage({ text: 'Minimum deposit amount is ₹100', type: 'error' });
      return;
    }

    if (!utr || utr.trim().length < 6) {
      setMessage({ text: 'Please enter valid 12-digit UTR / Reference ID', type: 'error' });
      return;
    }

    const res = submitDeposit(method, amount, utr, proofPreview || undefined, autoApprove);

    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      setUtr('');
      setProofPreview('');
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  // Generate UPI payment intent url
  const upiIntentUrl = `upi://pay?pa=${UPI_ID}&pn=STAR777&am=${amount}&cu=INR&tn=STAR777-DEP`;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24 text-slate-100">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0d2044] via-[#122854] to-[#0a1834] border border-amber-500/30 shadow-xl flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Real Money Wallet
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5">
            Add Cash / Deposit Points
          </h2>
          <p className="text-xs text-slate-300">
            Instant UPI, PhonePe, Google Pay, Paytm & Direct Bank Transfer
          </p>
        </div>

        <div className="text-right bg-slate-900/90 px-4 py-2 rounded-xl border border-amber-500/30">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Balance</span>
          <span className="text-xl font-black text-amber-300">
            ₹{user.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Preset Amount Selector */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
          1. Select or Enter Amount (Min ₹100)
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={`py-2 rounded-xl font-black text-sm border transition-all active:scale-95 ${
                amount === p
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-105'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-amber-500/40'
              }`}
            >
              ₹{p.toLocaleString('en-IN')}
            </button>
          ))}
        </div>

        <div className="relative mt-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-amber-400">
            ₹
          </span>
          <input
            type="number"
            min="100"
            max="100000"
            step="1"
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value, 10) || 0))}
            className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-black text-amber-300 focus:border-amber-400 outline-none"
            placeholder="Custom amount (Min ₹100)"
          />
        </div>
      </div>

      {/* Payment Method Selector */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
          2. Select Payment Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'qr' as const, label: 'UPI QR Code', icon: QrCode },
            { id: 'upi' as const, label: 'UPI ID Transfer', icon: Wallet },
            { id: 'bank' as const, label: 'Bank Transfer (IMPS)', icon: ShieldCheck },
          ].map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  active
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-center">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* DETAILS FOR SELECTED METHOD */}
        {method === 'qr' && (
          <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex flex-col items-center text-center space-y-3">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Scan & Pay ₹{amount.toLocaleString('en-IN')}
            </span>

            {/* Generated QR visual code */}
            <div className="p-3 bg-white rounded-2xl shadow-xl flex flex-col items-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  upiIntentUrl
                )}`}
                alt="STAR777 UPI QR Code"
                className="w-44 h-44 object-contain rounded-lg"
              />
              <span className="text-[10px] text-slate-700 font-bold mt-1.5 uppercase tracking-wider">
                STAR777 Official UPI QR
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="font-mono text-xs text-amber-300 font-bold">{UPI_ID}</span>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 p-1"
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Quick UPI Intent Buttons */}
            <div className="w-full pt-1 flex items-center justify-center gap-2 flex-wrap">
              <a
                href={upiIntentUrl}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                Pay via UPI App (GPay / PhonePe / Paytm)
              </a>
            </div>
          </div>
        )}

        {method === 'upi' && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-slate-300 block">
              Official UPI VPA for Manual Transfer:
            </span>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-amber-500/30">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold">UPI ID / VPA</span>
                <div className="font-mono text-base font-bold text-amber-300">{UPI_ID}</div>
                <span className="text-xs text-slate-400">Name: STAR777 ENTERTAINMENT</span>
              </div>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
              >
                {copiedUpi ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                <span>{copiedUpi ? 'Copied!' : 'Copy UPI'}</span>
              </button>
            </div>
          </div>
        )}

        {method === 'bank' && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
            <span className="text-xs font-bold text-slate-300 block">
              Direct IMPS / NEFT Bank Account Details:
            </span>
            <div className="space-y-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Bank Name:</span>
                <strong className="text-slate-200">{BANK_DETAILS.bankName}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Account Number:</span>
                <div className="flex items-center gap-1.5">
                  <strong className="text-amber-300 font-mono">{BANK_DETAILS.accountNumber}</strong>
                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className="p-1 text-slate-400 hover:text-amber-300"
                  >
                    {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">IFSC Code:</span>
                <strong className="text-amber-300 font-mono">{BANK_DETAILS.ifsc}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Beneficiary:</span>
                <strong className="text-slate-200">{BANK_DETAILS.accountHolder}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verification Form (UTR & Proof) */}
      <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
          3. Submit Payment Reference & Proof
        </label>

        <div>
          <label className="text-xs text-slate-400 block mb-1">
            UTR / 12-Digit Transaction Reference Number:
          </label>
          <input
            type="text"
            required
            maxLength={30}
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            placeholder="e.g. 431089234120 or UPI Ref ID"
            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono font-bold text-amber-300 focus:border-amber-400 outline-none"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            You will find the 12-digit UTR in Google Pay, PhonePe, Paytm, or your bank app payment receipt.
          </p>
        </div>

        {/* Optional Proof Screenshot */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">
            Payment Screenshot Proof (Optional):
          </label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Choose Image</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {proofPreview && (
              <div className="flex items-center gap-2">
                <img
                  src={proofPreview}
                  alt="Proof preview"
                  className="w-10 h-10 object-cover rounded-lg border border-amber-500/40"
                />
                <span className="text-xs text-emerald-400 font-semibold">Proof attached</span>
              </div>
            )}
          </div>
        </div>

        {/* Instant Verification Switch for Testing/Demo */}
        <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Instant Auto-Approve (Demo/Fast Test)
            </span>
            <p className="text-[10px] text-slate-400">
              Immediately credits wallet balance without waiting for Admin review
            </p>
          </div>
          <input
            type="checkbox"
            checked={autoApprove}
            onChange={(e) => setAutoApprove(e.target.checked)}
            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
          />
        </div>

        {/* Alert Feedback */}
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
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Wallet className="w-4 h-4" />
          <span>Confirm & Add ₹{amount.toLocaleString('en-IN')} to Wallet</span>
        </button>
      </form>

      {/* Recent Deposit Requests Table */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Recent Deposit Requests
          </h3>
          <button
            onClick={() => setActiveScreen('passbook')}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300"
          >
            View All Ledger ›
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                <th className="py-2">Ref/UTR</th>
                <th className="py-2">Method</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paymentRequests.slice(0, 5).map((req) => (
                <tr key={req.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 font-mono text-amber-300 font-bold">{req.utr}</td>
                  <td className="py-2.5 uppercase text-slate-400 font-semibold">{req.method}</td>
                  <td className="py-2.5 font-black text-emerald-400">
                    +₹{req.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        req.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : req.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-slate-500 text-[11px]">
                    {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
