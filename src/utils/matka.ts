import { GameRate, GameType, Market } from '../types';

export const GAME_RATES: Record<GameType, GameRate> = {
  single_digit: {
    id: 'single_digit',
    title: 'Single Digit (Ank)',
    hindiTitle: 'सिंगल अंक',
    rateLabel: '10 Ka 95',
    multiplier: 9.5,
    description: 'Select any digit from 0 to 9 for Open or Close session.',
  },
  jodi_digit: {
    id: 'jodi_digit',
    title: 'Jodi Digit',
    hindiTitle: 'जोड़ी डिजिट',
    rateLabel: '10 Ka 950',
    multiplier: 95,
    description: 'Select two digits from 00 to 99 (Open Ank + Close Ank).',
  },
  single_pana: {
    id: 'single_pana',
    title: 'Single Pana',
    hindiTitle: 'सिंगल पत्ती (पाना)',
    rateLabel: '10 Ka 1,400',
    multiplier: 140,
    description: '3 unique ascending digits (120 combinations, e.g. 128, 137).',
  },
  double_pana: {
    id: 'double_pana',
    title: 'Double Pana',
    hindiTitle: 'डबल पत्ती (पाना)',
    rateLabel: '10 Ka 2,800',
    multiplier: 280,
    description: '2 repeating digits + 1 unique (90 combinations, e.g. 112, 220).',
  },
  triple_pana: {
    id: 'triple_pana',
    title: 'Triple Pana',
    hindiTitle: 'ट्रिपल पत्ती (पाना)',
    rateLabel: '10 Ka 7,000',
    multiplier: 700,
    description: '3 identical digits (000, 111, 222, 333 ... 999).',
  },
  half_sangam: {
    id: 'half_sangam',
    title: 'Half Sangam',
    hindiTitle: 'हाफ संगम',
    rateLabel: '10 Ka 10,000',
    multiplier: 1000,
    description: 'Open Pana + Close Ank OR Open Ank + Close Pana.',
  },
  full_sangam: {
    id: 'full_sangam',
    title: 'Full Sangam',
    hindiTitle: 'फुल संगम',
    rateLabel: '10 Ka 1,00,000',
    multiplier: 10000,
    description: 'Exact Open Pana + Exact Close Pana combination.',
  },
};

// Matka standard sort order: 1, 2, 3, 4, 5, 6, 7, 8, 9, 0
export const MATKA_DIGIT_ORDER = '1234567890';

export function calculateAnkFromPana(pana: string): string {
  if (!pana || pana.length !== 3) return '*';
  const sum = pana.split('').reduce((acc, char) => acc + parseInt(char, 10), 0);
  return String(sum % 10);
}

export function isValidPana(value: string): boolean {
  if (!/^[0-9]{3}$/.test(value)) return false;
  const sorted = value.split('').sort((a, b) => MATKA_DIGIT_ORDER.indexOf(a) - MATKA_DIGIT_ORDER.indexOf(b)).join('');
  return value === sorted;
}

export function getPanaType(pana: string): 'triple' | 'double' | 'single' | 'invalid' {
  if (!isValidPana(pana)) return 'invalid';
  const set = new Set(pana.split(''));
  if (set.size === 1) return 'triple';
  if (set.size === 2) return 'double';
  return 'single';
}

// Generate the 10 Triple Panas
export const TRIPLE_PANAS = ['000', '111', '222', '333', '444', '555', '666', '777', '888', '999'];

// Generate standard Single Panas grouped by their Ank (0-9)
export function getPanasByAnk(): Record<string, { single: string[]; double: string[] }> {
  const result: Record<string, { single: string[]; double: string[] }> = {};
  for (let i = 0; i <= 9; i++) {
    result[String(i)] = { single: [], double: [] };
  }

  const digits = '1234567890'.split('');

  // Generate all valid 3-digit combos following Matka order
  for (let i = 0; i < digits.length; i++) {
    for (let j = i; j < digits.length; j++) {
      for (let k = j; k < digits.length; k++) {
        const pana = digits[i] + digits[j] + digits[k];
        const ank = calculateAnkFromPana(pana);
        const type = getPanaType(pana);
        if (type === 'single') {
          result[ank]?.single.push(pana);
        } else if (type === 'double') {
          result[ank]?.double.push(pana);
        }
      }
    }
  }
  return result;
}

export const PANAS_BY_ANK = getPanasByAnk();

// Format display result: e.g. "235 - 04 - 149" or "*** - ** - ***"
export function formatMarketResult(m: Market): string {
  const openP = m.open_pana || '***';
  const openA = m.open_ank || '*';
  const closeA = m.close_ank || '*';
  const closeP = m.close_pana || '***';

  const jodi = `${openA}${closeA}`;
  return `${openP} - ${jodi} - ${closeP}`;
}

// Helper to convert time "10:30 AM" or "02:15 PM" to total minutes from midnight
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

