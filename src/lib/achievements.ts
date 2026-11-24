import { AchievementRecord, AchievementTier, ProgressState, WaterLog } from './types';
import { getLocalDateKey } from './storage';
import { getLogEffectiveMl, getTotalMlAllTime } from './hydration';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: 'droplet' | 'flame' | 'sunrise' | 'crown' | 'calendar' | 'award';
  thresholds: {
    bronze: number;
    silver: number;
    gold: number;
  };
  unit: string;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_sip',
    title: 'Tegukan Pertama',
    description: 'Catat aktivitas minum air secara rutin.',
    icon: 'droplet',
    thresholds: { bronze: 1, silver: 25, gold: 100 },
    unit: 'catatan',
  },
  {
    id: 'streak_3',
    title: 'Percikan Awal',
    description: 'Capai streak minum berturut-turut.',
    icon: 'flame',
    thresholds: { bronze: 3, silver: 7, gold: 14 },
    unit: 'hari',
  },
  {
    id: 'streak_30',
    title: 'Penjaga Api',
    description: 'Pertahankan streak hingga puluhan hari!',
    icon: 'flame',
    thresholds: { bronze: 30, silver: 50, gold: 100 },
    unit: 'hari',
  },
  {
    id: 'morning_fresh',
    title: 'Pagi Segar',
    description: 'Minum air sebelum jam 08.00 pagi.',
    icon: 'sunrise',
    thresholds: { bronze: 3, silver: 7, gold: 21 },
    unit: 'hari',
  },
  {
    id: 'water_sultan',
    title: 'Sultan Air',
    description: 'Kumpulkan total air minum hingga 50 liter!',
    icon: 'crown',
    thresholds: { bronze: 10000, silver: 25000, gold: 50000 },
    unit: 'ml',
  },
  {
    id: 'consistent_week',
    title: 'Konsisten',
    description: 'Capai 100% target harian selama 7 hari dalam seminggu.',
    icon: 'calendar',
    thresholds: { bronze: 3, silver: 5, gold: 7 },
    unit: 'hari/minggu',
  },
  {
    id: 'collector',
    title: 'Si Kolektor',
    description: 'Buka berbagai lencana pencapaian di Tetes.',
    icon: 'award',
    thresholds: { bronze: 3, silver: 5, gold: 6 },
    unit: 'lencana',
  },
];

export function computeAchievementValue(
  id: string,
  logs: WaterLog[],
  progress: ProgressState,
  goalMl: number,
  currentUnlockedCount: number
): number {
  switch (id) {
    case 'first_sip':
      return logs.length;
    case 'streak_3':
    case 'streak_30':
      return Math.max(progress.streak, progress.longestStreak);
    case 'morning_fresh': {
      const morningDays = new Set<string>();
      for (const l of logs) {
        const dt = new Date(l.ts);
        if (dt.getHours() < 8) {
          morningDays.add(getLocalDateKey(dt));
        }
      }
      return morningDays.size;
    }
    case 'water_sultan':
      return getTotalMlAllTime(logs);
    case 'consistent_week': {
      // Hitung jumlah hari mencapai target dalam 7 hari terakhir
      const now = new Date();
      const dayTotals = new Map<string, number>();
      for (let i = 0; i < 7; i++) {
        const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        dayTotals.set(getLocalDateKey(dt), 0);
      }
      for (const l of logs) {
        const k = getLocalDateKey(new Date(l.ts));
        if (dayTotals.has(k)) {
          dayTotals.set(k, (dayTotals.get(k) || 0) + getLogEffectiveMl(l));
        }
      }
      let hits = 0;
      dayTotals.forEach((total) => {
        if (total >= goalMl) hits++;
      });
      return hits;
    }
    case 'collector':
      return currentUnlockedCount;
    default:
      return 0;
  }
}

export function getTierForValue(
  def: AchievementDefinition,
  value: number
): AchievementTier {
  if (value >= def.thresholds.gold) return 'gold';
  if (value >= def.thresholds.silver) return 'silver';
  if (value >= def.thresholds.bronze) return 'bronze';
  return 'none';
}

const TIER_RANK: Record<AchievementTier, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

export function evaluateAchievements(
  existing: Record<string, AchievementRecord | undefined>,
  logs: WaterLog[],
  progress: ProgressState,
  goalMl: number
): {
  nextRecords: Record<string, AchievementRecord | undefined>;
  newlyUnlocked: { def: AchievementDefinition; tier: Exclude<AchievementTier, 'none'> }[];
} {
  const nextRecords: Record<string, AchievementRecord | undefined> = { ...existing };
  const newlyUnlocked: {
    def: AchievementDefinition;
    tier: Exclude<AchievementTier, 'none'>;
  }[] = [];

  const nonCollectorDefs = ACHIEVEMENTS.filter((a) => a.id !== 'collector');
  for (const def of nonCollectorDefs) {
    const val = computeAchievementValue(def.id, logs, progress, goalMl, 0);
    const earnedTier = getTierForValue(def, val);
    const prevTier: AchievementTier = nextRecords[def.id]?.tier || 'none';
    if (TIER_RANK[earnedTier] > TIER_RANK[prevTier] && earnedTier !== 'none') {
      nextRecords[def.id] = {
        unlockedAt: new Date().toISOString(),
        tier: earnedTier,
      };
      newlyUnlocked.push({ def, tier: earnedTier });
    }
  }

  // Evaluasi Si Kolektor berdasarkan jumlah lencana selain dirinya yang sudah terbuka
  const unlockedCount = nonCollectorDefs.filter(
    (d) => Boolean(nextRecords[d.id])
  ).length;
  const collectorDef = ACHIEVEMENTS.find((a) => a.id === 'collector');
  if (collectorDef) {
    const collectorTier = getTierForValue(collectorDef, unlockedCount);
    const prevCollectorTier: AchievementTier = nextRecords[collectorDef.id]?.tier || 'none';
    if (
      TIER_RANK[collectorTier] > TIER_RANK[prevCollectorTier] &&
      collectorTier !== 'none'
    ) {
      nextRecords[collectorDef.id] = {
        unlockedAt: new Date().toISOString(),
        tier: collectorTier,
      };
      newlyUnlocked.push({ def: collectorDef, tier: collectorTier });
    }
  }

  return { nextRecords, newlyUnlocked };
}
