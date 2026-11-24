import {
  ActivityLevel,
  DailyBoosters,
  DrinkLog,
  DrinkType,
  DropiAccessoryId,
  DropiColorId,
  HydrationReason,
  ThemeMode,
} from './types';
import { getLocalDateKey, parseTimeToMinutes } from './storage';

export const DRINK_HYDRATION_FACTORS: Record<DrinkType, number> = {
  water: 1.0,
  electrolyte: 1.1,
  coffee_tea: 0.85,
  sweet: 0.75,
};

export interface DrinkTypeOption {
  id: DrinkType;
  label: string;
  shortLabel: string;
  factor: number;
  percentLabel: string;
}

export const DRINK_TYPE_OPTIONS: DrinkTypeOption[] = [
  {
    id: 'water',
    label: 'Air Putih',
    shortLabel: 'Air Putih',
    factor: 1.0,
    percentLabel: '100%',
  },
  {
    id: 'electrolyte',
    label: 'Elektrolit / Isotonik',
    shortLabel: 'Isotonik',
    factor: 1.1,
    percentLabel: '110%',
  },
  {
    id: 'coffee_tea',
    label: 'Kopi / Teh',
    shortLabel: 'Kopi/Teh',
    factor: 0.85,
    percentLabel: '85%',
  },
  {
    id: 'sweet',
    label: 'Minuman Manis / Soda',
    shortLabel: 'Manis',
    factor: 0.75,
    percentLabel: '75%',
  },
];

export const DAILY_BOOSTER_AMOUNTS = {
  exercise: 500,
  hotWeather: 300,
} as const;

export function getHydrationFactor(drinkType?: DrinkType): number {
  if (!drinkType || !(drinkType in DRINK_HYDRATION_FACTORS)) {
    return 1.0;
  }
  return DRINK_HYDRATION_FACTORS[drinkType];
}

export function calculateEffectiveMl(
  rawAmountMl: number,
  drinkType: DrinkType = 'water'
): number {
  const safeRaw = Math.max(0, rawAmountMl);
  return Math.round(safeRaw * getHydrationFactor(drinkType));
}

export function getLogDrinkType(log: Pick<DrinkLog, 'drinkType'>): DrinkType {
  if (log.drinkType && log.drinkType in DRINK_HYDRATION_FACTORS) {
    return log.drinkType;
  }
  return 'water';
}

export function getLogRawAmountMl(
  log: Pick<DrinkLog, 'ml' | 'rawAmountMl'>
): number {
  if (typeof log.rawAmountMl === 'number' && Number.isFinite(log.rawAmountMl)) {
    return log.rawAmountMl;
  }
  return log.ml;
}

export function getLogEffectiveMl(
  log: Pick<DrinkLog, 'ml' | 'rawAmountMl' | 'drinkType' | 'effectiveMl'>
): number {
  if (typeof log.effectiveMl === 'number' && Number.isFinite(log.effectiveMl)) {
    return log.effectiveMl;
  }
  if (typeof log.rawAmountMl === 'number' && Number.isFinite(log.rawAmountMl)) {
    return calculateEffectiveMl(log.rawAmountMl, getLogDrinkType(log));
  }
  return log.ml;
}

export function getDrinkTypeOption(drinkType?: DrinkType): DrinkTypeOption {
  const normalized = drinkType && drinkType in DRINK_HYDRATION_FACTORS ? drinkType : 'water';
  return (
    DRINK_TYPE_OPTIONS.find((opt) => opt.id === normalized) || DRINK_TYPE_OPTIONS[0]
  );
}

export function getDrinkReactionMessage(
  drinkType: DrinkType,
  rawAmountMl: number,
  effectiveMl: number
): string | null {
  switch (drinkType) {
    case 'electrolyte':
      return `Isotonik bikin hidrasi makin optimal! ${rawAmountMl} ml dihitung ${effectiveMl} ml efektif.`;
    case 'coffee_tea':
      return `Kopi/teh tetap menghidrasi (${effectiveMl} ml efektif), tapi kafein agak diuretik. Imbangi air putih ya!`;
    case 'sweet':
      return `Minuman manis dihitung ${effectiveMl} ml efektif (75%). Gula berlebih bikin cepat haus lagi, yuk selingi air putih!`;
    default:
      return null;
  }
}

