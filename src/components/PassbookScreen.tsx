import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WalletTransaction } from '../types';
import {
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  Trophy,
  Coins,
  RefreshCw,
  Filter,
} from 'lucide-react';

export const PassbookScreen: React.FC = () => {
  const { transactions, user, setActiveScreen } = useApp();

  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'bet_place' | 'bet_win'>('all');

  const filteredTx = transactions.filter((tx) => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  const totalDeposited = transactions
    .filter((t) => t.type === 'deposit')
    .reduce((s, t) => s + t.amount, 0);

  const totalWon = transactions
    .filter((t) => t.type === 'bet_win')
    .reduce((s, t) => s + t.amount, 0);

  const totalStaked = Math.abs(
    transactions
      .filter((t) => t.type === 'bet_place')
      .reduce((s, t) => s + t.amount, 0)
  );

  const getTxIcon = (type: WalletTransaction['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownCircle className="w-5 h-5 text-emerald-400" />;
      case 'withdrawal':
        return <ArrowUpCircle className="w-5 h-5 text-sky-400" />;
      case 'bet_win':
        return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'bet_place':
        return <Coins className="w-5 h-5 text-rose-400" />;
      default:
        return <RefreshCw className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24 text-slate-100">
      {/* Top Ledger Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0d2044] via-[#10274f] to-[#09172f] border border-amber-500/30 shadow-xl flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Wallet Passbook & Statement
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5">
            Transaction History
          </h2>
          <p className="text-xs text-slate-300">
            Official ledger of deposits, bets, winnings, and withdrawals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveScreen('wallet')}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
          >
            + Add Cash
          </button>
          <button
            onClick={() => setActiveScreen('withdraw')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 transition-colors"
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Deposited</span>
          <span className="text-sm sm:text-base font-black text-emerald-400">
            ₹{totalDeposited.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Winnings</span>
          <span className="text-sm sm:text-base font-black text-amber-300">
            ₹{totalWon.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Bets Stake</span>
          <span className="text-sm sm:text-base font-black text-rose-400">
            ₹{totalStaked.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all' as const, label: 'All Transactions' },
          { id: 'deposit' as const, label: 'Deposits (+)' },
          { id: 'bet_win' as const, label: 'Winnings (🏆)' },
          { id: 'bet_place' as const, label: 'Bids Placed (-)' },
          { id: 'withdrawal' as const, label: 'Withdrawals (-)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden divide-y divide-slate-800/70">
        {filteredTx.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
            <p className="text-sm">No transactions found for this filter</p>
          </div>
        ) : (
          filteredTx.map((tx) => {
            const isCredit = tx.amount > 0;
            return (
              <div key={tx.id} className="p-3.5 sm:p-4 hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 mt-0.5">
                    {getTxIcon(tx.type)}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-100">{tx.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{tx.note}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-medium">
                      <span>{new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {tx.referenceId && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-amber-400/80">Ref: {tx.referenceId}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-sm sm:text-base font-black tracking-tight ${
                      isCredit ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isCredit ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Bal: ₹{tx.balanceAfter.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