// Evaluate bet win against declared results
export function evaluateBet(
  gameType: GameType,
  session: 'OPEN' | 'CLOSE',
  selection: string,
  openPana: string | null | undefined,
  closePana: string | null | undefined
): { settled: boolean; won: boolean } {
  const openAnk = openPana ? calculateAnkFromPana(openPana) : null;
  const closeAnk = closePana ? calculateAnkFromPana(closePana) : null;
  const jodi = openAnk && closeAnk ? `${openAnk}${closeAnk}` : null;

  switch (gameType) {
    case 'single_digit':
      if (session === 'OPEN') {
        if (!openAnk) return { settled: false, won: false };
        return { settled: true, won: selection === openAnk };
      } else {
        if (!closeAnk) return { settled: false, won: false };
        return { settled: true, won: selection === closeAnk };
      }

    case 'jodi_digit':
      if (!jodi) return { settled: false, won: false };
      return { settled: true, won: selection.padStart(2, '0') === jodi };

    case 'single_pana':
    case 'double_pana':
    case 'triple_pana':
      if (session === 'OPEN') {
        if (!openPana) return { settled: false, won: false };
        return { settled: true, won: selection === openPana };
      } else {
        if (!closePana) return { settled: false, won: false };
        return { settled: true, won: selection === closePana };
      }

    case 'half_sangam':
      // e.g. Open Pana + Close Ank (123x4) or Open Ank + Close Pana (4x123)
      if (!openPana || !closePana || !openAnk || !closeAnk) return { settled: false, won: false };
      const normalizedSel = selection.replace(/\s+/g, '').toUpperCase();
      const combo1 = `${openPana}X${closeAnk}`;
      const combo2 = `${openAnk}X${closePana}`;
      return { settled: true, won: normalizedSel === combo1 || normalizedSel === combo2 };

    case 'full_sangam':
      // Open Pana + Close Pana (123x456)
      if (!openPana || !closePana) return { settled: false, won: false };
      const fullCombo = `${openPana}X${closePana}`.toUpperCase();
      return { settled: true, won: selection.replace(/\s+/g, '').toUpperCase() === fullCombo };

    default:
      return { settled: false, won: false };
  }
}

// MATKA CUT DIGIT TABLE: 1<->6, 2<->7, 3<->8, 4<->9, 5<->0
export const MATKA_CUT_MAP: Record<string, string> = {
  '0': '5', '5': '0',
  '1': '6', '6': '1',
  '2': '7', '7': '2',
  '3': '8', '8': '3',
  '4': '9', '9': '4',
};

// CROSSING GENERATOR (e.g. crossing [1, 2, 5, 8])
export function generateCrossingJodis(digits: string[], withDouble = true): string[] {
  const uniqueDigits = Array.from(new Set(digits.filter((d) => /^[0-9]$/.test(d))));
  const jodis: string[] = [];

  for (let i = 0; i < uniqueDigits.length; i++) {
    for (let j = 0; j < uniqueDigits.length; j++) {
      if (!withDouble && i === j) continue;
      jodis.push(`${uniqueDigits[i]}${uniqueDigits[j]}`);
    }
  }
  return Array.from(new Set(jodis));
}

// FAMILY JODI GENERATOR (e.g. Jodi 24 -> 24, 29, 74, 79, 42, 92, 47, 97)
export function generateFamilyJodis(jodi: string): string[] {
  if (!/^[0-9]{2}$/.test(jodi)) return [];
  const [a, b] = jodi.split('');
  const aCut = MATKA_CUT_MAP[a];
  const bCut = MATKA_CUT_MAP[b];

  const combos = [
    `${a}${b}`,
    `${a}${bCut}`,
    `${aCut}${b}`,
    `${aCut}${bCut}`,
    `${b}${a}`,
    `${b}${aCut}`,
    `${bCut}${a}`,
    `${bCut}${aCut}`,
  ];

  return Array.from(new Set(combos));
}

// LOAD SHEET & RISK CALCULATOR FOR ADMIN
export interface DigitExposure {
  digit: string;
  totalBets: number;
  totalStake: number;
  potentialPayout: number;
  netHouseProfit: number;
  isHighestRisk: boolean;
  isSafest: boolean;
}

export function calculateLoadSheet(
  marketBets: { selection: string; points: number; gameType: string; session: string }[],
  session: 'OPEN' | 'CLOSE',
  gameMultiplier = 9.5
): {
  totalPool: number;
  digits: DigitExposure[];
  topJodis: { jodi: string; points: number; count: number }[];
} {
  const singleBets = marketBets.filter(
    (b) => b.gameType === 'single_digit' && b.session === session
  );

  const jodiBets = marketBets.filter((b) => b.gameType === 'jodi_digit');

  const totalPool = marketBets.reduce((sum, b) => sum + b.points, 0);

  // Calculate per digit (0 to 9)
  const digits: DigitExposure[] = [];
  for (let i = 0; i <= 9; i++) {
    const dStr = String(i);
    const matching = singleBets.filter((b) => b.selection === dStr);
    const totalStake = matching.reduce((sum, b) => sum + b.points, 0);
    const potentialPayout = Math.round(totalStake * gameMultiplier);
    const netHouseProfit = totalPool - potentialPayout;

    digits.push({
      digit: dStr,
      totalBets: matching.length,
      totalStake,
      potentialPayout,
      netHouseProfit,
      isHighestRisk: false,
      isSafest: false,
    });
  }

  // Find highest risk (lowest net house profit) and safest (highest net house profit)
  if (digits.some((d) => d.totalStake > 0)) {
    let minProfit = Infinity;
    let maxProfit = -Infinity;
    let minIdx = -1;
    let maxIdx = -1;

    digits.forEach((d, idx) => {
      if (d.netHouseProfit < minProfit) {
        minProfit = d.netHouseProfit;
        minIdx = idx;
      }
      if (d.netHouseProfit > maxProfit) {
        maxProfit = d.netHouseProfit;
        maxIdx = idx;
      }
    });

    if (minIdx !== -1) digits[minIdx].isHighestRisk = true;
    if (maxIdx !== -1) digits[maxIdx].isSafest = true;
  }

  // Top Jodis
  const jodiMap = new Map<string, { points: number; count: number }>();
  jodiBets.forEach((b) => {
    const cur = jodiMap.get(b.selection) || { points: 0, count: 0 };
    jodiMap.set(b.selection, {
      points: cur.points + b.points,
      count: cur.count + 1,
    });
  });

  const topJodis = Array.from(jodiMap.entries())
    .map(([jodi, data]) => ({ jodi, ...data }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);

  return { totalPool, digits, topJodis };
}

