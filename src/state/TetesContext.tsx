import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import {
  AchievementTier,
  DailyBoosters,
  DrinkLog,
  DrinkType,
  DropiAccessoryId,
  DropiColorId,
  Profile,
  ScreenMode,
  SettingsState,
  TabId,
  TetesData,
  WaterLog,
} from '../lib/types';
import {
  clearState,
  createDefaultState,
  getLocalDateKey,
  isWithinActiveHours,
  loadState,
  migrateState,
  saveState,
} from '../lib/storage';
import {
  calculateDailyTargetMl,
  calculateEffectiveMl,
  calculateLevel,
  checkRapidIntake,
  DROPI_ACCESSORY_PRICES,
  DROPI_COLOR_PRICES,
  getLogEffectiveMl,
  getLogsForDate,
  getMinutesSinceLastLog,
  getMostFrequentDrinkType,
  getTotalMlForDate,
  GOAL_BONUS_DROPS,
  isWindDownActive,
  MAX_STREAK_FREEZES,
  RapidIntakeResult,
  resolveEffectiveDarkMode,
  STREAK_FREEZE_PRICE,
} from '../lib/hydration';
import {
  applyLogToProgress,
  reconcileStreakWithInfo,
  removeLogFromProgress,
} from '../lib/streak';
import { computeQuestsForToday, DAILY_QUEST_DEFS } from '../lib/quests';
import { AchievementDefinition, evaluateAchievements } from '../lib/achievements';
import { soundEngine, triggerHaptic } from '../lib/sound';

export interface DrinkEventFeedback {
  log: WaterLog;
  xpEarned: number;
  comboCount: number;
  justHitGoal: boolean;
  goalBonusXp: number;
  goalBonusDrops: number;
  newStreak: number;
  prevStreak: number;
  leveledUpTo: number | null;
  unlockedAchievements: {
    def: AchievementDefinition;
    tier: Exclude<AchievementTier, 'none'>;
  }[];
}

export interface StreakFreezeNotice {
  savedStreak: number;
  remainingFreezes: number;
  date: string;
}

export interface ShopPurchaseResult {
  ok: boolean;
  reason?: 'already_unlocked' | 'insufficient_drops' | 'max_reached';
}

interface ContextValue {
  data: TetesData;
  screen: ScreenMode;
  setScreen: (s: ScreenMode) => void;
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
  todayKey: string;
  todayLogs: WaterLog[];
  todayTotalMl: number;
  dailyTargetMl: number;
  dailyBoosters: DailyBoosters;
  todayPercent: number;
  minutesSinceLastDrink: number | null;
  withinActiveHours: boolean;
  isDarkMode: boolean;
  isWindDown: boolean;
  reminderDue: boolean;
  lastDrinkFeedback: DrinkEventFeedback | null;
  clearDrinkFeedback: () => void;
  streakFreezeNotice: StreakFreezeNotice | null;
  dismissStreakFreezeNotice: () => void;
  pendingLevelUp: number | null;
  dismissLevelUp: () => void;
  completeOnboarding: (profile: Profile, notifEnabled: boolean) => void;
  skipOnboarding: () => void;
  checkDrinkPace: (ml: number) => RapidIntakeResult;
  logWater: (ml: number, drinkType?: DrinkType) => DrinkEventFeedback;
  deleteLog: (id: string) => WaterLog | null;
  restoreLog: (log: WaterLog) => void;
  claimQuest: (questId: string) => void;
  toggleDailyBooster: (key: keyof DailyBoosters) => void;
  buyDropiColor: (colorId: DropiColorId) => ShopPurchaseResult;
  buyDropiAccessory: (accessoryId: DropiAccessoryId) => ShopPurchaseResult;
  buyStreakFreeze: () => ShopPurchaseResult;
  updateProfile: (patch: Partial<Profile>) => void;
  updateSettings: (patch: Partial<SettingsState>) => void;
  restoreFromBackup: (backupData: TetesData) => void;
  resetAllData: () => void;
}