export function calculateDailyTargetMl(
  baseGoalMl: number,
  dailyBoosters?: DailyBoosters | null
): number {
  const safeBase = Math.max(0, Math.round(baseGoalMl || 0));
  if (!dailyBoosters) return safeBase;
  let bonus = 0;
  if (dailyBoosters.exercise) bonus += DAILY_BOOSTER_AMOUNTS.exercise;
  if (dailyBoosters.hotWeather) bonus += DAILY_BOOSTER_AMOUNTS.hotWeather;
  return safeBase + bonus;
}

export function calculateRecommendedGoal(
  weightKg: number,
  activity: ActivityLevel
): number {
  const safeWeight = Math.max(30, Math.min(180, weightKg || 60));
  const activityBonus =
    activity === 'santai' ? 0 : activity === 'sedang' ? 300 : 600;
  const raw = safeWeight * 35 + activityBonus;
  const rounded = Math.round(raw / 50) * 50;
  return Math.max(1500, Math.min(4000, rounded));
}

export function calculateLevel(xp: number): number {
  return Math.floor(Math.max(0, xp) / 100) + 1;
}

export function getXpProgressInLevel(xp: number): {
  level: number;
  current: number;
  needed: number;
  percent: number;
} {
  const safeXp = Math.max(0, xp);
  const level = calculateLevel(safeXp);
  const current = safeXp % 100;
  return {
    level,
    current,
    needed: 100,
    percent: current,
  };
}

export function getLogsForDate(logs: DrinkLog[], dateKey: string): DrinkLog[] {
  return logs.filter((log) => getLocalDateKey(new Date(log.ts)) === dateKey);
}

export function getTotalMlForDate(logs: DrinkLog[], dateKey: string): number {
  return getLogsForDate(logs, dateKey).reduce(
    (sum, l) => sum + getLogEffectiveMl(l),
    0
  );
}

export function getTotalMlAllTime(logs: DrinkLog[]): number {
  return logs.reduce((sum, l) => sum + getLogEffectiveMl(l), 0);
}

export function getMinutesSinceLastLog(
  logs: DrinkLog[],
  now: Date = new Date()
): number | null {
  if (logs.length === 0) return null;
  const sorted = [...logs].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );
  const diffMs = now.getTime() - new Date(sorted[0].ts).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

export function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const REASON_OPTIONS: {
  id: HydrationReason;
  label: string;
  desc: string;
}[] = [
  { id: 'energi', label: 'Lebih berenergi', desc: 'Anti lemas sepanjang hari' },
  { id: 'kulit', label: 'Kulit sehat & cerah', desc: 'Terhidrasi dari dalam' },
  { id: 'fokus', label: 'Fokus belajar & kerja', desc: 'Otak segar, kerja lancar' },
  { id: 'olahraga', label: 'Dukung olahraga', desc: 'Pemulihan cairan tubuh' },
  { id: 'kesehatan', label: 'Kesehatan umum', desc: 'Bangun kebiasaan baik' },
];

export const CUP_PRESETS = [
  { ml: 150, label: 'Cangkir Kecil' },
  { ml: 250, label: 'Gelas Standar' },
  { ml: 350, label: 'Gelas Besar' },
  { ml: 500, label: 'Botol Tumbler' },
];

export const DROPI_COLOR_UNLOCK_LEVELS: Record<DropiColorId, number> = {
  blue: 1,
  teal: 2,
  green: 3,
  purple: 5,
  yellow: 7,
  pink: 10,
  aqua_neon: 12,
  royal_gold: 15,
  aurora_berry: 18,
};

export const DROPI_ACCESSORY_UNLOCK_LEVELS: Record<DropiAccessoryId, number> = {
  none: 1,
  hat: 2,
  glasses: 4,
  crown: 6,
};

export const DEFAULT_UNLOCKED_COLORS: DropiColorId[] = ['blue', 'teal'];
export const DEFAULT_UNLOCKED_ACCESSORIES: DropiAccessoryId[] = ['none'];

