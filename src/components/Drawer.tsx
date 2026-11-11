import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Crown,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  History,
  TrendingUp,
  ShieldAlert,
  Code2,
  RotateCcw,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose }) => {
  const {
    user,
    currentRole,
    paymentRequests,
    withdrawalRequests,
    setActiveScreen,
    resetAllData,
  } = useApp();

  if (!isOpen) return null;

  const pendingDeposits = paymentRequests.filter((p) => p.status === 'pending').length;
  const pendingWithdrawals = withdrawalRequests.filter((w) => w.status === 'pending').length;
  const totalAdminPending = pendingDeposits + pendingWithdrawals;

  const navigate = (screen: Parameters<typeof setActiveScreen>[0]) => {
    setActiveScreen(screen);
    onClose();
  };

  const availableBalance = user.walletBalance - user.frozenBalance;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content */}
      <aside className="relative w-full max-w-[310px] bg-gradient-to-b from-[#0a172e] via-[#0d1e3d] to-[#071120] text-slate-100 h-full shadow-2xl flex flex-col border-r border-amber-500/20 z-10 animate-in slide-in-from-left duration-200">
        {/* Header & User Card */}
        <div className="p-4 bg-gradient-to-r from-[#0d2044] to-[#122854] border-b border-amber-500/20 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mt-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#0b172e] rounded-[14px] flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-400 fill-amber-400" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-200 flex items-center gap-1.5">
                {user.username}
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-400/20 text-amber-300 rounded border border-amber-400/30 uppercase">
                  {currentRole}
                </span>
              </h3>
              <p className="text-xs text-slate-400">ID: {user.id.toUpperCase()}</p>
              <p className="text-[11px] text-slate-400">+91 {user.mobile}</p>
            </div>
          </div>

          {/* Quick Balance Breakdown */}
          <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                <Wallet className="w-3 h-3 text-amber-400" /> Available Balance
              </span>
              <span className="text-lg font-black text-amber-300">
                ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              {user.frozenBalance > 0 && (
                <p className="text-[10px] text-amber-400/80">
                  (₹{user.frozenBalance.toFixed(2)} on hold in pending withdrawals)
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('wallet')}
              className="px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm transition-transform active:scale-95"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Links Navigation */}
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          <button
            onClick={() => navigate('home')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-sm font-medium text-slate-200 hover:text-amber-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Markets & Bidding</span>
            </div>
            <span className="text-xs text-slate-500">›</span>
          </button>

          <button
            onClick={() => navigate('wallet')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-sm font-medium text-slate-200 hover:text-amber-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
              <span>Add Cash / Deposit</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Instant UPI
            </span>
          </button>

          <button
            onClick={() => navigate('withdraw')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-sm font-medium text-slate-200 hover:text-amber-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ArrowUpCircle className="w-4 h-4 text-sky-400" />
              <span>Withdraw Points</span>
            </div>
            <span className="text-xs text-slate-500">›</span>
          </button>

          <button
            onClick={() => navigate('passbook')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-sm font-medium text-slate-200 hover:text-amber-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Passbook & Statement</span>
            </div>
            <span className="text-xs text-slate-500">›</span>
          </button>

          <button
            onClick={() => navigate('history')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-sm font-medium text-slate-200 hover:text-amber-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <History className="w-4 h-4 text-purple-400" />
              <span>My Bids / Game History</span>
            </div>
            <span className="text-xs text-slate-500">›</span>
          </button>

          <button
            onClick={() => navigate('starline')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-sm font-medium text-slate-200 hover:text-purple-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span>Starline (Hourly Live)</span>
            </div>
            <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/30">
              10 AM-10 PM
            </span>
          </button>

          <button
            onClick={() => navigate('rates')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-sm font-medium text-slate-200 hover:text-amber-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-yellow-400" />
              <span>Game Rates (10 ka 95/950)</span>
            </div>
            <span className="text-xs text-slate-500">›</span>
          </button>

          <button
            onClick={() => navigate('chart')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-sm font-medium text-slate-200 hover:text-amber-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Panel & Jodi Charts</span>
            </div>
            <span className="text-xs text-slate-500">›</span>
          </button>

          <div className="pt-2 pb-1 border-t border-slate-800 my-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3">
              Deployment & Backend
            </span>
          </div>

          <button
            onClick={() => navigate('code_guide')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/20 text-sm font-medium text-blue-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Code2 className="w-4 h-4 text-blue-400" />
              <span>Railway & Git Backend Code</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
          </button>

          <button
            onClick={() => navigate('admin')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-sm font-medium text-amber-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Admin Management</span>
            </div>
            {totalAdminPending > 0 ? (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                {totalAdminPending} pending
              </span>
            ) : (
              <span className="text-xs text-slate-500">›</span>
            )}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              if (confirm('Reset all demo data and restore initial ₹2,500 balance?')) {
                resetAllData();
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Reset system state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>

          <a
            href="https://t.me"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>24/7 Support</span>
          </a>
        </div>
      </aside>
    </div>
  );
};
