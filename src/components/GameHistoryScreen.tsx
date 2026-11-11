import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GAME_RATES } from '../utils/matka';
import {
  History,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  Coins,
  TrendingUp,
} from 'lucide-react';

export const GameHistoryScreen: React.FC = () => {
  const { bets, setActiveScreen } = useApp();

  const [filter, setFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('all');

  const filteredBets = bets.filter((b) => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  const wonBets = bets.filter((b) => b.status === 'won');
  const totalWinnings = wonBets.reduce((sum, b) => sum + (b.winAmount || b.potentialWin), 0);
  const pendingBets = bets.filter((b) => b.status === 'pending');
  const pendingStake = pendingBets.reduce((sum, b) => sum + b.points, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24 text-slate-100">
      {/* Top Banner Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0d2044] via-[#10274f] to-[#09172f] border border-amber-500/30 shadow-xl flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Real Bids & Game Slips
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5">
            My Bids & Game History
          </h2>
          <p className="text-xs text-slate-300">
            Real-time tracking of all active bids, wins, and auto settlements
          </p>
        </div>

        <button
          onClick={() => setActiveScreen('home')}
          className="px-4 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <TrendingUp className="w-4 h-4" />
          <span>Place New Bid</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Placed</span>
          <span className="text-sm sm:text-base font-black text-slate-200">
            {bets.length} Bids
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Running</span>
          <span className="text-sm sm:text-base font-black text-amber-300">
            {pendingBets.length} (₹{pendingStake})
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Won Payout</span>
          <span className="text-sm sm:text-base font-black text-emerald-400">
            ₹{totalWinnings.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all' as const, label: `All (${bets.length})` },
          { id: 'pending' as const, label: `Running (${pendingBets.length})` },
          { id: 'won' as const, label: `Won (${wonBets.length} 🏆)` },
          { id: 'lost' as const, label: `Lost (${bets.filter((b) => b.status === 'lost').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bets List */}
      <div className="space-y-3">
        {filteredBets.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
            <Coins className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-400" />
            <p className="text-sm font-semibold">No bids found in this category</p>
            <p className="text-xs text-slate-500 mt-1">Select an open market and start playing!</p>
          </div>
        ) : (
          filteredBets.map((b) => {
            const rate = GAME_RATES[b.gameType];
            const isWon = b.status === 'won';
            const isPending = b.status === 'pending';
            const isLost = b.status === 'lost';

            return (
              <div
                key={b.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isWon
                    ? 'bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900/90 border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left Info */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black text-lg shrink-0 border ${
                        isWon
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                          : 'bg-slate-950 text-amber-300 border-slate-700'
                      }`}
                    >
                      {b.selection}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm sm:text-base text-slate-100">
                          {b.marketName}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {rate?.title || b.gameType}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {b.session}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                        <span>
                          Stake: <strong className="text-slate-200">₹{b.points}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Rate: <strong className="text-amber-400">{b.multiplier}x</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Date: <strong className="text-slate-300">{b.entryDate}</strong>
                        </span>
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
                        Placed: {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Bid ID: #{b.id.slice(-6)}
                      </div>
                    </div>
                  </div>

                  {/* Right Status & Payout */}
                  <div className="text-right shrink-0">
                    {isWon && (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" /> WON
                        </span>
                        <div className="text-base sm:text-lg font-black text-emerald-400">
                          +₹{(b.winAmount || b.potentialWin).toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] text-emerald-400/80 block">Credited to Wallet</span>
                      </div>
                    )}

                    {isPending && (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3 text-amber-400 animate-spin" /> RUNNING
                        </span>
                        <div className="text-xs text-slate-400">
                          Pot. Win: <strong className="text-amber-300">₹{b.potentialWin.toLocaleString('en-IN')}</strong>
                        </div>
                        <span className="text-[10px] text-slate-500 block">Awaiting Result</span>
                      </div>
                    )}

                    {isLost && (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <XCircle className="w-3 h-3 text-rose-400" /> LOST
                        </span>
                        <div className="text-xs text-slate-500 line-through">
                          ₹{b.points}
                        </div>
                      </div>
                    )}
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
