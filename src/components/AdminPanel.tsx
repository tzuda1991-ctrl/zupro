import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { isValidPana, calculateAnkFromPana, calculateLoadSheet } from '../utils/matka';
import {
  ShieldAlert,
  Trophy,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Plus,
  Coins,
  FileCheck,
  Users,
  Megaphone,
  BarChart3,
  TrendingUp,
  Zap,
  Lock,
  Unlock,
  QrCode,
  Check,
  Percent,
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const {
    markets,
    bets,
    user,
    paymentRequests,
    withdrawalRequests,
    starlineMarkets,
    upiConfigs,
    flashNotice,
    usersList,
    adminApproveDeposit,
    adminRejectDeposit,
    adminCompleteWithdrawal,
    adminRejectWithdrawal,
    adminDeclareResult,
    adminDeclareStarlineResult,
    adminAddMarket,
    adminToggleMarketStatus,
    adminToggleUserStatus,
    adminAdjustUserBalance,
    adminSetActiveUpi,
    adminAddUpi,
    adminUpdateFlashNotice,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'declare' | 'loadsheet' | 'users' | 'deposits' | 'withdrawals' | 'upi' | 'notice' | 'reports' | 'markets'
  >('declare');

  // Declare Result states (Normal Market)
  const [selectedMarketId, setSelectedMarketId] = useState<number>(markets[0]?.id || 1);
  const [declareDate, setDeclareDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [phase, setPhase] = useState<'open' | 'close'>('open');
  const [panaInput, setPanaInput] = useState<string>('');
  const [declareResultMsg, setDeclareResultMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Starline Declare states
  const [starlineSlotId, setStarlineSlotId] = useState<string>(starlineMarkets[0]?.id || 'sl_10');
  const [starlinePanaInput, setStarlinePanaInput] = useState<string>('');
  const [starlineMsg, setStarlineMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load Sheet session
  const [loadSheetSession, setLoadSheetSession] = useState<'OPEN' | 'CLOSE'>('OPEN');

  // User Adjustment Modal states
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustNote, setAdjustNote] = useState<string>('');

  // Add UPI Form states
  const [newUpiId, setNewUpiId] = useState<string>('');
  const [newUpiTitle, setNewUpiTitle] = useState<string>('');
  const [newUpiBank, setNewUpiBank] = useState<string>('');
  const [newUpiHolder, setNewUpiHolder] = useState<string>('STAR777 ENTERTAINMENT');

  // Flash Notice Form states
  const [noticeForm, setNoticeForm] = useState(flashNotice);
  const [noticeSaved, setNoticeSaved] = useState<boolean>(false);

  // Market creation Form states
  const [newMarketName, setNewMarketName] = useState<string>('');
  const [newMarketHindi, setNewMarketHindi] = useState<string>('');
  const [newOpens, setNewOpens] = useState<string>('10:00 AM');
  const [newCloses, setNewCloses] = useState<string>('12:00 PM');

  // Payout Reference modal
  const [payoutModalId, setPayoutModalId] = useState<string | null>(null);
  const [payoutRefInput, setPayoutRefInput] = useState<string>('');

  const pendingDeposits = paymentRequests.filter((p) => p.status === 'pending');
  const pendingWithdrawals = withdrawalRequests.filter((w) => w.status === 'pending');

  const totalBetsVolume = bets.reduce((sum, b) => sum + b.points, 0);
  const totalPayoutVolume = bets
    .filter((b) => b.status === 'won')
    .reduce((sum, b) => sum + (b.winAmount || b.potentialWin), 0);
  const grossMargin = totalBetsVolume - totalPayoutVolume;
  const grossMarginPct = totalBetsVolume > 0 ? ((grossMargin / totalBetsVolume) * 100).toFixed(1) : '100.0';

  const totalDepositedAll = paymentRequests
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalWithdrawnAll = withdrawalRequests
    .filter((w) => w.status === 'completed')
    .reduce((sum, w) => sum + w.amount, 0);

  // Load Sheet Calculation for selected market
  const marketBets = bets.filter((b) => b.marketId === selectedMarketId);
  const loadSheet = calculateLoadSheet(marketBets, loadSheetSession, 9.5);

  const handleDeclareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDeclareResultMsg(null);

    if (!isValidPana(panaInput)) {
      setDeclareResultMsg({
        text: 'Invalid Pana format! Pana must be 3 digits sorted in Matka order (e.g. 139, 248, 777).',
        type: 'error',
      });
      return;
    }

    const res = adminDeclareResult(selectedMarketId, declareDate, phase, panaInput);
    if (res.success) {
      setDeclareResultMsg({ text: res.message, type: 'success' });
      setPanaInput('');
    } else {
      setDeclareResultMsg({ text: res.message, type: 'error' });
    }
  };

  const handleStarlineDeclare = (e: React.FormEvent) => {
    e.preventDefault();
    setStarlineMsg(null);
    const res = adminDeclareStarlineResult(starlineSlotId, starlinePanaInput);
    if (res.success) {
      setStarlineMsg({ text: res.message, type: 'success' });
      setStarlinePanaInput('');
    } else {
      setStarlineMsg({ text: res.message, type: 'error' });
    }
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUserId) return;
    const finalAmount = adjustType === 'credit' ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);
    adminAdjustUserBalance(adjustUserId, finalAmount, adjustNote);
    setAdjustUserId(null);
    setAdjustNote('');
  };

  const handleAddUpiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpiId.trim()) return;
    adminAddUpi({
      upiId: newUpiId.trim(),
      title: newUpiTitle.trim() || 'UPI Gateway',
      bankName: newUpiBank.trim() || 'Payment Bank',
      accountHolder: newUpiHolder.trim() || 'STAR777 ENTERTAINMENT',
      isActive: false,
    });
    setNewUpiId('');
    setNewUpiTitle('');
    setNewUpiBank('');
  };

  const handleNoticeSave = (e: React.FormEvent) => {
    e.preventDefault();
    adminUpdateFlashNotice(noticeForm);
    setNoticeSaved(true);
    setTimeout(() => setNoticeSaved(false), 2500);
  };

  const selectedMarketObj = markets.find((m) => m.id === selectedMarketId);

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-24 text-slate-100">
      {/* Top Admin Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#170a24] via-[#240e38] to-[#0f1428] border border-amber-500/30 shadow-2xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 shadow-lg flex items-center justify-center">
            <div className="w-full h-full bg-[#10091d] rounded-[14px] flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
                Operator Master Console
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                SUPER ADMIN
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5">
              STAR777 Control Center
            </h2>
            <p className="text-xs text-slate-300">
              Live Load Sheet, Users Manager, Multi-UPI Rotation, Results & Financial Analytics
            </p>
          </div>
        </div>
      </div>

      {/* KPI Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-400" /> Total Bets Volume
          </span>
          <div className="text-lg font-black text-amber-300 mt-1">
            ₹{totalBetsVolume.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500">{bets.length} Total Slips</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-emerald-400" /> Total Winnings Paid
          </span>
          <div className="text-lg font-black text-emerald-400 mt-1">
            ₹{totalPayoutVolume.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500">Auto Settled</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-400" /> Pending Deposits
          </span>
          <div className="text-lg font-black text-amber-300 mt-1">
            {pendingDeposits.length} Requests
          </div>
          <span className="text-[10px] text-slate-500">Awaiting UTR check</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <ArrowUpCircle className="w-3.5 h-3.5 text-sky-400" /> Pending Payouts
          </span>
          <div className="text-lg font-black text-sky-400 mt-1">
            {pendingWithdrawals.length} Requests
          </div>
          <span className="text-[10px] text-slate-500">Awaiting Bank Transfer</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'declare' as const, label: '🏆 Declare Result', count: null },
          { id: 'loadsheet' as const, label: '📊 Live Load Sheet', count: null },
          { id: 'users' as const, label: '👥 Users Manager', count: usersList.length },
          { id: 'deposits' as const, label: '💰 Deposits', count: pendingDeposits.length },
          { id: 'withdrawals' as const, label: '🏧 Withdrawals', count: pendingWithdrawals.length },
          { id: 'upi' as const, label: '🔄 UPI Rotation', count: upiConfigs.length },
          { id: 'notice' as const, label: '📢 Flash Notice', count: null },
          { id: 'reports' as const, label: '📈 P&L Reports', count: null },
          { id: 'markets' as const, label: '⚙️ Markets', count: null },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === t.id
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>{t.label}</span>
            {t.count !== null && t.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-rose-600 text-white font-black animate-pulse">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: DECLARE RESULT & AUTO-SETTLE ENGINE */}
      {activeTab === 'declare' && (
        <div className="space-y-4">
          {/* Normal Market Result Declarer */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> Regular Markets Result Declarer
            </h3>

            <form onSubmit={handleDeclareSubmit} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Select Market:</label>
                  <select
                    value={selectedMarketId}
                    onChange={(e) => setSelectedMarketId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 focus:border-amber-400 outline-none"
                  >
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.opens} - {m.closes})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Result Date:</label>
                  <input
                    type="date"
                    value={declareDate}
                    onChange={(e) => setDeclareDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Session Phase:</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPhase('open')}
                      className={`py-1 rounded-lg text-xs font-bold transition-all ${
                        phase === 'open'
                          ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Open Pana
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhase('close')}
                      className={`py-1 rounded-lg text-xs font-bold transition-all ${
                        phase === 'close'
                          ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Close Pana
                    </button>
                  </div>
                </div>
              </div>

              {/* Pana Input & Live Ank calculation */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-xs text-slate-300 block mb-1 font-bold">
                    Enter 3-Digit Pana ({phase.toUpperCase()}):
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={panaInput}
                    onChange={(e) => setPanaInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 139, 248, 777"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-lg font-mono font-black text-amber-300 text-center tracking-widest focus:border-amber-400 outline-none"
                  />
                </div>

                <div className="text-center bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Calculated Ank</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {panaInput.length === 3 && isValidPana(panaInput) ? calculateAnkFromPana(panaInput) : '*'}
                  </span>
                </div>

                <div className="text-right bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Result</span>
                  <span className="text-xs font-black text-amber-300 font-mono">
                    {selectedMarketObj?.result_text || '*** - ** - ***'}
                  </span>
                </div>
              </div>

              {declareResultMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    declareResultMsg.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {declareResultMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{declareResultMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                <span>Publish {phase.toUpperCase()} Result & Auto-Settle All Bids</span>
              </button>
            </form>
          </div>

          {/* Starline Result Declarer */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-3">
            <h3 className="text-sm font-black text-purple-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" /> Starline Hourly Slot Declarer
            </h3>
            <form onSubmit={handleStarlineDeclare} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={starlineSlotId}
                onChange={(e) => setStarlineSlotId(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-amber-300"
              >
                {starlineMarkets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.timeLabel} ({s.status}) - {s.result_text || '***-*'}
                  </option>
                ))}
              </select>

              <input
                type="text"
                maxLength={3}
                value={starlinePanaInput}
                onChange={(e) => setStarlinePanaInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="3-Digit Pana (e.g. 139)"
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-300 text-center tracking-widest"
              />

              <button
                type="submit"
                className="py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95"
              >
                Publish Starline & Settle
              </button>
            </form>
            {starlineMsg && (
              <p className={`text-xs ${starlineMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {starlineMsg.text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE LOAD SHEET & RISK EXPOSURE (Admin Feature 1) */}
      {activeTab === 'loadsheet' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" /> Live Market Load Sheet & Risk Exposure
              </h3>
              <p className="text-xs text-slate-400">
                Check exact stake on each number and calculate net house profit before declaring result
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedMarketId}
                onChange={(e) => setSelectedMarketId(Number(e.target.value))}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-amber-300"
              >
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setLoadSheetSession('OPEN')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    loadSheetSession === 'OPEN' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'
                  }`}
                >
                  OPEN
                </button>
                <button
                  onClick={() => setLoadSheetSession('CLOSE')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    loadSheetSession === 'CLOSE' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'
                  }`}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>

          {/* Market Pool Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Market Stake Pool</span>
              <span className="text-base font-black text-amber-300">₹{loadSheet.totalPool.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Single Bets</span>
              <span className="text-base font-black text-slate-200">
                {loadSheet.digits.reduce((s, d) => s + d.totalBets, 0)} Bids
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Single Stake Sum</span>
              <span className="text-base font-black text-slate-200">
                ₹{loadSheet.digits.reduce((s, d) => s + d.totalStake, 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Digit Load Matrix (0 to 9) */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Single Digit Load (0 to 9) & House Profit if Opened:
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="p-2.5">Digit</th>
                    <th className="p-2.5">Total Bids</th>
                    <th className="p-2.5">Total Stake (₹)</th>
                    <th className="p-2.5">Payout Liability (₹)</th>
                    <th className="p-2.5">Net House Profit (₹)</th>
                    <th className="p-2.5 text-right">Risk Tag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                  {loadSheet.digits.map((d) => (
                    <tr
                      key={d.digit}
                      className={
                        d.isHighestRisk
                          ? 'bg-rose-950/30'
                          : d.isSafest && d.totalStake > 0
                          ? 'bg-emerald-950/30'
                          : 'hover:bg-slate-800/40'
                      }
                    >
                      <td className="p-2.5 font-mono font-black text-base text-amber-300">{d.digit}</td>
                      <td className="p-2.5 font-semibold text-slate-300">{d.totalBets}</td>
                      <td className="p-2.5 font-black text-slate-100">₹{d.totalStake.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 font-mono text-rose-400 font-bold">₹{d.potentialPayout.toLocaleString('en-IN')}</td>
                      <td
                        className={`p-2.5 font-black ${
                          d.netHouseProfit >= 0 ? 'text-emerald-400' : 'text-rose-400 font-black'
                        }`}
                      >
                        {d.netHouseProfit >= 0 ? '+' : ''}₹{d.netHouseProfit.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-right">
                        {d.isHighestRisk && d.totalStake > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            Highest Risk
                          </span>
                        )}
                        {d.isSafest && d.totalStake > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Most Profitable
                          </span>
                        )}
                        {!d.isHighestRisk && !d.isSafest && <span className="text-slate-500">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Jodis Load */}
          {loadSheet.topJodis.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Top Heavy Jodis Placed:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {loadSheet.topJodis.map((j) => (
                  <div key={j.jodi} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="font-mono text-base font-black text-amber-300 block">{j.jodi}</span>
                    <span className="text-xs font-bold text-slate-200">₹{j.points}</span>
                    <span className="text-[10px] text-slate-500 block">({j.count} bids)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT & BALANCE EDITOR (Admin Feature 2) */}
      {activeTab === 'users' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" /> User Accounts & Balance Editor
              </h3>
              <p className="text-xs text-slate-400">
                View all registered players, block/unblock, and credit or debit wallet balance directly
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Wallet Balance</th>
                  <th className="p-3">Deposited</th>
                  <th className="p-3">Withdrawn</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-100">
                      {u.username}
                      <span className="block text-[10px] text-slate-500 font-mono">#{u.id}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">+91 {u.mobile}</td>
                    <td className="p-3 font-black text-amber-300 text-sm">
                      ₹{u.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-emerald-400 font-semibold">₹{(u.totalDeposited || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-sky-400 font-semibold">₹{(u.totalWithdrawn || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setAdjustUserId(u.id);
                            setAdjustAmount(500);
                          }}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg shadow-sm transition-transform active:scale-95"
                        >
                          ± Balance
                        </button>

                        <button
                          onClick={() => adminToggleUserStatus(u.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            u.status === 'active'
                              ? 'border-rose-500/40 text-rose-400 hover:bg-rose-500/20'
                              : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                          title={u.status === 'active' ? 'Block Player' : 'Unblock Player'}
                        >
                          {u.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DEPOSIT APPROVAL QUEUE */}
      {activeTab === 'deposits' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-emerald-400" /> Pending Deposit Requests ({pendingDeposits.length})
          </h3>

          {paymentRequests.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No deposit requests recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                    <th className="py-2.5">User</th>
                    <th className="py-2.5">Method</th>
                    <th className="py-2.5">Amount</th>
                    <th className="py-2.5">UTR / Ref</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {paymentRequests.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 font-semibold text-slate-100">
                        {p.username}
                        <span className="block text-[10px] text-slate-500">#{p.userId}</span>
                      </td>
                      <td className="py-3 uppercase text-slate-400 font-bold">{p.method}</td>
                      <td className="py-3 font-black text-emerald-400 text-sm">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 font-mono text-amber-300 font-bold">{p.utr}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : p.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {p.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => adminApproveDeposit(p.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow-sm transition-transform active:scale-95"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => adminRejectDeposit(p.id, 'UTR not found in bank statement')}
                              className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[11px] rounded-lg transition-transform active:scale-95"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: WITHDRAWAL QUEUE */}
      {activeTab === 'withdrawals' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-sky-400" /> Pending Withdrawal Payouts ({pendingWithdrawals.length})
          </h3>

          {withdrawalRequests.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No withdrawal requests recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                    <th className="py-2.5">User</th>
                    <th className="py-2.5">Amount</th>
                    <th className="py-2.5">Method</th>
                    <th className="py-2.5">Payout Details</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {withdrawalRequests.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-800/40">
                      <td className="py-3 font-semibold text-slate-100">
                        {w.username}
                        <span className="block text-[10px] text-slate-500">#{w.userId}</span>
                      </td>
                      <td className="py-3 font-black text-amber-300 text-sm">
                        ₹{w.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 uppercase text-slate-400 font-bold">{w.method}</td>
                      <td className="py-3 max-w-xs font-mono text-slate-300 text-[11px]">
                        {w.payoutDetails}
                      </td>
                      <td className="py-3">
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
                      <td className="py-3 text-right">
                        {w.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setPayoutModalId(w.id);
                                setPayoutRefInput(`IMPS-${Date.now().toString().slice(-8)}`);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow-sm transition-transform active:scale-95"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => adminRejectWithdrawal(w.id, 'Invalid bank details')}
                              className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[11px] rounded-lg transition-transform active:scale-95"
                            >
                              Reject & Refund
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono text-[10px] text-slate-400">
                            {w.payoutReference || '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: MULTI-UPI ROTATION (Admin Feature 3) */}
      {activeTab === 'upi' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-400" /> Multiple UPI Accounts Rotation
              </h3>
              <p className="text-xs text-slate-400">
                Rotate your UPI IDs to prevent bank transaction limits. The active account will appear on the player deposit screen.
              </p>
            </div>

            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              {upiConfigs.map((u) => (
                <div key={u.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-amber-300">{u.upiId}</span>
                      {u.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> ACTIVE RECEIVER
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {u.title} • {u.bankName} ({u.accountHolder})
                    </p>
                  </div>

                  {!u.isActive && (
                    <button
                      onClick={() => adminSetActiveUpi(u.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 transition-colors"
                    >
                      Set as Active
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add New UPI Form */}
            <form onSubmit={handleAddUpiSubmit} className="pt-2 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                + Add Another Backup UPI ID
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="UPI ID (e.g. mobile@paytm)"
                  value={newUpiId}
                  onChange={(e) => setNewUpiId(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-amber-300 focus:border-amber-400 outline-none"
                />
                <input
                  type="text"
                  placeholder="Label / Title (e.g. Paytm QR)"
                  value={newUpiTitle}
                  onChange={(e) => setNewUpiTitle(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-amber-400 outline-none"
                />
                <input
                  type="text"
                  placeholder="Bank Name (e.g. Paytm Bank)"
                  value={newUpiBank}
                  onChange={(e) => setNewUpiBank(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-amber-400 outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
              >
                + Add UPI Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 7: FLASH NOTICE & BROADCAST (Admin Feature 4) */}
      {activeTab === 'notice' && (
        <form onSubmit={handleNoticeSave} className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-400" /> Flash Notice & Marquee Ticker Broadcast
            </h3>
            <p className="text-xs text-slate-400">
              Update announcements and WhatsApp support numbers instantly visible to all players
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1 font-semibold">Home Marquee Running Ticker:</label>
            <input
              type="text"
              required
              value={noticeForm.tickerText}
              onChange={(e) => setNoticeForm({ ...noticeForm, tickerText: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-300 font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">Banner Heading:</label>
              <input
                type="text"
                value={noticeForm.bannerTitle}
                onChange={(e) => setNoticeForm({ ...noticeForm, bannerTitle: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">WhatsApp Support Number (without +):</label>
              <input
                type="text"
                value={noticeForm.whatsappNumber}
                onChange={(e) => setNoticeForm({ ...noticeForm, whatsappNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1 font-semibold">Banner Announcement Text:</label>
            <textarea
              rows={3}
              value={noticeForm.bannerMessage}
              onChange={(e) => setNoticeForm({ ...noticeForm, bannerMessage: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200"
            />
          </div>

          {noticeSaved && (
            <p className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Announcements and support contacts updated!
            </p>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            Save & Publish Notice
          </button>
        </form>
      )}

      {/* TAB 8: FINANCIAL P&L REPORTS (Admin Feature 5) */}
      {activeTab === 'reports' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" /> Financial Analytics & Gross Gaming Revenue (GGR)
            </h3>
            <p className="text-xs text-slate-400">
              Overview of Cash Inflows, Cash Outflows, Betting Volume, and Net Operator Margin
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Deposits (Inflow)</span>
              <span className="text-lg font-black text-emerald-400">₹{totalDepositedAll.toLocaleString('en-IN')}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-sky-500/30">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Withdrawals (Outflow)</span>
              <span className="text-lg font-black text-sky-400">₹{totalWithdrawnAll.toLocaleString('en-IN')}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Cash Retention</span>
              <span className="text-lg font-black text-amber-300">
                ₹{(totalDepositedAll - totalWithdrawnAll).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-500/30">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Operator Margin</span>
              <span className="text-lg font-black text-purple-300 flex items-center gap-1">
                <Percent className="w-4 h-4 text-purple-400" /> {grossMarginPct}%
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <h4 className="font-bold text-slate-200">Summary Statement</h4>
            <div className="flex justify-between border-b border-slate-800/80 py-1.5">
              <span className="text-slate-400">Gross Betting Turnover:</span>
              <strong className="text-slate-200">₹{totalBetsVolume.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 py-1.5">
              <span className="text-slate-400">Total Winnings Paid to Players:</span>
              <strong className="text-rose-400">-₹{totalPayoutVolume.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between py-1.5 font-bold text-sm">
              <span className="text-amber-300">Net House Gaming Revenue (GGR):</span>
              <span className={grossMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                ₹{grossMargin.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: MARKET SETTINGS & TIMINGS */}
      {activeTab === 'markets' && (
        <div className="space-y-4">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!newMarketName.trim()) return;
            adminAddMarket({
              name: newMarketName.trim().toUpperCase(),
              hindiName: newMarketHindi.trim() || undefined,
              opens: newOpens.trim(),
              closes: newCloses.trim(),
              status: 'OPEN',
              is_active: true,
            });
            setNewMarketName('');
            setNewMarketHindi('');
          }} className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-400" /> Add New Market
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                required
                placeholder="Market Name (e.g. DUBAI DAY)"
                value={newMarketName}
                onChange={(e) => setNewMarketName(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 uppercase"
              />
              <input
                type="text"
                placeholder="Hindi Name (e.g. दुबई डे)"
                value={newMarketHindi}
                onChange={(e) => setNewMarketHindi(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200"
              />
              <input
                type="text"
                required
                placeholder="Open (10:00 AM)"
                value={newOpens}
                onChange={(e) => setNewOpens(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200"
              />
              <input
                type="text"
                required
                placeholder="Close (12:00 PM)"
                value={newCloses}
                onChange={(e) => setNewCloses(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              + Create Market
            </button>
          </form>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">
              Existing Markets Control
            </h3>
            <div className="divide-y divide-slate-800/80">
              {markets.map((m) => (
                <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-100 uppercase">
                      {m.name} {m.hindiName && `(${m.hindiName})`}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Open: {m.opens} • Close: {m.closes} • Result: {m.result_text || '*** - ** - ***'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(['OPEN', 'CLOSED', 'RUNNING', 'HOLIDAY'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => adminToggleMarketStatus(m.id, status)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all ${
                          m.status === status
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Adjust User Balance Modal */}
      {adjustUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setAdjustUserId(null)} />
          <form
            onSubmit={handleAdjustSubmit}
            className="relative w-full max-w-sm bg-gradient-to-b from-[#0c1a33] to-[#071020] border border-amber-500/40 rounded-2xl shadow-2xl p-4 text-slate-100 space-y-3 animate-in zoom-in-95"
          >
            <h3 className="text-sm font-black text-amber-300">Adjust User Balance</h3>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setAdjustType('credit')}
                className={`py-1.5 rounded-lg text-xs font-bold ${
                  adjustType === 'credit' ? 'bg-emerald-600 text-white font-black' : 'text-slate-400'
                }`}
              >
                + Credit Points
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('debit')}
                className={`py-1.5 rounded-lg text-xs font-bold ${
                  adjustType === 'debit' ? 'bg-rose-600 text-white font-black' : 'text-slate-400'
                }`}
              >
                - Debit Points
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Points Amount (₹):</label>
              <input
                type="number"
                min="1"
                required
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-base font-black text-amber-300 focus:border-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Reason / Audit Note:</label>
              <input
                type="text"
                placeholder="e.g. UPI Cashback or manual deposit"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-amber-400 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustUserId(null)}
                className="px-3 py-1.5 rounded-xl text-xs bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md"
              >
                Confirm Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payout Reference Modal */}
      {payoutModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setPayoutModalId(null)} />
          <div className="relative w-full max-w-sm bg-gradient-to-b from-[#0c1a33] to-[#071020] border border-amber-500/40 rounded-2xl shadow-2xl p-4 text-slate-100 space-y-3 animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" /> Enter Bank Payout Reference
            </h3>
            <p className="text-xs text-slate-400">
              Enter the bank IMPS/UPI reference number generated by your bank statement:
            </p>
            <input
              type="text"
              value={payoutRefInput}
              onChange={(e) => setPayoutRefInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-300 focus:border-amber-400 outline-none"
              placeholder="e.g. IMPS-984029148"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayoutModalId(null)}
                className="px-3 py-1.5 rounded-xl text-xs bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  adminCompleteWithdrawal(payoutModalId, payoutRefInput.trim());
                  setPayoutModalId(null);
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
              >
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