export const DROPI_COLOR_PRICES: Record<DropiColorId, number> = {
  blue: 0,
  teal: 0,
  green: 40,
  purple: 60,
  yellow: 60,
  pink: 80,
  aqua_neon: 160,
  royal_gold: 220,
  aurora_berry: 260,
};

export const DROPI_ACCESSORY_PRICES: Record<DropiAccessoryId, number> = {
  none: 0,
  hat: 50,
  glasses: 75,
  crown: 120,
};

export const STREAK_FREEZE_PRICE = 50;
export const MAX_STREAK_FREEZES = 3;
export const GOAL_BONUS_DROPS = 20;

export interface DrySpellInsight {
  startHour: number;
  endHour: number;
  label: string;
  count: number;
  message: string;
}

export function analyzeDrySpellWindow(
  logs: DrinkLog[],
  now: Date = new Date()
): DrySpellInsight | null {
  const startOfWindowDays = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6,
    0,
    0,
    0,
    0
  ).getTime();
  const endOfWindowDays = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  ).getTime();

  const recentLogs = logs.filter((l) => {
    const t = new Date(l.ts).getTime();
    return t >= startOfWindowDays && t <= endOfWindowDays;
  });

  if (recentLogs.length === 0) return null;

  // Hitung frekuensi catatan dan total ml efektif di tiap jam (07..20)
  const hourCounts = new Array<number>(24).fill(0);
  const hourMl = new Array<number>(24).fill(0);
  for (const log of recentLogs) {
    const h = new Date(log.ts).getHours();
    if (h >= 0 && h < 24) {
      hourCounts[h] += 1;
      hourMl[h] += getLogEffectiveMl(log);
    }
  }

  // Rentang 3 jam antara pukul 07.00 - 21.00 (startHour 7..18)
  let bestStart = 13;
  let bestCount = Number.POSITIVE_INFINITY;
  let bestMl = Number.POSITIVE_INFINITY;

  for (let start = 7; start <= 18; start++) {
    const count =
      hourCounts[start] + hourCounts[start + 1] + hourCounts[start + 2];
    const ml = hourMl[start] + hourMl[start + 1] + hourMl[start + 2];

    if (count < bestCount || (count === bestCount && ml < bestMl)) {
      bestCount = count;
      bestMl = ml;
      bestStart = start;
    }
  }

  const endHour = bestStart + 3;
  const pad = (n: number) => String(n).padStart(2, '0');
  const label = `${pad(bestStart)}.00 – ${pad(endHour)}.00`;

  return {
    startHour: bestStart,
    endHour,
    label,
    count: bestCount,
    message: `Kamu paling sering melewatkan minum antara pukul ${label}. Coba siapkan botol di dekatmu pada jam tersebut.`,
  };
}

export interface DrinkDistributionItem {
  id: DrinkType;
  label: string;
  shortLabel: string;
  rawMl: number;
  effectiveMl: number;
  count: number;
  percent: number;
}

export function getWeeklyDrinkDistribution(
  logs: DrinkLog[],
  now: Date = new Date()
): { totalRawMl: number; items: DrinkDistributionItem[] } {
  const startMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6,
    0,
    0,
    0,
    0
  ).getTime();
  const endMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  ).getTime();

  const buckets: Record<
    DrinkType,
    { rawMl: number; effectiveMl: number; count: number }
  > = {
    water: { rawMl: 0, effectiveMl: 0, count: 0 },
    electrolyte: { rawMl: 0, effectiveMl: 0, count: 0 },
    coffee_tea: { rawMl: 0, effectiveMl: 0, count: 0 },
    sweet: { rawMl: 0, effectiveMl: 0, count: 0 },
  };

  let totalRawMl = 0;
  for (const log of logs) {
    const t = new Date(log.ts).getTime();
    if (t < startMs || t > endMs) continue;
    const type = getLogDrinkType(log);
    const raw = getLogRawAmountMl(log);
    const eff = getLogEffectiveMl(log);
    buckets[type].rawMl += raw;
    buckets[type].effectiveMl += eff;
    buckets[type].count += 1;
    totalRawMl += raw;
  }

  const items: DrinkDistributionItem[] = DRINK_TYPE_OPTIONS.map((opt) => {
    const b = buckets[opt.id];
    return {
      id: opt.id,
      label: opt.label,
      shortLabel: opt.shortLabel,
      rawMl: b.rawMl,
      effectiveMl: b.effectiveMl,
      count: b.count,
      percent: totalRawMl > 0 ? Math.round((b.rawMl / totalRawMl) * 100) : 0,
    };
  });

  return { totalRawMl, items };
}

