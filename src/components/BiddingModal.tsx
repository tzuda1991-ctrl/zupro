import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Market, GameType, SessionType, BetItem } from '../types';
import {
  GAME_RATES,
  calculateAnkFromPana,
  isValidPana,
  TRIPLE_PANAS,
  PANAS_BY_ANK,
  generateCrossingJodis,
  generateFamilyJodis,
} from '../utils/matka';
import {
  X,
  Plus,
  Trash2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Coins,
  Zap,
  Layers,
  Sparkles,
} from 'lucide-react';

interface BiddingModalProps {
  market: Market;
  onClose: () => void;
}

export const BiddingModal: React.FC<BiddingModalProps> = ({ market, onClose }) => {
  const { user, placeBets, setActiveScreen } = useApp();

  const [session, setSession] = useState<SessionType>(() => {
    // If open pana already declared, default to CLOSE
    return market.open_pana ? 'CLOSE' : 'OPEN';
  });

  const [gameType, setGameType] = useState<GameType>('single_digit');
  const [biddingMode, setBiddingMode] = useState<'standard' | 'crossing' | 'family'>('standard');

  // Input states
  const [selectedDigit, setSelectedDigit] = useState<string>('');
  const [customStake, setCustomStake] = useState<number>(50);
  const [panaInput, setPanaInput] = useState<string>('');
  const [jodiInput, setJodiInput] = useState<string>('');

  // Pro Tools states
  const [crossingDigits, setCrossingDigits] = useState<string[]>(['1', '2', '3', '4']);
  const [crossingWithDouble, setCrossingWithDouble] = useState<boolean>(true);
  const [familyBaseJodi, setFamilyBaseJodi] = useState<string>('24');

  // Sangam inputs
  const [sangamOpenPana, setSangamOpenPana] = useState<string>('');
  const [sangamCloseAnk, setSangamCloseAnk] = useState<string>('');
  const [sangamClosePana, setSangamClosePana] = useState<string>('');

  // Multi-bid slip
  const [slip, setSlip] = useState<BetItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const rate = GAME_RATES[gameType];
  const availableBalance = user.walletBalance - user.frozenBalance;
  const totalSlipPoints = slip.reduce((sum, item) => sum + item.points, 0);

  const PRESET_CHIPS = [10, 20, 50, 100, 200, 500, 1000, 2000];

  // Helper to add item to slip
  const addItemToSlip = (number: string, points: number) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (points <= 0) {
      setErrorMsg('Points must be greater than 0');
      return;
    }

    if (totalSlipPoints + points > availableBalance) {
      setErrorMsg(`Insufficient balance! Available: ₹${availableBalance.toFixed(2)}`);
      return;
    }

    // Check if number already in slip -> update points or add new
    setSlip((prev) => {
      const existingIndex = prev.findIndex((item) => item.number === number);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].points += points;
        return updated;
      }
      return [...prev, { number, points }];
    });
  };

  const removeItem = (idx: number) => {
    setSlip((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearSlip = () => {
    setSlip([]);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Add Single Digit
  const handleAddDigit = (digit: string) => {
    addItemToSlip(digit, customStake);
  };

  // Add Jodi
  const handleAddJodi = () => {
    if (!/^[0-9]{2}$/.test(jodiInput)) {
      setErrorMsg('Please enter a valid 2-digit Jodi (00 to 99)');
      return;
    }
    addItemToSlip(jodiInput, customStake);
    setJodiInput('');
  };

  // Add Pana
  const handleAddPana = () => {
    if (!isValidPana(panaInput)) {
      setErrorMsg('Invalid Pana! Must be 3 digits in Matka order (e.g. 139, 188, 780).');
      return;
    }
    addItemToSlip(panaInput, customStake);
    setPanaInput('');
  };

  // Add Sangam
  const handleAddHalfSangam = () => {
    if (!isValidPana(sangamOpenPana) || !/^[0-9]$/.test(sangamCloseAnk)) {
      setErrorMsg('Enter valid 3-digit Open Pana and 1-digit Close Ank');
      return;
    }
    addItemToSlip(`${sangamOpenPana}X${sangamCloseAnk}`, customStake);
    setSangamOpenPana('');
    setSangamCloseAnk('');
  };

  const handleAddFullSangam = () => {
    if (!isValidPana(sangamOpenPana) || !isValidPana(sangamClosePana)) {
      setErrorMsg('Enter valid 3-digit Open Pana and valid 3-digit Close Pana');
      return;
    }
    addItemToSlip(`${sangamOpenPana}X${sangamClosePana}`, customStake);
    setSangamOpenPana('');
    setSangamClosePana('');
  };

  // PRO TOOLS: Crossing Handler
  const handleAddCrossingToSlip = () => {
    if (crossingDigits.length < 2) {
      setErrorMsg('Please select at least 2 digits for Crossing');
      return;
    }
    const generated = generateCrossingJodis(crossingDigits, crossingWithDouble);
    const requiredPoints = generated.length * customStake;
    if (totalSlipPoints + requiredPoints > availableBalance) {
      setErrorMsg(`Insufficient balance for ${generated.length} Jodis! Required: ₹${requiredPoints}, Available: ₹${availableBalance.toFixed(2)}`);
      return;
    }
    setGameType('jodi_digit');
    generated.forEach((j) => {
      addItemToSlip(j, customStake);
    });
    setSuccessMsg(`Added ${generated.length} Crossing Jodis to slip!`);
  };

  // PRO TOOLS: Family Jodi Handler
  const handleAddFamilyToSlip = () => {
    if (!/^[0-9]{2}$/.test(familyBaseJodi)) {
      setErrorMsg('Enter valid 2-digit base Jodi for Family (e.g. 24)');
      return;
    }
    const family = generateFamilyJodis(familyBaseJodi);
    const requiredPoints = family.length * customStake;
    if (totalSlipPoints + requiredPoints > availableBalance) {
      setErrorMsg(`Insufficient balance for ${family.length} Family Jodis! Required: ₹${requiredPoints}, Available: ₹${availableBalance.toFixed(2)}`);
      return;
    }
    setGameType('jodi_digit');
    family.forEach((j) => {
      addItemToSlip(j, customStake);
    });
    setSuccessMsg(`Added ${family.length} Family Jodis (${family.join(', ')}) to slip!`);
  };

  // Submit all bids in slip
  const handleSubmitBids = () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (slip.length === 0) {
      setErrorMsg('Your bid slip is empty! Add at least one selection.');
      return;
    }

    setIsSubmitting(true);
    const result = placeBets(market.id, gameType, session, slip);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMsg(result.message);
      setSlip([]);
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-gradient-to-b from-[#0a172e] via-[#0d1e3d] to-[#071120] border border-amber-500/40 rounded-2xl shadow-2xl text-slate-100 max-h-[92vh] flex flex-col z-10 animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#0d2146] via-[#122b5c] to-[#0d2146] border-b border-amber-500/20 rounded-t-2xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                Real Bet Engine
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-100 tracking-wide mt-0.5">
              {market.name} {market.hindiName && `(${market.hindiName})`}
            </h3>
            <p className="text-xs text-slate-400">
              Open: {market.opens} • Close: {market.closes} • Live Result: {market.result_text || '*** - ** - ***'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance & Session Strip */}
        <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          {/* User Balance */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Available Points</span>
              <div className="text-xs sm:text-sm font-extrabold text-amber-300">
                ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Session Selector (OPEN vs CLOSE) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSession('OPEN')}
              disabled={Boolean(market.open_pana)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                session === 'OPEN'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:hover:text-slate-400'
              }`}
            >
              OPEN {market.open_pana ? '(Closed)' : ''}
            </button>
            <button
              onClick={() => setSession('CLOSE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                session === 'CLOSE'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CLOSE
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
          {/* Top Bidding Mode Switcher (Standard vs Pro Tools) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setBiddingMode('standard')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                biddingMode === 'standard'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🎯 Standard</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBiddingMode('crossing');
                setGameType('jodi_digit');
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                biddingMode === 'crossing'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                  : 'text-amber-300/80 hover:text-amber-200 bg-amber-500/10'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Crossing</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBiddingMode('family');
                setGameType('jodi_digit');
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                biddingMode === 'family'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                  : 'text-amber-300/80 hover:text-amber-200 bg-amber-500/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Family Jodi</span>
            </button>
          </div>

          {/* STANDARD GAME MODE SELECTOR */}
          {biddingMode === 'standard' && (
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Select Game Mode
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {(
                  [
                    'single_digit',
                    'jodi_digit',
                    'single_pana',
                    'double_pana',
                    'triple_pana',
                    'half_sangam',
                    'full_sangam',
                  ] as GameType[]
                ).map((type) => {
                  const r = GAME_RATES[type];
                  const active = gameType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setGameType(type);
                        setSlip([]);
                        setErrorMsg('');
                      }}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        active
                          ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/30 border-amber-400 text-amber-200 shadow-md'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-bold truncate">{r.title}</div>
                      <div className="text-[10px] text-amber-400 font-extrabold">{r.rateLabel}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CROSSING TOOL UI */}
          {biddingMode === 'crossing' && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" /> Pro Crossing Generator
                </span>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={crossingWithDouble}
                    onChange={(e) => setCrossingWithDouble(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>With Doubles (11, 22...)</span>
                </label>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">
                  Tap digits to cross (Selected: {crossingDigits.join(', ') || 'None'}):
                </span>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => {
                    const isSelected = crossingDigits.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setCrossingDigits((prev) =>
                            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                          );
                        }}
                        className={`py-2 rounded-xl font-mono font-black text-sm border transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-105'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {crossingDigits.length >= 2 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Generated: <strong className="text-amber-300">{generateCrossingJodis(crossingDigits, crossingWithDouble).length} Jodis</strong>
                    </span>
                    <span className="text-emerald-400 font-bold">
                      Total Stake: ₹{generateCrossingJodis(crossingDigits, crossingWithDouble).length * customStake}
                    </span>
                  </div>
                  <div className="max-h-20 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap gap-1 text-[11px] font-mono text-amber-300">
                    {generateCrossingJodis(crossingDigits, crossingWithDouble).map((j) => (
                      <span key={j} className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800">
                        {j}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCrossingToSlip}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      Add All {generateCrossingJodis(crossingDigits, crossingWithDouble).length} Crossing Jodis to Slip (₹{generateCrossingJodis(crossingDigits, crossingWithDouble).length * customStake})
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* FAMILY JODI TOOL UI */}
          {biddingMode === 'family' && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-3">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" /> Pro Family / Cut Jodi Generator
              </span>
              <p className="text-[11px] text-slate-400">
                Matka Cut Formula: 1=6, 2=7, 3=8, 4=9, 5=0. Enter any Jodi to generate its complete 8-Jodi family instantly.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={2}
                  value={familyBaseJodi}
                  onChange={(e) => setFamilyBaseJodi(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Base Jodi (e.g. 24)"
                  className="w-36 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-lg font-mono font-black text-amber-300 text-center tracking-widest focus:border-amber-400 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddFamilyToSlip}
                  className="flex-1 py-2 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    Add Full Family ({generateFamilyJodis(familyBaseJodi).length} Jodis • ₹{generateFamilyJodis(familyBaseJodi).length * customStake})
                  </span>
                </button>
              </div>

              {familyBaseJodi.length === 2 && (
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap gap-1.5">
                  {generateFamilyJodis(familyBaseJodi).map((j) => (
                    <span key={j} className="px-2 py-1 bg-slate-900 rounded-lg border border-slate-700 text-xs font-mono font-black text-amber-300">
                      {j}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rate & Multiplier Info Banner */}
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
            <span className="text-amber-200">
              <strong>{rate.title} Rate:</strong> {rate.rateLabel} (Payout {rate.multiplier}x)
            </span>
            <span className="text-slate-400 text-[11px]">{rate.description}</span>
          </div>

          {/* Quick Stake Chip Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select Points / Stake (₹)
              </span>
              <span className="text-xs font-bold text-amber-400">Selected: ₹{customStake}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setCustomStake(chip)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all active:scale-95 ${
                    customStake === chip
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  ₹{chip}
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="100000"
                value={customStake}
                onChange={(e) => setCustomStake(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 px-2 py-1 text-xs font-bold bg-slate-950 border border-slate-700 rounded-lg text-amber-300 text-center focus:border-amber-400 outline-none"
                placeholder="Custom"
              />
            </div>
          </div>

          {/* GAME SELECTION INPUTS BASED ON TYPE */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            {/* 1. SINGLE DIGIT (0 to 9 Quick Buttons) */}
            {gameType === 'single_digit' && (
              <div>
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  Tap any Single Digit (0-9) to add ₹{customStake} to slip:
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                    <button
                      key={digit}
                      onClick={() => handleAddDigit(digit)}
                      className="py-3 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 font-black text-lg transition-transform active:scale-95 shadow-md hover:bg-slate-700"
                    >
                      {digit}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. JODI DIGIT (00 to 99) */}
            {gameType === 'jodi_digit' && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 block">
                  Enter 2-digit Jodi (00 to 99) for Open+Close session:
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={2}
                    value={jodiInput}
                    onChange={(e) => setJodiInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 24, 78, 05"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-base font-black text-amber-300 placeholder:text-slate-600 focus:border-amber-400 outline-none text-center tracking-widest"
                  />
                  <button
                    onClick={handleAddJodi}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Bid
                  </button>
                </div>
              </div>
            )}

            {/* 3. SINGLE PANA or DOUBLE PANA */}
            {(gameType === 'single_pana' || gameType === 'double_pana') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Enter 3-Digit Pana ({gameType === 'single_pana' ? 'Single Pana' : 'Double Pana'}):
                  </span>
                  {panaInput.length === 3 && (
                    <span className="text-xs font-black text-amber-400">
                      Ank: {calculateAnkFromPana(panaInput)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={3}
                    value={panaInput}
                    onChange={(e) => setPanaInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 139, 248, 188"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-base font-black text-amber-300 placeholder:text-slate-600 focus:border-amber-400 outline-none text-center tracking-widest"
                  />
                  <button
                    onClick={handleAddPana}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Pana
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Must follow standard 220 Pana chart order (1234567890). Example: 139 is valid, 193 is not.
                </p>
              </div>
            )}

            {/* 4. TRIPLE PANA */}
            {gameType === 'triple_pana' && (
              <div>
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  Select any Triple Pana (Rate: 10 ka 7,000):
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {TRIPLE_PANAS.map((tp) => (
                    <button
                      key={tp}
                      onClick={() => addItemToSlip(tp, customStake)}
                      className="py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-400 text-amber-300 font-mono font-bold text-sm transition-all active:scale-95 shadow-md"
                    >
                      {tp}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 5. HALF SANGAM */}
            {gameType === 'half_sangam' && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 block">
                  Half Sangam: Open Pana (3 digits) + Close Ank (1 digit)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    maxLength={3}
                    value={sangamOpenPana}
                    onChange={(e) => setSangamOpenPana(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Open Pana (e.g. 139)"
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 text-center"
                  />
                  <input
                    type="text"
                    maxLength={1}
                    value={sangamCloseAnk}
                    onChange={(e) => setSangamCloseAnk(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Close Ank (e.g. 4)"
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 text-center"
                  />
                </div>
                <button
                  onClick={handleAddHalfSangam}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Half Sangam (₹{customStake})
                </button>
              </div>
            )}

            {/* 6. FULL SANGAM */}
            {gameType === 'full_sangam' && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 block">
                  Full Sangam: Open Pana (3 digits) + Close Pana (3 digits)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    maxLength={3}
                    value={sangamOpenPana}
                    onChange={(e) => setSangamOpenPana(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Open Pana (e.g. 139)"
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 text-center"
                  />
                  <input
                    type="text"
                    maxLength={3}
                    value={sangamClosePana}
                    onChange={(e) => setSangamClosePana(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Close Pana (e.g. 248)"
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 text-center"
                  />
                </div>
                <button
                  onClick={handleAddFullSangam}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Full Sangam (₹{customStake})
                </button>
              </div>
            )}
          </div>

          {/* ACTIVE BID SLIP TABLE */}
          {slip.length > 0 && (
            <div className="rounded-2xl bg-slate-950 border border-amber-500/30 overflow-hidden shadow-lg">
              <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" /> Current Bid Slip ({slip.length})
                </span>
                <button
                  onClick={clearSlip}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-bold"
                >
                  Clear All
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/80">
                {slip.map((item, idx) => (
                  <div key={idx} className="px-3 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        {item.number}
                      </span>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {rate.title} ({session})
                        </span>
                        <div className="text-[11px] font-bold text-slate-200">
                          Stake: ₹{item.points}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400">Potential Win</span>
                        <div className="text-xs font-black text-emerald-400">
                          ₹{Math.round(item.points * rate.multiplier).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-950 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Stake</span>
                  <div className="text-base font-black text-amber-300">
                    ₹{totalSlipPoints.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Max Potential Payout</span>
                  <div className="text-base font-black text-emerald-400">
                    ₹{slip.reduce((sum, item) => sum + Math.round(item.points * rate.multiplier), 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer / Confirm Button */}
        <div className="p-3.5 sm:p-4 bg-slate-900/90 border-t border-amber-500/20 rounded-b-2xl flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Cancel
          </button>

          {slip.length > 0 ? (
            <button
              onClick={handleSubmitBids}
              disabled={isSubmitting || totalSlipPoints > availableBalance}
              className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                totalSlipPoints > availableBalance
                  ? 'bg-rose-600 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 hover:brightness-110 shadow-amber-500/30'
              }`}
            >
              {totalSlipPoints > availableBalance ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Insufficient Balance (Add Cash)</span>
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  <span>
                    Place {slip.length} Bid(s) • Deduct ₹{totalSlipPoints}
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                setActiveScreen('wallet');
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors"
            >
              <Wallet className="w-4 h-4" />
              <span>Add Cash to Wallet</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
