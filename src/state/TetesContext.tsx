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
  saveState,
} from '../lib/storage';
import {
  calculateLevel,
  getLogsForDate,
  getMinutesSinceLastLog,
  getTotalMlForDate,
} from '../lib/hydration';
import {
  applyLogToProgress,
  reconcileStreak,
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
  newStreak: number;
  prevStreak: number;
  leveledUpTo: number | null;
  unlockedAchievements: {
    def: AchievementDefinition;
    tier: Exclude<AchievementTier, 'none'>;
  }[];
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
  todayPercent: number;
  minutesSinceLastDrink: number | null;
  withinActiveHours: boolean;
  reminderDue: boolean;
  lastDrinkFeedback: DrinkEventFeedback | null;
  clearDrinkFeedback: () => void;
  pendingLevelUp: number | null;
  dismissLevelUp: () => void;
  completeOnboarding: (profile: Profile, notifEnabled: boolean) => void;
  skipOnboarding: () => void;
  logWater: (ml: number) => DrinkEventFeedback;
  deleteLog: (id: string) => WaterLog | null;
  restoreLog: (log: WaterLog) => void;
  claimQuest: (questId: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updateSettings: (patch: Partial<SettingsState>) => void;
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
      const reconciledProgress = reconcileStreak(state.progress, action.todayKey);
      const nextQuests = computeQuestsForToday(
        state.quests,
        state.logs,
        state.profile.goalMl,
        action.todayKey
      );
      next = {
        ...state,
        progress: reconciledProgress,
        quests: nextQuests,
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
    return {
      ...loaded,
      progress: reconcileStreak(loaded.progress, today),
      quests: computeQuestsForToday(loaded.quests, loaded.logs, loaded.profile.goalMl, today),
    };
  });

  const [screen, setScreen] = useState<ScreenMode>('splash');
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [now, setNow] = useState<Date>(() => new Date());
  const [lastDrinkFeedback, setLastDrinkFeedback] =
    useState<DrinkEventFeedback | null>(null);
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);
  const [lastNotifiedMinute, setLastNotifiedMinute] = useState<number>(0);

  // Sinkronisasi simpanan & tema gelap
  useEffect(() => {
    saveState(data);
  }, [data]);

  useEffect(() => {
    const root = document.documentElement;
    if (data.settings.dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', data.settings.dark ? '#0F172A' : '#1CB0F6');
    }
  }, [data.settings.dark]);

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
    if (data.quests.date !== todayKey) {
      dispatch({ type: 'RECONCILE_DAY', todayKey });
    }
  }, [todayKey, data.quests.date]);

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

  const todayPercent = useMemo(() => {
    if (data.profile.goalMl <= 0) return 0;
    return Math.min(100, Math.round((todayTotalMl / data.profile.goalMl) * 100));
  }, [todayTotalMl, data.profile.goalMl]);

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
    if (todayTotalMl >= data.profile.goalMl) return false;
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
    data.profile.goalMl,
    data.settings.reminderMinutes,
    withinActiveHours,
    todayTotalMl,
    minutesSinceLastDrink,
    now,
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
    (ml: number): DrinkEventFeedback => {
      const clampedMl = Math.max(10, Math.min(2000, Math.round(ml)));
      const nowDate = new Date();
      const key = getLocalDateKey(nowDate);
      const newLog: WaterLog = {
        id: `${nowDate.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: nowDate.toISOString(),
        ml: clampedMl,
      };

      const prevTotal = getTotalMlForDate(data.logs, key);
      const nextLogs = [newLog, ...data.logs];
      const nextTotal = prevTotal + clampedMl;

      const prevLevel = data.progress.level;
      const {
        nextProgress,
        justHitGoal,
        goalBonusXp,
        prevStreak,
        newStreak,
      } = applyLogToProgress(
        data.progress,
        prevTotal,
        nextTotal,
        data.profile.goalMl,
        key,
        10
      );

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
        data.profile.goalMl,
        key
      );

      const { nextRecords, newlyUnlocked } = evaluateAchievements(
        data.achievements,
        nextLogs,
        nextProgress,
        data.profile.goalMl
      );

      const nextState: TetesData = {
        ...data,
        logs: nextLogs,
        progress: nextProgress,
        quests: nextQuests,
        achievements: nextRecords,
      };

      dispatch({ type: 'SET_STATE', payload: nextState });
      setNow(nowDate);

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
        newStreak,
        prevStreak,
        leveledUpTo,
        unlockedAchievements: newlyUnlocked,
      };
      setLastDrinkFeedback(feedback);
      return feedback;
    },
    [data]
  );

  const deleteLog = useCallback(
    (id: string): WaterLog | null => {
      const target = data.logs.find((l) => l.id === id);
      if (!target) return null;

      const logDateKey = getLocalDateKey(new Date(target.ts));
      const nextLogs = data.logs.filter((l) => l.id !== id);
      const nextLogDayTotal = getTotalMlForDate(nextLogs, logDateKey);

      const nextProgress = removeLogFromProgress(
        data.progress,
        nextLogDayTotal,
        data.profile.goalMl,
        logDateKey,
        10
      );

      const nextQuests = computeQuestsForToday(
        data.quests,
        nextLogs,
        data.profile.goalMl,
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
    [data, todayKey]
  );

  const restoreLog = useCallback(
    (log: WaterLog) => {
      const exists = data.logs.some((l) => l.id === log.id);
      if (exists) return;

      const logDateKey = getLocalDateKey(new Date(log.ts));
      const prevTotal = getTotalMlForDate(data.logs, logDateKey);
      const nextLogs = [log, ...data.logs];
      const nextTotal = prevTotal + log.ml;

      const { nextProgress } = applyLogToProgress(
        data.progress,
        prevTotal,
        nextTotal,
        data.profile.goalMl,
        logDateKey,
        10
      );

      const nextQuests = computeQuestsForToday(
        data.quests,
        nextLogs,
        data.profile.goalMl,
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
    [data, todayKey]
  );

  const claimQuest = useCallback(
    (questId: string) => {
      const def = DAILY_QUEST_DEFS.find((d) => d.id === questId);
      const item = data.quests.items.find((i) => i.id === questId);
      if (!def || !item || item.claimed || item.progress < def.target) return;

      const prevLevel = data.progress.level;
      const nextXp = data.progress.xp + def.rewardXp;
      const nextLevel = calculateLevel(nextXp);
      const nextFreezes = Math.min(3, data.progress.freezes + (def.rewardFreeze || 0));

      const nextItems = data.quests.items.map((i) =>
        i.id === questId ? { ...i, claimed: true } : i
      );

      dispatch({
        type: 'SET_STATE',
        payload: {
          ...data,
          progress: {
            ...data.progress,
            xp: nextXp,
            level: nextLevel,
            freezes: nextFreezes,
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

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: patch });
  }, []);

  const updateSettings = useCallback((patch: Partial<SettingsState>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: patch });
  }, []);

  const resetAllData = useCallback(() => {
    clearState();
    const fresh = createDefaultState();
    dispatch({ type: 'SET_STATE', payload: fresh });
    setLastDrinkFeedback(null);
    setPendingLevelUp(null);
    setScreen('onboarding');
    setActiveTab('home');
  }, []);

  const clearDrinkFeedback = useCallback(() => {
    setLastDrinkFeedback(null);
  }, []);

  const dismissLevelUp = useCallback(() => {
    setPendingLevelUp(null);
  }, []);

  const value: ContextValue = {
    data,
    screen,
    setScreen,
    activeTab,
    setActiveTab,
    todayKey,
    todayLogs,
    todayTotalMl,
    todayPercent,
    minutesSinceLastDrink,
    withinActiveHours,
    reminderDue,
    lastDrinkFeedback,
    clearDrinkFeedback,
    pendingLevelUp,
    dismissLevelUp,
    completeOnboarding,
    skipOnboarding,
    logWater,
    deleteLog,
    restoreLog,
    claimQuest,
    updateProfile,
    updateSettings,
    resetAllData,
  };

  return <TetesContext.Provider value={value}>{children}</TetesContext.Provider>;
};

export function useTetes(): ContextValue {
  const ctx = useContext(TetesContext);
  if (!ctx) throw new Error('useTetes harus digunakan di dalam TetesProvider');
  return ctx;
}