export function getMostFrequentDrinkType(logs: DrinkLog[]): DrinkType {
  if (logs.length === 0) return 'water';
  const counts: Record<DrinkType, number> = {
    water: 0,
    electrolyte: 0,
    coffee_tea: 0,
    sweet: 0,
  };
  for (const l of logs) {
    counts[getLogDrinkType(l)] += 1;
  }
  let best: DrinkType = 'water';
  let bestCount = -1;
  for (const opt of DRINK_TYPE_OPTIONS) {
    if (counts[opt.id] > bestCount) {
      bestCount = counts[opt.id];
      best = opt.id;
    }
  }
  return best;
}

function isMinutesInCircularRange(
  currentMin: number,
  startMin: number,
  endMin: number
): boolean {
  const norm = (m: number) => ((m % 1440) + 1440) % 1440;
  const c = norm(currentMin);
  const s = norm(startMin);
  const e = norm(endMin);
  if (s === e) return false;
  if (s < e) return c >= s && c < e;
  return c >= s || c < e;
}

export function isWindDownActive(
  wakeTime: string,
  sleepTime: string,
  now: Date = new Date()
): boolean {
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const wakeMin = parseTimeToMinutes(wakeTime);
  const sleepMin = parseTimeToMinutes(sleepTime);
  return isMinutesInCircularRange(currentMin, sleepMin - 120, wakeMin);
}

export function isAutoNightActive(
  wakeTime: string,
  sleepTime: string,
  now: Date = new Date()
): boolean {
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const wakeMin = parseTimeToMinutes(wakeTime);
  let sleepMin = parseTimeToMinutes(sleepTime);
  if (sleepMin <= wakeMin) sleepMin += 1440;

  let evening18 = 18 * 60;
  if (evening18 <= wakeMin) evening18 += 1440;

  const twoHoursBeforeSleep = sleepMin - 120;
  const nightStartMin = Math.min(evening18, twoHoursBeforeSleep);

  return isMinutesInCircularRange(currentMin, nightStartMin, wakeMin);
}

export function resolveEffectiveDarkMode(
  themeMode: ThemeMode,
  wakeTime: string,
  sleepTime: string,
  now: Date = new Date()
): boolean {
  if (themeMode === 'dark') return true;
  if (themeMode === 'light') return false;
  return isAutoNightActive(wakeTime, sleepTime, now);
}

export interface RapidIntakeResult {
  isTooFast: boolean;
  recentTotalMl: number;
  suggestedWaitMinutes: number;
}

export function checkRapidIntake(
  logs: DrinkLog[],
  newAmountMl: number,
  now: number = Date.now()
): RapidIntakeResult {
  const windowMs = 60 * 60 * 1000;
  const windowStart = now - windowMs;
  let existingRecentMl = 0;
  let oldestRecentTs: number | null = null;

  for (const log of logs) {
    const ts = new Date(log.ts).getTime();
    if (!Number.isFinite(ts) || ts < windowStart || ts > now) continue;
    existingRecentMl += getLogRawAmountMl(log);
    if (oldestRecentTs === null || ts < oldestRecentTs) {
      oldestRecentTs = ts;
    }
  }

  const normalizedNew = Math.max(0, Math.round(newAmountMl));
  const recentTotalMl = existingRecentMl + normalizedNew;
  const isTooFast = normalizedNew >= 700 || recentTotalMl > 800;

  if (!isTooFast) {
    return {
      isTooFast: false,
      recentTotalMl,
      suggestedWaitMinutes: 0,
    };
  }

  let suggestedWaitMinutes = 15;
  if (oldestRecentTs !== null) {
    const msUntilExpiry = oldestRecentTs + windowMs - now;
    const minsUntilExpiry = Math.ceil(msUntilExpiry / 60000);
    suggestedWaitMinutes = Math.max(15, minsUntilExpiry);
  }

  return {
    isTooFast: true,
    recentTotalMl,
    suggestedWaitMinutes,
  };
}

