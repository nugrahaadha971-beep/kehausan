import { DropiColorId, TetesData } from './types';
import {
  normalizeDropiAccessory,
  normalizeDropiColor,
} from '../components/DropiMascot';

const LEGACY_COLOR_MAP: Record<string, DropiColorId> = {
  sky: 'blue',
  aqua: 'teal',
  mint: 'green',
  berry: 'purple',
  sun: 'yellow',
  coral: 'pink',
};

export const STORAGE_KEY = 'tetes:v1';
export const CURRENT_VERSION = 1;

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  return getLocalDateKey(dt);
}

export function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isWithinActiveHours(
  wakeTime: string,
  sleepTime: string,
  now: Date = new Date()
): boolean {
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const wakeMin = parseTimeToMinutes(wakeTime);
  const sleepMin = parseTimeToMinutes(sleepTime);

  if (wakeMin <= sleepMin) {
    return currentMin >= wakeMin && currentMin < sleepMin;
  }
  // Wraps past midnight (e.g. wake 07:00, sleep 01:00)
  return currentMin >= wakeMin || currentMin < sleepMin;
}

export function createDefaultState(): TetesData {
  const today = getLocalDateKey();
  return {
    version: CURRENT_VERSION,
    profile: {
      name: '',
      weightKg: 60,
      activity: 'sedang',
      wakeTime: '06:30',
      sleepTime: '22:30',
      cupMl: 250,
      goalMl: 2400,
      reason: 'energi',
      dropiColor: 'blue',
      dropiAccessory: 'none',
      onboarded: false,
    },
    logs: [],
    progress: {
      xp: 0,
      level: 1,
      streak: 0,
      longestStreak: 0,
      freezes: 1, // Hadiah awal 1 Pelindung Streak
      lastGoalDate: null,
      lastFreezeUsedDate: null,
      prevStreakBeforeToday: 0,
      prevGoalDateBeforeToday: null,
    },
    achievements: {},
    quests: {
      date: today,
      items: [
        { id: 'morning_3', progress: 0, claimed: false },
        { id: 'goal_100', progress: 0, claimed: false },
        { id: 'afternoon_500', progress: 0, claimed: false },
      ],
    },
    settings: {
      sound: true,
      haptics: true,
      dark: false,
      reminderMinutes: 90,
      notifications: false,
    },
  };
}

export function migrateState(raw: unknown): TetesData {
  const base = createDefaultState();
  if (!raw || typeof raw !== 'object') return base;

  const obj = raw as Partial<TetesData>;
  return {
    version: CURRENT_VERSION,
    profile: {
      ...base.profile,
      ...(obj.profile || {}),
      dropiColor: (() => {
        const rawColor = obj.profile?.dropiColor;
        if (typeof rawColor === 'string' && rawColor in LEGACY_COLOR_MAP) {
          return LEGACY_COLOR_MAP[rawColor];
        }
        return normalizeDropiColor(rawColor);
      })(),
      dropiAccessory: normalizeDropiAccessory(obj.profile?.dropiAccessory),
    },
    logs: Array.isArray(obj.logs)
      ? obj.logs.filter(
          (l) =>
            l &&
            typeof l.id === 'string' &&
            typeof l.ts === 'string' &&
            typeof l.ml === 'number' &&
            Number.isFinite(l.ml) &&
            l.ml > 0
        )
      : [],
    progress: {
      ...base.progress,
      ...(obj.progress || {}),
    },
    achievements:
      obj.achievements && typeof obj.achievements === 'object'
        ? obj.achievements
        : {},
    quests:
      obj.quests && typeof obj.quests.date === 'string' && Array.isArray(obj.quests.items)
        ? obj.quests
        : base.quests,
    settings: {
      ...base.settings,
      ...(obj.settings || {}),
    },
  };
}

export function loadState(): TetesData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    return migrateState(parsed);
  } catch {
    return createDefaultState();
  }
}

export function saveState(state: TetesData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Abaikan error penyimpanan di mode privat/terbatas
  }
}

export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Abaikan error
  }
}

export function exportStateAsJson(state: TetesData): void {
  try {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tetes-hidrasi-${getLocalDateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // Abaikan error
  }
}
