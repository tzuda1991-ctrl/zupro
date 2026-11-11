import React from 'react';
import { GAME_RATES } from '../utils/matka';
import { GameType } from '../types';
import { X, TrendingUp, Sparkles } from 'lucide-react';

interface GameRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GameRatesModal: React.FC<GameRatesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const gameTypes: GameType[] = [
    'single_digit',
    'jodi_digit',
    'single_pana',
    'double_pana',
    'triple_pana',
    'half_sangam',
    'full_sangam',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0c1a33] to-[#071020] border border-amber-500/40 rounded-2xl shadow-2xl p-4 sm:p-5 text-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-amber-300">STAR777 Game Rates</h3>
              <p className="text-xs text-slate-400">Official standard Matka payout multipliers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80 bg-slate-950/80">
          {gameTypes.map((type) => {
            const r = GAME_RATES[type];
            return (
              <div key={type} className="p-3 flex items-center justify-between hover:bg-slate-900/50 transition-colors">
                <div>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-xs sm:text-sm text-slate-100">{r.title}</strong>
                    <span className="text-xs text-amber-400/80">({r.hindiTitle})</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{r.description}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-1 rounded-lg text-xs sm:text-sm font-black bg-gradient-to-r from-amber-500/20 to-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm">
                    {r.rateLabel}
                  </span>
                  <span className="block text-[10px] text-emerald-400 font-bold mt-0.5">
                    {r.multiplier}x Payout
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>All winning bids are settled automatically as soon as results are published!</span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
