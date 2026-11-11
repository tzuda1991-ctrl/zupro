import React from 'react';
import { useApp } from '../context/AppContext';
import { Market } from '../types';
import {
  TrendingUp,
  Play,
  Clock,
  Sparkles,
  BarChart2,
  Wallet,
  ArrowUpCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';

interface MarketListProps {
  onSelectMarketForBidding: (market: Market) => void;
  onOpenRates: () => void;
  onOpenCharts: (market: Market) => void;
}

export const MarketList: React.FC<MarketListProps> = ({
  onSelectMarketForBidding,
  onOpenRates,
  onOpenCharts,
}) => {
  const { markets, setActiveScreen, user, flashNotice } = useApp();

  const ICONS = ['♛', '★', '♠', '◆', '✿', '◈', '❀', '⬖', '✪'];

  return (
    <div className="space-y-4 pb-20">
      {/* Hero Banner / Marquee Ticker */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 border border-amber-500/30 p-2.5 sm:p-3 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
          <div className="overflow-hidden whitespace-nowrap w-full">
            <div className="animate-marquee inline-block">
              {flashNotice?.tickerText || '⚡ STAR777 PRO OFFICIAL · Instant UPI Deposit · Fast 5-Min Withdrawal · Highest Game Rates 10 ka 95/950 · Live Auto Settlement!'}
            </div>
          </div>
        </div>
      </div>

      {/* Optional Broadcast Flash Notice Banner */}
      {flashNotice?.enabled && flashNotice.bannerTitle && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-slate-900/90 border border-amber-500/40 shadow-md flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-amber-300">
              {flashNotice.bannerTitle}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {flashNotice.bannerMessage}
            </p>
          </div>
        </div>
      )}

      {/* Quick Action Matrix */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => setActiveScreen('wallet')}
          className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-gradient-to-b from-slate-900 to-[#0e1f3d] border border-amber-500/30 hover:border-amber-400 text-slate-100 group transition-all shadow-md active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1 group-hover:scale-110 transition-transform">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-amber-300">Add Cash</span>
          <span className="text-[9px] text-slate-400">Instant UPI</span>
        </button>

        <button
          onClick={() => setActiveScreen('withdraw')}
          className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-gradient-to-b from-slate-900 to-[#0e1f3d] border border-amber-500/30 hover:border-amber-400 text-slate-100 group transition-all shadow-md active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 mb-1 group-hover:scale-110 transition-transform">
            <ArrowUpCircle className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-amber-300">Withdraw</span>
          <span className="text-[9px] text-slate-400">Bank / UPI</span>
        </button>

        <button
          onClick={() => setActiveScreen('starline')}
          className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-gradient-to-b from-slate-900 to-[#0e1f3d] border border-purple-500/40 hover:border-purple-400 text-slate-100 group transition-all shadow-md active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 mb-1 group-hover:scale-110 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-purple-300">Starline</span>
          <span className="text-[9px] text-slate-400">Hourly Live</span>
        </button>

        <button
          onClick={onOpenRates}
          className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-gradient-to-b from-slate-900 to-[#0e1f3d] border border-amber-500/30 hover:border-amber-400 text-slate-100 group transition-all shadow-md active:scale-95"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 mb-1 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-amber-300">Game Rates</span>
          <span className="text-[9px] text-slate-400">10 Ka 950</span>
        </button>
      </div>

      {/* Market List Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-amber-300">
            Live Market List (लाइव बाजार)
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {markets.length} Markets
        </span>
      </div>

      {/* Markets Cards */}
      <div className="space-y-3">
        {markets.map((m, idx) => {
          const isOpen = m.status === 'OPEN';
          const icon = ICONS[idx % ICONS.length];

          return (
            <div
              key={m.id}
              className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
                isOpen
                  ? 'bg-gradient-to-r from-[#0d1e3d] via-[#102449] to-[#0a1833] border-amber-500/40 shadow-lg shadow-black/40 hover:border-amber-400'
                  : 'bg-gradient-to-r from-slate-900/90 to-[#0a1428]/90 border-slate-800/80 opacity-90'
              }`}
            >
              {/* Top Accent Ribbon for OPEN markets */}
              {isOpen && (
                <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-500" />
              )}

              <div className="p-3.5 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Market Details */}
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-md ${
                      isOpen
                        ? 'bg-gradient-to-br from-amber-400/20 to-amber-600/30 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                    }`}>
                      <span>{icon}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm sm:text-base text-slate-100 tracking-wide uppercase">
                          {m.name}
                        </h3>
                        {m.hindiName && (
                          <span className="text-xs font-semibold text-amber-400/80">
                            ({m.hindiName})
                          </span>
                        )}
                      </div>

                      {/* Result Display: e.g. "235 - 04 - 149" */}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-base sm:text-lg font-black tracking-widest text-amber-300 bg-slate-950/80 px-2.5 py-0.5 rounded-lg border border-amber-500/20 shadow-inner">
                          {m.result_text || '*** - ** - ***'}
                        </span>
                      </div>

                      {/* Timings */}
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-400/70" />
                        <span>Open: <strong className="text-slate-200">{m.opens}</strong></span>
                        <span className="text-slate-600">•</span>
                        <span>Close: <strong className="text-slate-200">{m.closes}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status & Action */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        isOpen
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                          : m.status === 'RUNNING'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {isOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                      {m.status}
                    </span>

                    <button
                      onClick={() => onSelectMarketForBidding(m)}
                      disabled={!isOpen}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                        isOpen
                          ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 hover:brightness-110 shadow-amber-500/25 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isOpen ? 'PLAY NOW' : 'CLOSED'}</span>
                    </button>

                    <button
                      onClick={() => onOpenCharts(m)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    >
                      <BarChart2 className="w-3 h-3 text-amber-400" />
                      <span>Panel Chart</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