type Action =
  | { type: 'SET_STATE'; payload: TetesData }
  | { type: 'UPDATE_PROFILE'; payload: Partial<Profile> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<SettingsState> }
  | { type: 'RECONCILE_DAY'; todayKey: string };

function reducer(state: TetesData, action: Action): TetesData {
  let next: TetesData;
  switch (action.type) {
    case 'SET_STATE':
      next = action.payload;
      break;
    case 'UPDATE_PROFILE':
      next = {
        ...state,
        profile: { ...state.profile, ...action.payload },
      };
      break;
    case 'UPDATE_SETTINGS':
      next = {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
      break;
    case 'RECONCILE_DAY': {
      const nextBoosters: DailyBoosters =
        state.dailyBoostersDate === action.todayKey
          ? state.dailyBoosters
          : { exercise: false, hotWeather: false };
      const targetMl = calculateDailyTargetMl(state.profile.goalMl, nextBoosters);
      const { nextProgress } = reconcileStreakWithInfo(
        {
          ...state.progress,
          freezes: state.streakFreezes,
          streakFreezes: state.streakFreezes,
        },
        action.todayKey
      );
      const nextQuests = computeQuestsForToday(
        state.quests,
        state.logs,
        targetMl,
        action.todayKey
      );
      next = {
        ...state,
        progress: nextProgress,
        streakFreezes: nextProgress.freezes,
        quests: nextQuests,
        dailyBoosters: nextBoosters,
        dailyBoostersDate: action.todayKey,
      };
      break;
    }
    default:
      return state;
  }
  saveState(next);
  return next;
}

const TetesContext = createContext<ContextValue | null>(null);

const ONESIGNAL_ALLOWED_ORIGIN = 'https://nugrahaadha971-beep.github.io';

function syncOneSignalUserTags(params: {
  targetMetToday?: boolean;
  currentStreak?: number;
  preferredDrink?: DrinkType;
  sleepTime?: string;
  wakeTime?: string;
  isWindDown?: boolean;
}): void {
  if (
    typeof window === 'undefined' ||
    window.location.origin !== ONESIGNAL_ALLOWED_ORIGIN
  ) {
    return;
  }

  try {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        const user = OneSignal?.User;
        if (!user) return;
        const tags: Record<string, string> = {};
        if (typeof params.targetMetToday === 'boolean') {
          await user.addTag?.(
            'target_met_today',
            params.targetMetToday ? 'true' : 'false'
          );
        }
        if (typeof params.currentStreak === 'number') {
          tags.current_streak = String(params.currentStreak);
        }
        if (params.preferredDrink) {
          tags.preferred_drink = params.preferredDrink;
        }
        if (params.sleepTime) {
          tags.sleep_time = params.sleepTime;
        }
        if (params.wakeTime) {
          tags.wake_time = params.wakeTime;
        }
        if (typeof params.isWindDown === 'boolean') {
          tags.is_wind_down = String(params.isWindDown);
        }
        if (Object.keys(tags).length > 0) {
          await user.addTags?.(tags);
        }
      } catch {
        // Abaikan error SDK OneSignal
      }
    });
  } catch {
    // Abaikan error akses OneSignalDeferred
  }
}

const REMINDER_MESSAGES = [
  'Dropi haus nih. Temani minum yuk!',
  'Waktunya isi ulang cairan tubuhmu!',
  'Segelas air bikin fokus balik lagi loh!',
  'Yuk glek-glek dulu biar tetap segar!',
];