export interface AffordableShopItem {
  id: string;
  category: 'color' | 'accessory' | 'freeze';
  label: string;
  price: number;
}

const COLOR_LABELS: Record<DropiColorId, string> = {
  blue: 'Warna Biru Dropi',
  teal: 'Warna Toska Segar',
  green: 'Warna Hijau Mint',
  purple: 'Warna Ungu Berry',
  yellow: 'Warna Kuning Cerah',
  pink: 'Warna Pink Coral',
  aqua_neon: 'Edisi Terbatas: Aqua Neon',
  royal_gold: 'Edisi Terbatas: Royal Gold',
  aurora_berry: 'Edisi Terbatas: Aurora Berry',
};

const ACCESSORY_LABELS: Record<DropiAccessoryId, string> = {
  none: 'Polos',
  hat: 'Aksesori Topi',
  glasses: 'Aksesori Kacamata',
  crown: 'Aksesori Mahkota',
};

export function getAffordableShopItems(params: {
  drops: number;
  unlockedColors: DropiColorId[];
  unlockedAccessories: DropiAccessoryId[];
  streakFreezes: number;
}): AffordableShopItem[] {
  const { drops, unlockedColors, unlockedAccessories, streakFreezes } = params;
  const items: AffordableShopItem[] = [];

  (Object.keys(DROPI_COLOR_PRICES) as DropiColorId[]).forEach((id) => {
    const price = DROPI_COLOR_PRICES[id];
    if (price > 0 && !unlockedColors.includes(id) && drops >= price) {
      items.push({
        id: `color:${id}`,
        category: 'color',
        label: COLOR_LABELS[id],
        price,
      });
    }
  });

  (Object.keys(DROPI_ACCESSORY_PRICES) as DropiAccessoryId[]).forEach((id) => {
    const price = DROPI_ACCESSORY_PRICES[id];
    if (price > 0 && !unlockedAccessories.includes(id) && drops >= price) {
      items.push({
        id: `accessory:${id}`,
        category: 'accessory',
        label: ACCESSORY_LABELS[id],
        price,
      });
    }
  });

  if (streakFreezes < MAX_STREAK_FREEZES && drops >= STREAK_FREEZE_PRICE) {
    items.push({
      id: 'freeze:streak',
      category: 'freeze',
      label: 'Pelindung Streak',
      price: STREAK_FREEZE_PRICE,
    });
  }

  return items.sort((a, b) => a.price - b.price);
}

export interface SplinePoint {
  x: number;
  y: number;
}

/**
 * Menghasilkan path SVG kurva kubik halus monoton (Fritsch-Carlson) agar kurva tidak overshoot
 * melewati batas bawah (0 ml) atau puncak nilai saat terjadi lonjakan antar hari.
 */
export function buildMonotoneSplinePath(points: SplinePoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  }

  const n = points.length;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    slopes.push(dx !== 0 ? dy / dx : 0);
  }

  const tangents: number[] = new Array(n).fill(0);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (slopes[i - 1] + slopes[i]) / 2;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slopes[i]) < 1e-6) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i] / slopes[i];
      const b = tangents[i + 1] / slopes[i];
      const norm = Math.hypot(a, b);
      if (norm > 3) {
        const scale = 3 / norm;
        tangents[i] = scale * a * slopes[i];
        tangents[i + 1] = scale * b * slopes[i];
      }
    }
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) / 3;
    const cp1x = p0.x + dx;
    const cp1y = p0.y + tangents[i] * dx;
    const cp2x = p1.x - dx;
    const cp2y = p1.y - tangents[i + 1] * dx;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  return d;
}


