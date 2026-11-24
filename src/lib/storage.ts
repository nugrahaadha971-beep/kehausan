import { DropiAccessoryId, DropiColorId, TetesData, ThemeMode } from './types';
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
      wakeTime: '05:00',
      sleepTime: '22:00',
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
      streakFreezes: 1,
      lastGoalDate: null,
      lastGoalDropsDate: null,
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
      themeMode: 'auto',
      reminderMinutes: 90,
      notifications: false,
    },
    dailyBoosters: {
      exercise: false,
      hotWeather: false,
    },
    dailyBoostersDate: today,
    drops: 50,
    unlockedColors: ['blue', 'teal'],
    unlockedAccessories: ['none'],
    streakFreezes: 1,
  };
}

export function migrateState(raw: unknown): TetesData {
  const base = createDefaultState();
  if (!raw || typeof raw !== 'object') return base;

  const obj = raw as Partial<TetesData>;
  const today = getLocalDateKey();
  const isSameBoosterDay =
    typeof obj.dailyBoostersDate === 'string' && obj.dailyBoostersDate === today;

  const migratedColor = (() => {
    const rawColor = obj.profile?.dropiColor;
    if (typeof rawColor === 'string' && rawColor in LEGACY_COLOR_MAP) {
      return LEGACY_COLOR_MAP[rawColor];
    }
    return normalizeDropiColor(rawColor);
  })();

  const migratedAccessory = normalizeDropiAccessory(obj.profile?.dropiAccessory);

  const rawFreezes =
    typeof obj.streakFreezes === 'number' && Number.isFinite(obj.streakFreezes)
      ? obj.streakFreezes
      : typeof obj.progress?.streakFreezes === 'number' &&
          Number.isFinite(obj.progress.streakFreezes)
        ? obj.progress.streakFreezes
        : typeof obj.progress?.freezes === 'number' &&
            Number.isFinite(obj.progress.freezes)
          ? obj.progress.freezes
          : base.streakFreezes;
  const clampedFreezes = Math.max(0, Math.min(3, Math.floor(rawFreezes)));

  const unlockedColorsSet = new Set<DropiColorId>(['blue', 'teal', migratedColor]);
  if (Array.isArray(obj.unlockedColors)) {
    for (const c of obj.unlockedColors) {
      const normalized =
        typeof c === 'string' && c in LEGACY_COLOR_MAP
          ? LEGACY_COLOR_MAP[c]
          : normalizeDropiColor(c);
      unlockedColorsSet.add(normalized);
    }
  }

  const unlockedAccessoriesSet = new Set<DropiAccessoryId>(['none', migratedAccessory]);
  if (Array.isArray(obj.unlockedAccessories)) {
    for (const a of obj.unlockedAccessories) {
      unlockedAccessoriesSet.add(normalizeDropiAccessory(a));
    }
  }

  return {
    version: CURRENT_VERSION,
    profile: {
      ...base.profile,
      ...(obj.profile || {}),
      dropiColor: migratedColor,
      dropiAccessory: migratedAccessory,
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
      freezes: clampedFreezes,
      streakFreezes: clampedFreezes,
    },
    achievements:
      obj.achievements && typeof obj.achievements === 'object'
        ? obj.achievements
        : {},
    quests:
      obj.quests && typeof obj.quests.date === 'string' && Array.isArray(obj.quests.items)
        ? obj.quests
        : base.quests,
    settings: (() => {
      const rawThemeMode = obj.settings?.themeMode;
      const migratedThemeMode: ThemeMode =
        rawThemeMode === 'auto' || rawThemeMode === 'light' || rawThemeMode === 'dark'
          ? rawThemeMode
          : obj.settings?.dark === true
            ? 'dark'
            : 'auto';
      return {
        ...base.settings,
        ...(obj.settings || {}),
        themeMode: migratedThemeMode,
      };
    })(),
    dailyBoosters:
      isSameBoosterDay && obj.dailyBoosters && typeof obj.dailyBoosters === 'object'
        ? {
            exercise: Boolean(obj.dailyBoosters.exercise),
            hotWeather: Boolean(obj.dailyBoosters.hotWeather),
          }
        : base.dailyBoosters,
    dailyBoostersDate: today,
    drops:
      typeof obj.drops === 'number' && Number.isFinite(obj.drops)
        ? Math.max(0, Math.floor(obj.drops))
        : base.drops,
    unlockedColors: Array.from(unlockedColorsSet),
    unlockedAccessories: Array.from(unlockedAccessoriesSet),
    streakFreezes: clampedFreezes,
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

export function validateBackupPayload(
  raw: unknown
): { valid: true; data: TetesData } | { valid: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      valid: false,
      error: 'Format file cadangan tidak valid. Pastikan file berasal dari ekspor Tetes.',
    };
  }

  const obj = raw as Record<string, unknown>;
  const hasProfile =
    obj.profile !== null &&
    typeof obj.profile === 'object' &&
    !Array.isArray(obj.profile);
  const hasLogs = Array.isArray(obj.logs);
  const hasProgress =
    obj.progress !== null &&
    typeof obj.progress === 'object' &&
    !Array.isArray(obj.progress);
  const hasSettings =
    obj.settings !== null &&
    typeof obj.settings === 'object' &&
    !Array.isArray(obj.settings);

  if (!hasProfile || !hasLogs || !hasProgress || !hasSettings) {
    return {
      valid: false,
      error: 'Struktur cadangan JSON tidak lengkap atau bukan file cadangan Tetes.',
    };
  }

  const profileObj = obj.profile as Record<string, unknown>;
  const progressObj = obj.progress as Record<string, unknown>;
  if (
    typeof profileObj.goalMl !== 'number' ||
    !Number.isFinite(profileObj.goalMl) ||
    typeof progressObj.xp !== 'number' ||
    !Number.isFinite(progressObj.xp)
  ) {
    return {
      valid: false,
      error: 'Data profil atau progres pada file cadangan tidak valid.',
    };
  }

  return {
    valid: true,
    data: migrateState(raw),
  };
}

export function exportStateAsJson(state: TetesData): void {
  try {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tetes-backup-${getLocalDateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // Abaikan error
  }
}
