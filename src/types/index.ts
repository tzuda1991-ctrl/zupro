export type MarketStatus = 'OPEN' | 'CLOSED' | 'RUNNING' | 'HOLIDAY';

export type SessionType = 'OPEN' | 'CLOSE';

export type GameType = 
  | 'single_digit'
  | 'jodi_digit'
  | 'single_pana'
  | 'double_pana'
  | 'triple_pana'
  | 'half_sangam'
  | 'full_sangam';

export interface GameRate {
  id: GameType;
  title: string;
  hindiTitle: string;
  rateLabel: string;
  multiplier: number; // e.g. 9.5 for Single Digit, 95 for Jodi, 140 for Single Pana
  description: string;
}

export interface Market {
  id: number;
  name: string;
  hindiName?: string;
  opens: string; // e.g. "10:00 AM"
  closes: string; // e.g. "12:00 PM"
  result_time?: string;
  status: MarketStatus;
  open_pana?: string | null; // e.g. "235"
  open_ank?: string | null;  // e.g. "0"
  close_pana?: string | null; // e.g. "149"
  close_ank?: string | null;  // e.g. "4"
  result_text?: string | null; // e.g. "235-04-149"
  is_active: boolean;
}

export interface BetItem {
  number: string;
  points: number;
}

export interface BetEntry {
  id: string;
  userId: string;
  marketId: number;
  marketName: string;
  gameType: GameType;
  session: SessionType;
  selection: string; // the digit or pana or sangam
  points: number; // ₹ stake
  multiplier: number;
  potentialWin: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  winAmount?: number;
  entryDate: string; // YYYY-MM-DD
  createdAt: string; // ISO
  settledAt?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number; // positive for credit, negative for debit
  type: 'deposit' | 'withdrawal' | 'bet_place' | 'bet_win' | 'refund' | 'bonus';
  title: string;
  note: string;
  referenceId?: string;
  createdAt: string;
  balanceAfter: number;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  username: string;
  userMobile?: string;
  method: 'upi' | 'qr' | 'bank';
  amount: number;
  utr: string;
  proofData?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  adminNote?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  userMobile?: string;
  amount: number;
  method: 'upi' | 'bank';
  payoutDetails: string;
  status: 'pending' | 'completed' | 'rejected';
  payoutReference?: string;
  createdAt: string;
  reviewedAt?: string;
  adminNote?: string;
}

export interface StarlineMarket {
  id: string;
  timeLabel: string; // e.g. "10:00 AM", "11:00 AM"
  status: 'OPEN' | 'CLOSED';
  pana?: string | null;
  ank?: string | null;
  result_text?: string | null;
}

export interface UpiConfig {
  id: string;
  upiId: string;
  title: string;
  accountHolder: string;
  bankName: string;
  isActive: boolean;
}

export interface FlashNotice {
  enabled: boolean;
  tickerText: string;
  bannerTitle: string;
  bannerMessage: string;
  supportPhone: string;
  whatsappNumber: string;
  telegramUsername: string;
}

export interface UserProfile {
  id: string;
  username: string;
  mobile: string;
  email: string;
  role: 'user' | 'admin';
  walletBalance: number;
  frozenBalance: number; // held in pending withdrawals
  status: 'active' | 'blocked';
  totalDeposited: number;
  totalWithdrawn: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'win' | 'deposit' | 'withdrawal' | 'bet' | 'result' | 'system';
  createdAt: string;
  read: boolean;
}
