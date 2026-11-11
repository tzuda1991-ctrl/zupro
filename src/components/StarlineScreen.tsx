import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StarlineMarket } from '../types';
import { isValidPana, calculateAnkFromPana } from '../utils/matka';
import {
  Sparkles,
  Clock,
  Play,
  Wallet,
  Coins,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const StarlineScreen: React.FC = () => {
  const { starlineMarkets, user, placeStarlineBet, setActiveScreen } = useApp();

  const [selectedSlot, setSelectedSlot] = useState<StarlineMarket | null>(
    starlineMarkets.find((s) => s.status === 'OPEN') || starlineMarkets[0]
  );
  const [gameMode, setGameMode] = useState<'single_digit' | 'single_pana'>('single_digit');
  const [stake, setStake] = useState<number>(50);
  const [selectedDigit, setSelectedDigit] = useState<string>('');
  const [panaInput, setPanaInput] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const availableBalance = user.walletBalance - user.frozenBalance;
  const CHIPS = [10, 20, 50, 100, 200, 500, 1000];

  const handlePlaceBet = (selection: string) => {
    setStatusMsg(null);
    if (!selectedSlot) return;

    if (selectedSlot.status === 'CLOSED') {
      setStatusMsg({ text: 'This Starline hour is closed for betting.', type: 'error' });
      return;
    }

    if (stake <= 0) {
      setStatusMsg({ text: 'Please enter a valid stake amount', type: 'error' });
      return;
    }

    if (availableBalance < stake) {
      setStatusMsg({ text: `Insufficient balance! You need ₹${stake}.`, type: 'error' });
      return;
    }

    if (gameMode === 'single_pana' && !isValidPana(selection)) {
      setStatusMsg({ text: 'Invalid 3-digit Pana! Use Matka order (e.g. 139, 248).', type: 'error' });
      return;
    }

    const res = placeStarlineBet(selectedSlot.id, gameMode, selection, stake);
    if (res.success) {
      setStatusMsg({ text: res.message, type: 'success' });
      setPanaInput('');
    } else {
      setStatusMsg({ text: res.message, type: 'error' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-24 text-slate-100">
      {/* Top Banner Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#170e28] via-[#24133d] to-[#0f1730] border border-amber-500/30 shadow-xl flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Hourly Live Gaming
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5">
            STARLINE BAZAR (हर घंटे रिजल्ट)
          </h2>
          <p className="text-xs text-slate-300">
            Fast 1-Hour Results from 10:00 AM to 10:00 PM · Rate: Digit (10 ka 95) · Pana (10 ka 1400)
          </p>
        </div>

        <div className="bg-slate-900/90 px-4 py-2 rounded-xl border border-amber-500/30 text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Available Balance</span>
          <span className="text-lg font-black text-amber-300">
            ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Hourly Slot Strip */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
          Select Hourly Market Slot:
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {starlineMarkets.map((s) => {
            const isSelected = selectedSlot?.id === s.id;
            const isOpen = s.status === 'OPEN';
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedSlot(s);
                  setStatusMsg(null);
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black scale-105'
                    : isOpen
                    ? 'bg-slate-800/90 text-slate-200 border-emerald-500/40 hover:border-amber-400'
                    : 'bg-slate-950/80 text-slate-400 border-slate-800'
                }`}
              >
                <div className="text-[11px] font-bold">{s.timeLabel}</div>
                <div className="text-[10px] font-mono mt-0.5 font-extrabold">
                  {s.result_text || '***-*'}
                </div>
                <span
                  className={`text-[8px] font-black uppercase px-1 py-0.2 rounded-full inline-block mt-1 ${
                    isOpen
                      ? isSelected ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {s.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bidding Console for Selected Slot */}
      {selectedSlot && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> STARLINE {selectedSlot.timeLabel}
              </h3>
              <p className="text-xs text-slate-400">
                Current Result: <strong className="text-amber-400 font-mono">{selectedSlot.result_text || '***-*'}</strong>
              </p>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                selectedSlot.status === 'OPEN'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {selectedSlot.status === 'OPEN' ? '🟢 BETTING OPEN' : '🔴 CLOSED'}
            </span>
          </div>

          {/* Game Mode Switch */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGameMode('single_digit')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                gameMode === 'single_digit'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Single Digit (0-9) • 10 ka 95
            </button>
            <button
              onClick={() => setGameMode('single_pana')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                gameMode === 'single_pana'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Single Pana (3 Digits) • 10 ka 1400
            </button>
          </div>

          {/* Stake Chip Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Select Stake Points (₹):</span>
              <span className="text-amber-400">₹{stake}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setStake(chip)}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold border transition-all ${
                    stake === chip
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ₹{chip}
                </button>
              ))}
              <input
                type="number"
                min="1"
                value={stake}
                onChange={(e) => setStake(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 px-2 py-1 text-xs font-bold bg-slate-950 border border-slate-700 rounded-lg text-amber-300 text-center"
              />
            </div>
          </div>

          {/* INPUT SELECTION */}
          {gameMode === 'single_digit' ? (
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-bold block">
                Tap a Digit to Place ₹{stake} Bet (Potential Win ₹{Math.round(stake * 9.5)}):
              </span>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                  <button
                    key={digit}
                    disabled={selectedSlot.status === 'CLOSED'}
                    onClick={() => handlePlaceBet(digit)}
                    className="py-3 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 font-mono font-black text-lg transition-transform active:scale-95 shadow-md disabled:opacity-40"
                  >
                    {digit}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-xs text-slate-400 font-bold block">
                Enter 3-Digit Pana (Potential Win ₹{Math.round(stake * 140)}):
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={3}
                  value={panaInput}
                  onChange={(e) => setPanaInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 139, 248"
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-lg font-mono font-black text-amber-300 text-center tracking-widest focus:border-amber-400 outline-none"
                />
                <button
                  disabled={selectedSlot.status === 'CLOSED'}
                  onClick={() => handlePlaceBet(panaInput)}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40"
                >
                  Place Pana Bid
                </button>
              </div>
            </div>
          )}

          {/* Feedback */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
