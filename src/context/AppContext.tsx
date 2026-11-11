import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Market,
  UserProfile,
  WalletTransaction,
  PaymentRequest,
  WithdrawalRequest,
  BetEntry,
  BetItem,
  GameType,
  SessionType,
  AppNotification,
  StarlineMarket,
  UpiConfig,
  FlashNotice,
} from '../types';
import {
  INITIAL_MARKETS,
  INITIAL_USER,
  INITIAL_TRANSACTIONS,
  INITIAL_PAYMENTS,
  INITIAL_WITHDRAWALS,
  INITIAL_BETS,
  INITIAL_USERS_LIST,
  INITIAL_STARLINE_MARKETS,
  INITIAL_UPI_CONFIGS,
  INITIAL_FLASH_NOTICE,
} from '../data/initialData';
import {
  GAME_RATES,
  calculateAnkFromPana,
  evaluateBet,
  isValidPana,
} from '../utils/matka';
import confetti from 'canvas-confetti';

interface AppContextType {
  user: UserProfile;
  markets: Market[];
  bets: BetEntry[];
  transactions: WalletTransaction[];
  paymentRequests: PaymentRequest[];
  withdrawalRequests: WithdrawalRequest[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  currentRole: 'user' | 'admin';
  selectedMarket: Market | null;
  activeScreen: 'home' | 'market' | 'wallet' | 'withdraw' | 'passbook' | 'history' | 'admin' | 'rates' | 'chart' | 'code_guide' | 'starline';
  
  // New features: Starline, Users List, Multi-UPI, Flash Notice
  starlineMarkets: StarlineMarket[];
  upiConfigs: UpiConfig[];
  activeUpi: UpiConfig;
  flashNotice: FlashNotice;
  usersList: UserProfile[];
  
  // Navigation
  setActiveScreen: (screen: 'home' | 'market' | 'wallet' | 'withdraw' | 'passbook' | 'history' | 'admin' | 'rates' | 'chart' | 'code_guide' | 'starline') => void;
  setSelectedMarket: (m: Market | null) => void;
  setCurrentRole: (role: 'user' | 'admin') => void;
  toggleRole: () => void;
  
  // Betting
  placeBets: (marketId: number, gameType: GameType, session: SessionType, items: BetItem[]) => { success: boolean; message: string };
  placeStarlineBet: (starlineId: string, gameType: 'single_digit' | 'single_pana', selection: string, points: number) => { success: boolean; message: string };
  
  // Wallet
  submitDeposit: (method: 'upi' | 'qr' | 'bank', amount: number, utr: string, proofData?: string, autoApprove?: boolean) => { success: boolean; message: string };
  submitWithdrawal: (amount: number, method: 'upi' | 'bank', payoutDetails: string) => { success: boolean; message: string };
  
  // Admin Operations
  adminApproveDeposit: (id: string) => void;
  adminRejectDeposit: (id: string, reason?: string) => void;
  adminCompleteWithdrawal: (id: string, reference: string) => void;
  adminRejectWithdrawal: (id: string, reason?: string) => void;
  adminDeclareResult: (marketId: number, date: string, phase: 'open' | 'close', pana: string) => { success: boolean; message: string; winningCount?: number; totalPayout?: number };
  adminDeclareStarlineResult: (starlineId: string, pana: string) => { success: boolean; message: string; winningCount?: number; totalPayout?: number };
  adminAddMarket: (market: Omit<Market, 'id' | 'open_pana' | 'open_ank' | 'close_pana' | 'close_ank' | 'result_text'>) => void;
  adminToggleMarketStatus: (marketId: number, status: Market['status']) => void;
  
  // Admin: User Management, UPI Rotation, Flash Notice
  adminToggleUserStatus: (userId: string) => void;
  adminAdjustUserBalance: (userId: string, amount: number, note: string) => void;
  adminSetActiveUpi: (id: string) => void;
  adminAddUpi: (config: Omit<UpiConfig, 'id'>) => void;
  adminUpdateFlashNotice: (notice: FlashNotice) => void;
  
  // Notifications & sound
  markNotificationsAsRead: () => void;
  playSound: (type: 'win' | 'bet' | 'coin') => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  USER: 'star777_user_v2',
  MARKETS: 'star777_markets_v2',
  BETS: 'star777_bets_v2',
  TRANSACTIONS: 'star777_tx_v2',
  PAYMENTS: 'star777_payments_v2',
  WITHDRAWALS: 'star777_withdrawals_v2',
  NOTIFICATIONS: 'star777_notifications_v2',
  ROLE: 'star777_role_v2',
  STARLINE: 'star777_starline_v2',
  UPI_CONFIGS: 'star777_upi_v2',
  FLASH_NOTICE: 'star777_notice_v2',
  USERS_LIST: 'star777_users_v2',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage with fallbacks
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });

  const [markets, setMarkets] = useState<Market[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MARKETS);
    return saved ? JSON.parse(saved) : INITIAL_MARKETS;
  });

  const [bets, setBets] = useState<BetEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BETS);
    return saved ? JSON.parse(saved) : INITIAL_BETS;
  });

  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });

  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WITHDRAWALS);
    return saved ? JSON.parse(saved) : INITIAL_WITHDRAWALS;
  });

  const [starlineMarkets, setStarlineMarkets] = useState<StarlineMarket[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STARLINE);
    return saved ? JSON.parse(saved) : INITIAL_STARLINE_MARKETS;
  });

  const [upiConfigs, setUpiConfigs] = useState<UpiConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.UPI_CONFIGS);
    return saved ? JSON.parse(saved) : INITIAL_UPI_CONFIGS;
  });

  const [flashNotice, setFlashNotice] = useState<FlashNotice>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FLASH_NOTICE);
    return saved ? JSON.parse(saved) : INITIAL_FLASH_NOTICE;
  });

  const [usersList, setUsersList] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
    return saved ? JSON.parse(saved) : INITIAL_USERS_LIST;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return saved ? JSON.parse(saved) : [
      {
        id: 'notif_welcome',
        title: 'Welcome to STAR777 Pro!',
        message: 'Your real-money wallet is active with ₹2,500 demo credits. Place bids or test instant deposits.',
        type: 'system',
        createdAt: new Date().toISOString(),
        read: false,
      },
    ];
  });

  const [currentRole, setCurrentRole] = useState<'user' | 'admin'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROLE);
    return (saved as 'user' | 'admin') || 'user';
  });

  const [activeScreen, setActiveScreen] = useState<'home' | 'market' | 'wallet' | 'withdraw' | 'passbook' | 'history' | 'admin' | 'rates' | 'chart' | 'code_guide' | 'starline'>('home');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MARKETS, JSON.stringify(markets));
  }, [markets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STARLINE, JSON.stringify(starlineMarkets));
  }, [starlineMarkets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.UPI_CONFIGS, JSON.stringify(upiConfigs));
  }, [upiConfigs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FLASH_NOTICE, JSON.stringify(flashNotice));
  }, [flashNotice]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(usersList));
  }, [usersList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BETS, JSON.stringify(bets));
  }, [bets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(paymentRequests));
  }, [paymentRequests]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(withdrawalRequests));
  }, [withdrawalRequests]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, currentRole);
  }, [currentRole]);

  // Sound effects using AudioContext synthesis (no external assets needed)
  const playSound = (type: 'win' | 'bet' | 'coin') => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'coin') {
        osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
        osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.15); // E6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'bet') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
      } else if (type === 'win') {
        // Arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          g.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.25);
          o.start(ctx.currentTime + idx * 0.1);
          o.stop(ctx.currentTime + idx * 0.1 + 0.25);
        });
      }
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  const toggleRole = () => {
    setCurrentRole((prev) => (prev === 'user' ? 'admin' : 'user'));
  };

  const addNotification = (title: string, message: string, type: AppNotification['type']) => {
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      type,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  // 1. PLACE BETS LOGIC
  const placeBets = (
    marketId: number,
    gameType: GameType,
    session: SessionType,
    items: BetItem[]
  ): { success: boolean; message: string } => {
    const market = markets.find((m) => m.id === marketId);
    if (!market) return { success: false, message: 'Market not found' };

    if (market.status === 'CLOSED' || market.status === 'HOLIDAY') {
      return { success: false, message: `Market is ${market.status}. Bids are closed.` };
    }

    if (items.length === 0) {
      return { success: false, message: 'Please add at least one bid.' };
    }

    const totalPoints = items.reduce((sum, item) => sum + item.points, 0);

    const availableBalance = user.walletBalance - user.frozenBalance;
    if (availableBalance < totalPoints) {
      return {
        success: false,
        message: `Insufficient balance! You need ₹${totalPoints}, but your available balance is ₹${availableBalance.toFixed(2)}.`,
      };
    }

    const rate = GAME_RATES[gameType];
    const newEntries: BetEntry[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    for (const item of items) {
      const potential = Math.round(item.points * rate.multiplier);
      newEntries.push({
        id: `bet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: user.id,
        marketId: market.id,
        marketName: market.name,
        gameType,
        session,
        selection: item.number,
        points: item.points,
        multiplier: rate.multiplier,
        potentialWin: potential,
        status: 'pending',
        entryDate: todayStr,
        createdAt: new Date().toISOString(),
      });
    }

    // Deduct user wallet
    const nextBalance = user.walletBalance - totalPoints;
    setUser((prev) => ({
      ...prev,
      walletBalance: nextBalance,
    }));

    // Create ledger transaction
    const newTx: WalletTransaction = {
      id: `tx_bet_${Date.now()}`,
      userId: user.id,
      amount: -totalPoints,
      type: 'bet_place',
      title: `${market.name} - ${rate.title}`,
      note: `${items.length} Bid(s) placed (${session} Session). Stake: ₹${totalPoints}`,
      referenceId: `BID-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      balanceAfter: nextBalance,
    };

    setTransactions((prev) => [newTx, ...prev]);
    setBets((prev) => [...newEntries, ...prev]);

    playSound('bet');
    addNotification(
      'Bids Successfully Placed! 🎯',
      `Placed ${items.length} bid(s) on ${market.name} (${rate.title}) for ₹${totalPoints}. Potential Win: ₹${items.reduce((s, x) => s + Math.round(x.points * rate.multiplier), 0)}`,
      'bet'
    );

    return {
      success: true,
      message: `Successfully placed ${items.length} bid(s) for ₹${totalPoints}!`,
    };
  };

  // 2. SUBMIT DEPOSIT (REAL WALLET ADD FUNDS)
  const submitDeposit = (
    method: 'upi' | 'qr' | 'bank',
    amount: number,
    utr: string,
    proofData?: string,
    autoApprove?: boolean
  ): { success: boolean; message: string } => {
    if (amount < 100) {
      return { success: false, message: 'Minimum deposit is ₹100' };
    }
    if (!utr || utr.trim().length < 6) {
      return { success: false, message: 'Please provide a valid UTR / Reference number' };
    }

    const cleanUtr = utr.trim().toUpperCase();
    // Check duplicate UTR
    if (paymentRequests.some((p) => p.utr === cleanUtr && p.status !== 'rejected')) {
      return { success: false, message: 'This UTR / Reference ID has already been submitted!' };
    }

    const newPayment: PaymentRequest = {
      id: `pr_${Date.now()}`,
      userId: user.id,
      username: user.username,
      userMobile: user.mobile,
      method,
      amount,
      utr: cleanUtr,
      proofData,
      status: autoApprove ? 'approved' : 'pending',
      createdAt: new Date().toISOString(),
      reviewedAt: autoApprove ? new Date().toISOString() : undefined,
      adminNote: autoApprove ? 'Instant automated verification' : undefined,
    };

    setPaymentRequests((prev) => [newPayment, ...prev]);

    if (autoApprove) {
      // Instantly credit user balance
      const nextBal = user.walletBalance + amount;
      setUser((prev) => ({ ...prev, walletBalance: nextBal }));

      const tx: WalletTransaction = {
        id: `tx_dep_${Date.now()}`,
        userId: user.id,
        amount,
        type: 'deposit',
        title: `Instant ${method.toUpperCase()} Deposit Approved`,
        note: `Funds credited via ${method.toUpperCase()} (UTR: ${cleanUtr})`,
        referenceId: `DEP-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString(),
        balanceAfter: nextBal,
      };
      setTransactions((prev) => [tx, ...prev]);
      playSound('coin');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      addNotification(
        '₹' + amount + ' Added to Wallet! 💰',
        `Your deposit of ₹${amount} with UTR ${cleanUtr} has been credited to your balance.`,
        'deposit'
      );
      return { success: true, message: `Deposit of ₹${amount} approved and credited immediately!` };
    } else {
      addNotification(
        'Deposit Request Submitted',
        `Your request for ₹${amount} (UTR: ${cleanUtr}) is submitted for verification. Admin will verify and credit your wallet.`,
        'deposit'
      );
      return {
        success: true,
        message: `Deposit request for ₹${amount} submitted! Switch to Admin Panel or wait for approval.`,
      };
    }
  };

  // 3. SUBMIT WITHDRAWAL (REAL WALLET PAYOUT)
  const submitWithdrawal = (
    amount: number,
    method: 'upi' | 'bank',
    payoutDetails: string
  ): { success: boolean; message: string } => {
    if (amount < 300) {
      return { success: false, message: 'Minimum withdrawal amount is ₹300' };
    }
    const available = user.walletBalance - user.frozenBalance;
    if (available < amount) {
      return {
        success: false,
        message: `Insufficient balance! Available for withdrawal: ₹${available.toFixed(2)} (₹${user.frozenBalance.toFixed(2)} is already on hold for pending requests).`,
      };
    }
    if (!payoutDetails || payoutDetails.trim().length < 5) {
      return { success: false, message: 'Please enter valid payout details (UPI ID or Bank A/C & IFSC)' };
    }

    // Freeze amount
    setUser((prev) => ({
      ...prev,
      frozenBalance: prev.frozenBalance + amount,
    }));

    const newWithdrawal: WithdrawalRequest = {
      id: `wd_${Date.now()}`,
      userId: user.id,
      username: user.username,
      userMobile: user.mobile,
      amount,
      method,
      payoutDetails: payoutDetails.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setWithdrawalRequests((prev) => [newWithdrawal, ...prev]);

    addNotification(
      'Withdrawal Request Placed ⏳',
      `Requested withdrawal of ₹${amount} to ${method.toUpperCase()} (${payoutDetails.trim().substring(0, 15)}...). Pending admin payout.`,
      'withdrawal'
    );

    return {
      success: true,
      message: `Withdrawal request for ₹${amount} submitted! Status is pending in Admin queue.`,
    };
  };

  // 4. ADMIN APPROVE DEPOSIT
  const adminApproveDeposit = (id: string) => {
    const req = paymentRequests.find((p) => p.id === id);
    if (!req || req.status !== 'pending') return;

    setPaymentRequests((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'approved', reviewedAt: new Date().toISOString() } : p))
    );

    // If it's the current user, update their wallet
    if (req.userId === user.id) {
      const nextBal = user.walletBalance + req.amount;
      setUser((prev) => ({ ...prev, walletBalance: nextBal }));

      const tx: WalletTransaction = {
        id: `tx_dep_${Date.now()}`,
        userId: user.id,
        amount: req.amount,
        type: 'deposit',
        title: `${req.method.toUpperCase()} Deposit Approved`,
        note: `Approved by Admin. UTR: ${req.utr}`,
        referenceId: `DEP-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString(),
        balanceAfter: nextBal,
      };
      setTransactions((prev) => [tx, ...prev]);
      playSound('coin');
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      addNotification(
        'Deposit Approved! 💰',
        `Admin approved your deposit of ₹${req.amount} (UTR: ${req.utr}). Wallet balance updated.`,
        'deposit'
      );
    }
  };

  // 5. ADMIN REJECT DEPOSIT
  const adminRejectDeposit = (id: string, reason = 'UTR did not match bank statement') => {
    const req = paymentRequests.find((p) => p.id === id);
    if (!req || req.status !== 'pending') return;

    setPaymentRequests((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: 'rejected', reviewedAt: new Date().toISOString(), adminNote: reason } : p
      )
    );

    if (req.userId === user.id) {
      addNotification(
        'Deposit Rejected',
        `Your deposit of ₹${req.amount} was rejected: ${reason}`,
        'deposit'
      );
    }
  };

  // 6. ADMIN COMPLETE WITHDRAWAL
  const adminCompleteWithdrawal = (id: string, reference: string) => {
    const req = withdrawalRequests.find((w) => w.id === id);
    if (!req || req.status !== 'pending') return;

    setWithdrawalRequests((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              status: 'completed',
              payoutReference: reference || `IMPS-${Date.now().toString().slice(-8)}`,
              reviewedAt: new Date().toISOString(),
            }
          : w
      )
    );

    if (req.userId === user.id) {
      const nextBal = user.walletBalance - req.amount;
      const nextFrozen = Math.max(0, user.frozenBalance - req.amount);
      setUser((prev) => ({
        ...prev,
        walletBalance: nextBal,
        frozenBalance: nextFrozen,
      }));

      const tx: WalletTransaction = {
        id: `tx_wd_${Date.now()}`,
        userId: user.id,
        amount: -req.amount,
        type: 'withdrawal',
        title: `Withdrawal Completed (${req.method.toUpperCase()})`,
        note: `Paid to ${req.payoutDetails}. Ref: ${reference}`,
        referenceId: reference,
        createdAt: new Date().toISOString(),
        balanceAfter: nextBal,
      };
      setTransactions((prev) => [tx, ...prev]);

      addNotification(
        'Withdrawal Transferred! 🏧',
        `₹${req.amount} has been paid to your account. Bank Ref: ${reference}`,
        'withdrawal'
      );
    }
  };

  // 7. ADMIN REJECT WITHDRAWAL
  const adminRejectWithdrawal = (id: string, reason = 'Incorrect bank details or KYC required') => {
    const req = withdrawalRequests.find((w) => w.id === id);
    if (!req || req.status !== 'pending') return;

    setWithdrawalRequests((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              status: 'rejected',
              reviewedAt: new Date().toISOString(),
              adminNote: reason,
            }
          : w
      )
    );

    if (req.userId === user.id) {
      // Release frozen balance back
      setUser((prev) => ({
        ...prev,
        frozenBalance: Math.max(0, prev.frozenBalance - req.amount),
      }));

      addNotification(
        'Withdrawal Rejected & Refunded',
        `Withdrawal of ₹${req.amount} was rejected: ${reason}. Points released back to your available balance.`,
        'withdrawal'
      );
    }
  };

  // 8. ADMIN DECLARE RESULT & AUTO-SETTLE ALL BETS
  const adminDeclareResult = (
    marketId: number,
    date: string,
    phase: 'open' | 'close',
    pana: string
  ): { success: boolean; message: string; winningCount?: number; totalPayout?: number } => {
    if (!isValidPana(pana)) {
      return { success: false, message: 'Invalid Pana format! Pana must be 3 digits in Matka order (e.g. 139, 248, 777).' };
    }

    const market = markets.find((m) => m.id === marketId);
    if (!market) return { success: false, message: 'Market not found' };

    const ank = calculateAnkFromPana(pana);

    let updatedOpenPana = market.open_pana;
    let updatedOpenAnk = market.open_ank;
    let updatedClosePana = market.close_pana;
    let updatedCloseAnk = market.close_ank;

    if (phase === 'open') {
      updatedOpenPana = pana;
      updatedOpenAnk = ank;
    } else {
      if (!updatedOpenPana) {
        return { success: false, message: 'Please publish Open Pana before publishing Close Pana!' };
      }
      updatedClosePana = pana;
      updatedCloseAnk = ank;
    }

    // Format new result string
    const fullResultText = `${updatedOpenPana || '***'} - ${updatedOpenAnk || '*'}${updatedCloseAnk || '*'} - ${updatedClosePana || '***'}`;

    // Update market in state
    setMarkets((prev) =>
      prev.map((m) =>
        m.id === marketId
          ? {
              ...m,
              open_pana: updatedOpenPana,
              open_ank: updatedOpenAnk,
              close_pana: updatedClosePana,
              close_ank: updatedCloseAnk,
              result_text: fullResultText,
            }
          : m
      )
    );

    // AUTO-SETTLEMENT ENGINE
    let winningCount = 0;
    let totalPayout = 0;
    const nowIso = new Date().toISOString();

    const updatedBets = bets.map((bet) => {
      if (bet.marketId !== marketId || bet.status !== 'pending') {
        return bet;
      }

      // If declaring Open result, check if this bet can be settled
      if (phase === 'open') {
        // Can settle Open Single Digit, Open Pana
        if (bet.session === 'OPEN' && (bet.gameType === 'single_digit' || bet.gameType === 'single_pana' || bet.gameType === 'double_pana' || bet.gameType === 'triple_pana')) {
          const evalResult = evaluateBet(bet.gameType, 'OPEN', bet.selection, updatedOpenPana, updatedClosePana);
          if (evalResult.settled) {
            if (evalResult.won) {
              winningCount++;
              totalPayout += bet.potentialWin;
              return {
                ...bet,
                status: 'won' as const,
                winAmount: bet.potentialWin,
                settledAt: nowIso,
              };
            } else {
              return {
                ...bet,
                status: 'lost' as const,
                settledAt: nowIso,
              };
            }
          }
        }
      } else {
        // Phase is 'close' -> Settle ALL remaining pending bets for this market (Close Single Digit, Close Pana, Jodi, Sangams)
        const evalResult = evaluateBet(bet.gameType, bet.session, bet.selection, updatedOpenPana, updatedClosePana);
        if (evalResult.settled) {
          if (evalResult.won) {
            winningCount++;
            totalPayout += bet.potentialWin;
            return {
              ...bet,
              status: 'won' as const,
              winAmount: bet.potentialWin,
              settledAt: nowIso,
            };
          } else {
            return {
              ...bet,
              status: 'lost' as const,
              settledAt: nowIso,
            };
          }
        }
      }

      return bet;
    });

    setBets(updatedBets);

    // If winnings occurred for the current user, credit their wallet and create transactions!
    if (totalPayout > 0) {
      const nextBal = user.walletBalance + totalPayout;
      setUser((prev) => ({ ...prev, walletBalance: nextBal }));

      const winTx: WalletTransaction = {
        id: `tx_win_${Date.now()}`,
        userId: user.id,
        amount: totalPayout,
        type: 'bet_win',
        title: `🏆 Winning Payout: ${market.name}`,
        note: `${winningCount} Winning Bid(s) settled! Result: ${fullResultText}`,
        referenceId: `WIN-${Date.now().toString().slice(-6)}`,
        createdAt: nowIso,
        balanceAfter: nextBal,
      };

      setTransactions((prev) => [winTx, ...prev]);

      // Trigger grand celebration!
      playSound('win');
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
      });

      addNotification(
        `🏆 CONGRATULATIONS! You Won ₹${totalPayout}!`,
        `${market.name} result declared (${fullResultText}). ${winningCount} winning bid(s) credited to your wallet!`,
        'win'
      );
    } else {
      addNotification(
        `Result Declared: ${market.name}`,
        `${phase.toUpperCase()} result published: ${pana} (${ank}). Bets have been settled.`,
        'result'
      );
    }

    return {
      success: true,
      message: `Result published: ${phase.toUpperCase()} Pana ${pana} (Ank ${ank}). Auto-settled: ${winningCount} winning bids, total payout: ₹${totalPayout}`,
      winningCount,
      totalPayout,
    };
  };

  // 9. ADMIN MARKET MANAGEMENT
  const adminAddMarket = (
    marketData: Omit<Market, 'id' | 'open_pana' | 'open_ank' | 'close_pana' | 'close_ank' | 'result_text'>
  ) => {
    const newMarket: Market = {
      ...marketData,
      id: Date.now(),
      open_pana: null,
      open_ank: null,
      close_pana: null,
      close_ank: null,
      result_text: '*** - ** - ***',
    };
    setMarkets((prev) => [...prev, newMarket]);
    addNotification('Market Added', `New market "${marketData.name}" has been listed.`, 'system');
  };

  const adminToggleMarketStatus = (marketId: number, status: Market['status']) => {
    setMarkets((prev) =>
      prev.map((m) => (m.id === marketId ? { ...m, status } : m))
    );
  };

  // 10. STARLINE BETTING & SETTLEMENT
  const placeStarlineBet = (
    starlineId: string,
    gameType: 'single_digit' | 'single_pana',
    selection: string,
    points: number
  ) => {
    const starMarket = starlineMarkets.find((s) => s.id === starlineId);
    if (!starMarket || starMarket.status === 'CLOSED') {
      return { success: false, message: 'This Starline hour is closed.' };
    }
    const avail = user.walletBalance - user.frozenBalance;
    if (avail < points) {
      return { success: false, message: `Insufficient points! Available: ₹${avail.toFixed(2)}` };
    }

    const multiplier = gameType === 'single_digit' ? 9.5 : 140;
    const potentialWin = Math.round(points * multiplier);
    const nextBal = user.walletBalance - points;

    setUser((prev) => ({ ...prev, walletBalance: nextBal }));

    const newBet: BetEntry = {
      id: `bet_sl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      userId: user.id,
      marketId: 999000 + parseInt(starlineId.replace(/\D/g, '') || '10', 10),
      marketName: `STARLINE ${starMarket.timeLabel}`,
      gameType,
      session: 'OPEN',
      selection,
      points,
      multiplier,
      potentialWin,
      status: 'pending',
      entryDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };

    setBets((prev) => [newBet, ...prev]);

    const tx: WalletTransaction = {
      id: `tx_sl_${Date.now()}`,
      userId: user.id,
      amount: -points,
      type: 'bet_place',
      title: `Starline ${starMarket.timeLabel} - ${gameType === 'single_digit' ? 'Single Digit' : 'Single Pana'}`,
      note: `Stake: ₹${points} on [${selection}]`,
      referenceId: `SL-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      balanceAfter: nextBal,
    };
    setTransactions((prev) => [tx, ...prev]);

    playSound('bet');
    addNotification(
      `Starline Bid Placed (${starMarket.timeLabel})`,
      `Bid of ₹${points} on ${selection} (${multiplier}x). Potential win: ₹${potentialWin}`,
      'bet'
    );
    return { success: true, message: `Starline bid of ₹${points} placed on ${selection}!` };
  };

  const adminDeclareStarlineResult = (starlineId: string, pana: string) => {
    if (!isValidPana(pana)) {
      return { success: false, message: 'Invalid 3-digit Pana. Must follow Matka order (e.g. 139, 248).' };
    }
    const ank = calculateAnkFromPana(pana);
    const resultText = `${pana}-${ank}`;
    const market = starlineMarkets.find((s) => s.id === starlineId);
    if (!market) return { success: false, message: 'Starline market not found' };

    setStarlineMarkets((prev) =>
      prev.map((s) => (s.id === starlineId ? { ...s, pana, ank, result_text: resultText, status: 'CLOSED' } : s))
    );

    const marketNameMatch = `STARLINE ${market.timeLabel}`;
    let winCount = 0;
    let winTotal = 0;
    const nowIso = new Date().toISOString();

    const updated = bets.map((b) => {
      if (b.marketName === marketNameMatch && b.status === 'pending') {
        const isWin =
          (b.gameType === 'single_digit' && b.selection === ank) ||
          ((b.gameType === 'single_pana' || b.gameType === 'double_pana' || b.gameType === 'triple_pana') && b.selection === pana);
        if (isWin) {
          winCount++;
          winTotal += b.potentialWin;
          return { ...b, status: 'won' as const, winAmount: b.potentialWin, settledAt: nowIso };
        } else {
          return { ...b, status: 'lost' as const, settledAt: nowIso };
        }
      }
      return b;
    });

    setBets(updated);

    if (winTotal > 0) {
      const nextBal = user.walletBalance + winTotal;
      setUser((prev) => ({ ...prev, walletBalance: nextBal }));
      const winTx: WalletTransaction = {
        id: `tx_slwin_${Date.now()}`,
        userId: user.id,
        amount: winTotal,
        type: 'bet_win',
        title: `🏆 Starline Win: ${market.timeLabel}`,
        note: `Result: ${resultText}. Payout: ₹${winTotal}`,
        referenceId: `SLWIN-${Date.now().toString().slice(-6)}`,
        createdAt: nowIso,
        balanceAfter: nextBal,
      };
      setTransactions((prev) => [winTx, ...prev]);
      playSound('win');
      confetti({ particleCount: 110, spread: 85, origin: { y: 0.5 } });
      addNotification(`🏆 Starline Win ₹${winTotal}!`, `${market.timeLabel} declared: ${resultText}`, 'win');
    } else {
      addNotification(`Starline Result: ${market.timeLabel}`, `Declared: ${resultText}`, 'result');
    }

    return {
      success: true,
      message: `Starline ${market.timeLabel} declared: ${resultText}. Settled: ${winCount} won, total payout ₹${winTotal}`,
      winningCount: winCount,
      totalPayout: winTotal,
    };
  };

  // 11. USER MANAGEMENT
  const adminToggleUserStatus = (userId: string) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' } : u))
    );
    if (user.id === userId) {
      setUser((prev) => ({ ...prev, status: prev.status === 'active' ? 'blocked' : 'active' }));
    }
  };

  const adminAdjustUserBalance = (userId: string, amount: number, note: string) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextB = Math.max(0, u.walletBalance + amount);
          return { ...u, walletBalance: nextB };
        }
        return u;
      })
    );
    if (user.id === userId) {
      const nextB = Math.max(0, user.walletBalance + amount);
      setUser((prev) => ({ ...prev, walletBalance: nextB }));
      const tx: WalletTransaction = {
        id: `tx_adj_${Date.now()}`,
        userId,
        amount,
        type: amount > 0 ? 'bonus' : 'withdrawal',
        title: amount > 0 ? 'Admin Credit Adjustment' : 'Admin Debit Adjustment',
        note: note || 'Adjusted by Super Admin',
        referenceId: `ADJ-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString(),
        balanceAfter: nextB,
      };
      setTransactions((prev) => [tx, ...prev]);
      if (amount > 0) playSound('coin');
    }
  };

  // 12. MULTI-UPI ROTATION & NOTICE
  const adminSetActiveUpi = (id: string) => {
    setUpiConfigs((prev) => prev.map((u) => ({ ...u, isActive: u.id === id })));
  };

  const adminAddUpi = (config: Omit<UpiConfig, 'id'>) => {
    const newUpi: UpiConfig = {
      ...config,
      id: `upi_${Date.now()}`,
    };
    setUpiConfigs((prev) => [...prev, newUpi]);
  };

  const adminUpdateFlashNotice = (notice: FlashNotice) => {
    setFlashNotice(notice);
  };

  const activeUpi = upiConfigs.find((u) => u.isActive) || upiConfigs[0];

  const resetAllData = () => {
    localStorage.clear();
    setUser(INITIAL_USER);
    setMarkets(INITIAL_MARKETS);
    setBets(INITIAL_BETS);
    setTransactions(INITIAL_TRANSACTIONS);
    setPaymentRequests(INITIAL_PAYMENTS);
    setWithdrawalRequests(INITIAL_WITHDRAWALS);
    setStarlineMarkets(INITIAL_STARLINE_MARKETS);
    setUpiConfigs(INITIAL_UPI_CONFIGS);
    setFlashNotice(INITIAL_FLASH_NOTICE);
    setUsersList(INITIAL_USERS_LIST);
    setNotifications([
      {
        id: 'notif_welcome_reset',
        title: 'Platform Reset',
        message: 'System data has been reset to default starting balance of ₹2,500.',
        type: 'system',
        createdAt: new Date().toISOString(),
        read: false,
      },
    ]);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        markets,
        bets,
        transactions,
        paymentRequests,
        withdrawalRequests,
        notifications,
        unreadNotificationCount,
        currentRole,
        selectedMarket,
        activeScreen,
        starlineMarkets,
        upiConfigs,
        activeUpi,
        flashNotice,
        usersList,
        setActiveScreen,
        setSelectedMarket,
        setCurrentRole,
        toggleRole,
        placeBets,
        placeStarlineBet,
        submitDeposit,
        submitWithdrawal,
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
        markNotificationsAsRead,
        playSound,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