export const TetesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [data, dispatch] = useReducer(reducer, undefined, () => {
    const loaded = loadState();
    const today = getLocalDateKey();
    const initialBoosters: DailyBoosters =
      loaded.dailyBoostersDate === today
        ? loaded.dailyBoosters
        : { exercise: false, hotWeather: false };
    const initialTargetMl = calculateDailyTargetMl(
      loaded.profile.goalMl,
      initialBoosters
    );
    const { nextProgress } = reconcileStreakWithInfo(
      {
        ...loaded.progress,
        freezes: loaded.streakFreezes,
        streakFreezes: loaded.streakFreezes,
      },
      today
    );
    return {
      ...loaded,
      progress: nextProgress,
      streakFreezes: nextProgress.freezes,
      quests: computeQuestsForToday(loaded.quests, loaded.logs, initialTargetMl, today),
      dailyBoosters: initialBoosters,
      dailyBoostersDate: today,
    };
  });

  const [screen, setScreen] = useState<ScreenMode>('splash');
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [now, setNow] = useState<Date>(() => new Date());
  const [lastDrinkFeedback, setLastDrinkFeedback] =
    useState<DrinkEventFeedback | null>(null);
  const [streakFreezeNotice, setStreakFreezeNotice] =
    useState<StreakFreezeNotice | null>(() => {
      const loaded = loadState();
      const today = getLocalDateKey();
      const { nextProgress, usedFreeze, savedStreak } = reconcileStreakWithInfo(
        {
          ...loaded.progress,
          freezes: loaded.streakFreezes,
          streakFreezes: loaded.streakFreezes,
        },
        today
      );
      if (usedFreeze) {
        return {
          savedStreak,
          remainingFreezes: nextProgress.freezes,
          date: today,
        };
      }
      return null;
    });
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);
  const [lastNotifiedMinute, setLastNotifiedMinute] = useState<number>(0);

  // Sinkronisasi simpanan & tema gelap (auto/light/dark)
  useEffect(() => {
    saveState(data);
  }, [data]);

  const isDarkMode = useMemo(
    () =>
      resolveEffectiveDarkMode(
        data.settings.themeMode,
        data.profile.wakeTime,
        data.profile.sleepTime,
        now
      ),
    [data.settings.themeMode, data.profile.wakeTime, data.profile.sleepTime, now]
  );

  const isWindDown = useMemo(
    () => isWindDownActive(data.profile.wakeTime, data.profile.sleepTime, now),
    [data.profile.wakeTime, data.profile.sleepTime, now]
  );

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDarkMode ? '#0F172A' : '#1CB0F6');
    }
  }, [isDarkMode]);

  // Unlock Web Audio pada interaksi pertama pengguna
  useEffect(() => {
    const handleFirstInteraction = () => {
      soundEngine.unlock();
    };
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Tick 30 detik + timer tepat di tengah malam lokal + visibilitychange
  useEffect(() => {
    const syncClock = () => setNow(new Date());

    const interval = window.setInterval(syncClock, 30000);

    const scheduleMidnight = () => {
      const curr = new Date();
      const nextMidnight = new Date(
        curr.getFullYear(),
        curr.getMonth(),
        curr.getDate() + 1,
        0,
        0,
        0,
        60
      );
      const msUntilMidnight = Math.max(100, nextMidnight.getTime() - curr.getTime());
      return window.setTimeout(() => {
        syncClock();
        midnightId = scheduleMidnight();
      }, msUntilMidnight);
    };

    let midnightId = scheduleMidnight();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncClock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', syncClock);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(midnightId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', syncClock);
    };
  }, []);

  const todayKey = useMemo(() => getLocalDateKey(now), [now]);

  // Reconcile saat berganti hari di tengah malam waktu lokal
  useEffect(() => {
    if (data.quests.date !== todayKey || data.dailyBoostersDate !== todayKey) {
      const { nextProgress, usedFreeze, savedStreak } = reconcileStreakWithInfo(
        {
          ...data.progress,
          freezes: data.streakFreezes,
          streakFreezes: data.streakFreezes,
        },
        todayKey
      );
      if (usedFreeze) {
        setStreakFreezeNotice({
          savedStreak,
          remainingFreezes: nextProgress.freezes,
          date: todayKey,
        });
      }
      dispatch({ type: 'RECONCILE_DAY', todayKey });
    }
  }, [todayKey, data.quests.date, data.dailyBoostersDate, data.progress, data.streakFreezes]);

  const todayLogs = useMemo(
    () =>
      getLogsForDate(data.logs, todayKey).sort(
        (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
      ),
    [data.logs, todayKey]
  );

  const todayTotalMl = useMemo(
    () => getTotalMlForDate(data.logs, todayKey),
    [data.logs, todayKey]
  );

  const dailyTargetMl = useMemo(
    () => calculateDailyTargetMl(data.profile.goalMl, data.dailyBoosters),
    [data.profile.goalMl, data.dailyBoosters]
  );

  const todayPercent = useMemo(() => {
    if (dailyTargetMl <= 0) return 0;
    return Math.min(100, Math.round((todayTotalMl / dailyTargetMl) * 100));
  }, [todayTotalMl, dailyTargetMl]);

  const minutesSinceLastDrink = useMemo(
    () => getMinutesSinceLastLog(todayLogs, now),
    [todayLogs, now]
  );

  const withinActiveHours = useMemo(
    () => isWithinActiveHours(data.profile.wakeTime, data.profile.sleepTime, now),
    [data.profile.wakeTime, data.profile.sleepTime, now]
  );

  const reminderDue = useMemo(() => {
    if (!data.profile.onboarded || !withinActiveHours) return false;
    if (todayTotalMl >= dailyTargetMl) return false;
    if (minutesSinceLastDrink === null) {
      const [wh, wm] = data.profile.wakeTime.split(':').map(Number);
      const wakeDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        wh || 6,
        wm || 30
      );
      const minsSinceWake = Math.floor((now.getTime() - wakeDate.getTime()) / 60000);
      return minsSinceWake >= data.settings.reminderMinutes;
    }
    return minutesSinceLastDrink >= data.settings.reminderMinutes;
  }, [
    data.profile.onboarded,
    data.profile.wakeTime,
    dailyTargetMl,
    data.settings.reminderMinutes,
    withinActiveHours,
    todayTotalMl,
    minutesSinceLastDrink,
    now,
  ]);

  const preferredDrink = useMemo(
    () => getMostFrequentDrinkType(data.logs),
    [data.logs]
  );

  // Sinkronisasi tag pengguna ke OneSignal Web Push SDK (khusus origin produksi)
  useEffect(() => {
    syncOneSignalUserTags({
      targetMetToday: dailyTargetMl > 0 && todayTotalMl >= dailyTargetMl,
      currentStreak: data.progress.streak,
      preferredDrink,
      sleepTime: data.profile.sleepTime,
      wakeTime: data.profile.wakeTime,
      isWindDown,
    });
  }, [
    todayTotalMl,
    dailyTargetMl,
    data.progress.streak,
    preferredDrink,
    todayKey,
    data.profile.sleepTime,
    data.profile.wakeTime,
    isWindDown,
  ]);

  useEffect(() => {
    if (!reminderDue || !data.settings.notifications) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }
    const nowBucket = Math.floor(now.getTime() / (data.settings.reminderMinutes * 60000));
    if (nowBucket === lastNotifiedMinute) return;

    const msg =
      REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
    try {
      new Notification('Tetes — Pengingat Minum', {
        body: msg,
        icon: './pwa-192x192.png',
      });
      setLastNotifiedMinute(nowBucket);
    } catch {
      // Abaikan jika browser membatasi Notification constructor
    }
  }, [
    reminderDue,
    data.settings.notifications,
    data.settings.reminderMinutes,
    now,
    lastNotifiedMinute,
  ]);

  const completeOnboarding = useCallback(
    (profile: Profile, notifEnabled: boolean) => {
      const next: TetesData = {
        ...data,
        profile: { ...profile, onboarded: true },
        settings: { ...data.settings, notifications: notifEnabled },
      };
      dispatch({ type: 'SET_STATE', payload: next });
      setScreen('app');
      setActiveTab('home');
    },
    [data]
  );

  const skipOnboarding = useCallback(() => {
    const next: TetesData = {
      ...data,
      profile: {
        ...data.profile,
        name: data.profile.name || 'Teman',
        onboarded: true,
      },
    };
    dispatch({ type: 'SET_STATE', payload: next });
    setScreen('app');
    setActiveTab('home');
  }, [data]);

  const logWater = useCallback(
    (ml: number, drinkType: DrinkType = 'water'): DrinkEventFeedback => {
      const rawAmountMl = Math.max(10, Math.min(2000, Math.round(ml)));
      const effectiveMl = calculateEffectiveMl(rawAmountMl, drinkType);
      const nowDate = new Date();
      const key = getLocalDateKey(nowDate);
      const targetMl =
        key === todayKey
          ? dailyTargetMl
          : calculateDailyTargetMl(
              data.profile.goalMl,
              data.dailyBoostersDate === key ? data.dailyBoosters : undefined
            );

      const newLog: DrinkLog = {
        id: `${nowDate.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: nowDate.toISOString(),
        ml: effectiveMl,
        rawAmountMl,
        drinkType,
        effectiveMl,
      };

      const prevTotal = getTotalMlForDate(data.logs, key);
      const nextLogs = [newLog, ...data.logs];
      const nextTotal = prevTotal + effectiveMl;

      const prevLevel = data.progress.level;
      const {
        nextProgress: rawNextProgress,
        justHitGoal,
        goalBonusXp,
        prevStreak,
        newStreak,
      } = applyLogToProgress(
        {
          ...data.progress,
          freezes: data.streakFreezes,
          streakFreezes: data.streakFreezes,
        },
        prevTotal,
        nextTotal,
        targetMl,
        key,
        10
      );

      const shouldAwardGoalDrops =
        justHitGoal && data.progress.lastGoalDropsDate !== key;
      const goalBonusDrops = shouldAwardGoalDrops ? GOAL_BONUS_DROPS : 0;

      const nextProgress = {
        ...rawNextProgress,
        streakFreezes: rawNextProgress.freezes,
        lastGoalDropsDate: shouldAwardGoalDrops
          ? key
          : rawNextProgress.lastGoalDropsDate ?? null,
      };

      // Hitung combo hari ini (catatan berurutan tanpa jeda > 3 jam)
      const todaysSorted = getLogsForDate(nextLogs, key).sort(
        (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
      );
      let comboCount = 1;
      for (let i = todaysSorted.length - 1; i > 0; i--) {
        const diffMin =
          (new Date(todaysSorted[i].ts).getTime() -
            new Date(todaysSorted[i - 1].ts).getTime()) /
          60000;
        if (diffMin <= 180) {
          comboCount++;
        } else {
          break;
        }
      }

      const nextQuests = computeQuestsForToday(
        data.quests,
        nextLogs,
        targetMl,
        key
      );

      const { nextRecords, newlyUnlocked } = evaluateAchievements(
        data.achievements,
        nextLogs,
        nextProgress,
        targetMl
      );

      const nextState: TetesData = {
        ...data,
        logs: nextLogs,
        progress: nextProgress,
        streakFreezes: nextProgress.freezes,
        drops: data.drops + goalBonusDrops,
        quests: nextQuests,
        achievements: nextRecords,
      };

      dispatch({ type: 'SET_STATE', payload: nextState });
      setNow(nowDate);

      if (justHitGoal) {
        syncOneSignalUserTags({
          targetMetToday: true,
          currentStreak: nextProgress.streak,
          preferredDrink: getMostFrequentDrinkType(nextLogs),
        });
      }

      soundEngine.play('glug', data.settings.sound);
      triggerHaptic(data.settings.haptics, 30);

      const leveledUpTo =
        nextProgress.level > prevLevel ? nextProgress.level : null;
      if (leveledUpTo && !justHitGoal) {
        setPendingLevelUp(leveledUpTo);
      }

      const feedback: DrinkEventFeedback = {
        log: newLog,
        xpEarned: 10,
        comboCount,
        justHitGoal,
        goalBonusXp,
        goalBonusDrops,
        newStreak,
        prevStreak,
        leveledUpTo,
        unlockedAchievements: newlyUnlocked,
      };
      setLastDrinkFeedback(feedback);
      return feedback;
    },
    [data, todayKey, dailyTargetMl]
  );

  const deleteLog = useCallback(
    (id: string): WaterLog | null => {
      const target = data.logs.find((l) => l.id === id);
      if (!target) return null;

      const logDateKey = getLocalDateKey(new Date(target.ts));
      const nextLogs = data.logs.filter((l) => l.id !== id);
      const nextLogDayTotal = getTotalMlForDate(nextLogs, logDateKey);
      const logTargetMl =
        logDateKey === todayKey ? dailyTargetMl : data.profile.goalMl;

      const nextProgress = removeLogFromProgress(
        data.progress,
        nextLogDayTotal,
        logTargetMl,
        logDateKey,
        10
      );

      const nextQuests = computeQuestsForToday(
        data.quests,
        nextLogs,
        dailyTargetMl,
        todayKey
      );

      const nextState: TetesData = {
        ...data,
        logs: nextLogs,
        progress: nextProgress,
        quests: nextQuests,
      };
      dispatch({ type: 'SET_STATE', payload: nextState });
      soundEngine.play('click', data.settings.sound);
      return target;
    },
    [data, todayKey, dailyTargetMl]
  );

  const restoreLog = useCallback(
    (log: WaterLog) => {
      const exists = data.logs.some((l) => l.id === log.id);
      if (exists) return;

      const logDateKey = getLocalDateKey(new Date(log.ts));
      const prevTotal = getTotalMlForDate(data.logs, logDateKey);
      const nextLogs = [log, ...data.logs];
      const nextTotal = prevTotal + getLogEffectiveMl(log);
      const logTargetMl =
        logDateKey === todayKey ? dailyTargetMl : data.profile.goalMl;

      const { nextProgress } = applyLogToProgress(
        data.progress,
        prevTotal,
        nextTotal,
        logTargetMl,
        logDateKey,
        10
      );

      const nextQuests = computeQuestsForToday(
        data.quests,
        nextLogs,
        dailyTargetMl,
        todayKey
      );

      dispatch({
        type: 'SET_STATE',
        payload: {
          ...data,
          logs: nextLogs,
          progress: nextProgress,
          quests: nextQuests,
        },
      });
      soundEngine.play('pop', data.settings.sound);
    },
    [data, todayKey, dailyTargetMl]
  );

  const claimQuest = useCallback(
    (questId: string) => {
      const def = DAILY_QUEST_DEFS.find((d) => d.id === questId);
      const item = data.quests.items.find((i) => i.id === questId);
      if (!def || !item || item.claimed || item.progress < def.target) return;

      const prevLevel = data.progress.level;
      const nextXp = data.progress.xp + def.rewardXp;
      const nextLevel = calculateLevel(nextXp);
      const nextFreezes = Math.min(
        MAX_STREAK_FREEZES,
        data.streakFreezes + (def.rewardFreeze || 0)
      );
      const nextDrops = data.drops + def.rewardDrops;

      const nextItems = data.quests.items.map((i) =>
        i.id === questId ? { ...i, claimed: true } : i
      );

      dispatch({
        type: 'SET_STATE',
        payload: {
          ...data,
          drops: nextDrops,
          streakFreezes: nextFreezes,
          progress: {
            ...data.progress,
            xp: nextXp,
            level: nextLevel,
            freezes: nextFreezes,
            streakFreezes: nextFreezes,
          },
          quests: {
            ...data.quests,
            items: nextItems,
          },
        },
      });

      soundEngine.play('pop', data.settings.sound);
      triggerHaptic(data.settings.haptics, [20, 40, 20]);
      if (nextLevel > prevLevel) {
        setPendingLevelUp(nextLevel);
        soundEngine.play('ding', data.settings.sound);
      }
    },
    [data]
  );

  const toggleDailyBooster = useCallback(
    (key: keyof DailyBoosters) => {
      const currentBoosters: DailyBoosters =
        data.dailyBoostersDate === todayKey
          ? data.dailyBoosters
          : { exercise: false, hotWeather: false };

      const nextBoosters: DailyBoosters = {
        ...currentBoosters,
        [key]: !currentBoosters[key],
      };

      const nextTargetMl = calculateDailyTargetMl(
        data.profile.goalMl,
        nextBoosters
      );

      let nextProgress = data.progress;
      if (data.progress.lastGoalDate === todayKey && todayTotalMl < nextTargetMl) {
        nextProgress = removeLogFromProgress(
          data.progress,
          todayTotalMl,
          nextTargetMl,
          todayKey,
          0
        );
      } else if (
        data.progress.lastGoalDate !== todayKey &&
        todayTotalMl >= nextTargetMl
      ) {
        nextProgress = applyLogToProgress(
          data.progress,
          todayTotalMl,
          todayTotalMl,
          nextTargetMl,
          todayKey,
          0
        ).nextProgress;
      }

      const nextQuests = computeQuestsForToday(
        data.quests,
        data.logs,
        nextTargetMl,
        todayKey
      );

      dispatch({
        type: 'SET_STATE',
        payload: {
          ...data,
          progress: nextProgress,
          quests: nextQuests,
          dailyBoosters: nextBoosters,
          dailyBoostersDate: todayKey,
        },
      });
      soundEngine.play('click', data.settings.sound);
    },
    [data, todayKey, todayTotalMl]
  );

  const buyDropiColor = useCallback(
    (colorId: DropiColorId): ShopPurchaseResult => {
      if (data.unlockedColors.includes(colorId)) {
        dispatch({ type: 'UPDATE_PROFILE', payload: { dropiColor: colorId } });
        soundEngine.play('pop', data.settings.sound);
        return { ok: true, reason: 'already_unlocked' };
      }

      const price = DROPI_COLOR_PRICES[colorId] ?? 0;
      if (data.drops < price) {
        soundEngine.play('click', data.settings.sound);
        return { ok: false, reason: 'insufficient_drops' };
      }

      dispatch({
        type: 'SET_STATE',
        payload: {
          ...data,
          drops: data.drops - price,
          unlockedColors: [...data.unlockedColors, colorId],
          profile: {
            ...data.profile,
            dropiColor: colorId,
          },
        },
      });
      soundEngine.play('pop', data.settings.sound);
      triggerHaptic(data.settings.haptics, [20, 30]);
      return { ok: true };
    },
    [data]
  );

  const buyDropiAccessory = useCallback(
    (accessoryId: DropiAccessoryId): ShopPurchaseResult => {
      if (data.unlockedAccessories.includes(accessoryId)) {
        dispatch({
          type: 'UPDATE_PROFILE',
          payload: { dropiAccessory: accessoryId },
        });
        soundEngine.play('pop', data.settings.sound);
        return { ok: true, reason: 'already_unlocked' };
      }

      const price = DROPI_ACCESSORY_PRICES[accessoryId] ?? 0;
      if (data.drops < price) {
        soundEngine.play('click', data.settings.sound);
        return { ok: false, reason: 'insufficient_drops' };
      }

      dispatch({
        type: 'SET_STATE',
        payload: {
          ...data,
          drops: data.drops - price,
          unlockedAccessories: [...data.unlockedAccessories, accessoryId],
          profile: {
            ...data.profile,
            dropiAccessory: accessoryId,
          },
        },
      });
      soundEngine.play('pop', data.settings.sound);
      triggerHaptic(data.settings.haptics, [20, 30]);
      return { ok: true };
    },
    [data]
  );

  const buyStreakFreeze = useCallback((): ShopPurchaseResult => {
    if (data.streakFreezes >= MAX_STREAK_FREEZES) {
      soundEngine.play('click', data.settings.sound);
      return { ok: false, reason: 'max_reached' };
    }

    if (data.drops < STREAK_FREEZE_PRICE) {
      soundEngine.play('click', data.settings.sound);
      return { ok: false, reason: 'insufficient_drops' };
    }

    const nextFreezes = Math.min(MAX_STREAK_FREEZES, data.streakFreezes + 1);
    dispatch({
      type: 'SET_STATE',
      payload: {
        ...data,
        drops: data.drops - STREAK_FREEZE_PRICE,
        streakFreezes: nextFreezes,
        progress: {
          ...data.progress,
          freezes: nextFreezes,
          streakFreezes: nextFreezes,
        },
      },
    });
    soundEngine.play('pop', data.settings.sound);
    triggerHaptic(data.settings.haptics, [20, 30]);
    return { ok: true };
  }, [data]);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: patch });
  }, []);

  const updateSettings = useCallback((patch: Partial<SettingsState>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: patch });
  }, []);

  const restoreFromBackup = useCallback((backupData: TetesData) => {
    const normalized = migrateState(backupData);
    const today = getLocalDateKey();
    const boosters: DailyBoosters =
      normalized.dailyBoostersDate === today
        ? normalized.dailyBoosters
        : { exercise: false, hotWeather: false };
    const targetMl = calculateDailyTargetMl(normalized.profile.goalMl, boosters);
    const { nextProgress, usedFreeze, savedStreak } = reconcileStreakWithInfo(
      {
        ...normalized.progress,
        freezes: normalized.streakFreezes,
        streakFreezes: normalized.streakFreezes,
      },
      today
    );
    const nextState: TetesData = {
      ...normalized,
      progress: nextProgress,
      streakFreezes: nextProgress.freezes,
      quests: computeQuestsForToday(
        normalized.quests,
        normalized.logs,
        targetMl,
        today
      ),
      dailyBoosters: boosters,
      dailyBoostersDate: today,
    };
    dispatch({ type: 'SET_STATE', payload: nextState });
    setLastDrinkFeedback(null);
    setPendingLevelUp(null);
    setStreakFreezeNotice(
      usedFreeze
        ? {
            savedStreak,
            remainingFreezes: nextProgress.freezes,
            date: today,
          }
        : null
    );
    setScreen(nextState.profile.onboarded ? 'app' : 'onboarding');
    setActiveTab('home');
    soundEngine.play('pop', nextState.settings.sound);
  }, []);

  const resetAllData = useCallback(() => {
    clearState();
    const fresh = createDefaultState();
    dispatch({ type: 'SET_STATE', payload: fresh });
    setLastDrinkFeedback(null);
    setStreakFreezeNotice(null);
    setPendingLevelUp(null);
    setScreen('onboarding');
    setActiveTab('home');
  }, []);

  const clearDrinkFeedback = useCallback(() => {
    setLastDrinkFeedback(null);
  }, []);

  const dismissStreakFreezeNotice = useCallback(() => {
    setStreakFreezeNotice(null);
  }, []);

  const dismissLevelUp = useCallback(() => {
    setPendingLevelUp(null);
  }, []);

  const checkDrinkPace = useCallback(
    (ml: number): RapidIntakeResult => checkRapidIntake(data.logs, ml, Date.now()),
    [data.logs]
  );

  const value: ContextValue = {
    data,
    screen,
    setScreen,
    activeTab,
    setActiveTab,
    todayKey,
    todayLogs,
    todayTotalMl,
    dailyTargetMl,
    dailyBoosters: data.dailyBoosters,
    todayPercent,
    minutesSinceLastDrink,
    withinActiveHours,
    isDarkMode,
    isWindDown,
    reminderDue,
    lastDrinkFeedback,
    clearDrinkFeedback,
    streakFreezeNotice,
    dismissStreakFreezeNotice,
    pendingLevelUp,
    dismissLevelUp,
    completeOnboarding,
    skipOnboarding,
    checkDrinkPace,
    logWater,
    deleteLog,
    restoreLog,
    claimQuest,
    toggleDailyBooster,
    buyDropiColor,
    buyDropiAccessory,
    buyStreakFreeze,
    updateProfile,
    updateSettings,
    restoreFromBackup,
    resetAllData,
  };

  return <TetesContext.Provider value={value}>{children}</TetesContext.Provider>;
};

export function useTetes(): ContextValue {
  const ctx = useContext(TetesContext);
  if (!ctx) throw new Error('useTetes harus digunakan di dalam TetesProvider');
  return ctx;
}
