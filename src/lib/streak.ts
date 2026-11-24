import { ProgressState, WaterLog } from './types';
import { addDaysToDateKey, getLocalDateKey } from './storage';
import { calculateLevel, getTotalMlForDate } from './hydration';

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];

export function getNextStreakMilestone(streak: number): number {
  for (const m of STREAK_MILESTONES) {
    if (streak < m) return m;
  }
  return Math.ceil((streak + 1) / 50) * 50;
}

export function getPreviousStreakMilestone(streak: number): number {
  let prev = 0;
  for (const m of STREAK_MILESTONES) {
    if (streak >= m) prev = m;
  }
  return prev;
}

export function getProgressFreezes(progress: ProgressState): number {
  if (
    typeof progress.streakFreezes === 'number' &&
    Number.isFinite(progress.streakFreezes)
  ) {
    return Math.max(0, progress.streakFreezes);
  }
  return Math.max(0, progress.freezes || 0);
}

export function reconcileStreakWithInfo(
  progress: ProgressState,
  todayKey: string = getLocalDateKey()
): {
  nextProgress: ProgressState;
  usedFreeze: boolean;
  savedStreak: number;
} {
  const currentFreezes = getProgressFreezes(progress);

  if (!progress.lastGoalDate || progress.streak === 0) {
    return { nextProgress: progress, usedFreeze: false, savedStreak: 0 };
  }

  if (progress.lastGoalDate === todayKey) {
    return { nextProgress: progress, usedFreeze: false, savedStreak: 0 };
  }

  const yesterdayKey = addDaysToDateKey(todayKey, -1);
  if (progress.lastGoalDate === yesterdayKey) {
    // Masih aman, hari ini belum selesai saja
    return { nextProgress: progress, usedFreeze: false, savedStreak: 0 };
  }

  const twoDaysAgoKey = addDaysToDateKey(todayKey, -2);
  // Terlewat tepat 1 hari (kemarin) -> cek Pelindung Streak (streakFreezes / freezes)
  if (
    progress.lastGoalDate === twoDaysAgoKey &&
    currentFreezes > 0 &&
    progress.lastFreezeUsedDate !== yesterdayKey
  ) {
    const nextFreezes = currentFreezes - 1;
    const nextProgress: ProgressState = {
      ...progress,
      freezes: nextFreezes,
      ...(typeof progress.streakFreezes === 'number'
        ? { streakFreezes: nextFreezes }
        : {}),
      lastGoalDate: yesterdayKey, // dianggap terlindungi hingga kemarin
      lastFreezeUsedDate: yesterdayKey,
    };
    return {
      nextProgress,
      usedFreeze: true,
      savedStreak: progress.streak,
    };
  }

  // Terlewat lebih dari 1 hari atau tidak ada Pelindung Streak
  return {
    nextProgress: {
      ...progress,
      streak: 0,
    },
    usedFreeze: false,
    savedStreak: 0,
  };
}

export function reconcileStreak(
  progress: ProgressState,
  todayKey: string = getLocalDateKey()
): ProgressState {
  return reconcileStreakWithInfo(progress, todayKey).nextProgress;
}

export function applyLogToProgress(
  progress: ProgressState,
  prevTodayTotalMl: number,
  nextTodayTotalMl: number,
  goalMl: number,
  todayKey: string,
  baseXp: number = 10
): {
  nextProgress: ProgressState;
  justHitGoal: boolean;
  goalBonusXp: number;
  prevStreak: number;
  newStreak: number;
} {
  const baseProgress = reconcileStreak(progress, todayKey);
  const alreadyCompletedToday = baseProgress.lastGoalDate === todayKey;
  const isGoalMetNow = nextTodayTotalMl >= goalMl;
  const justHitGoal = !alreadyCompletedToday && isGoalMetNow;

  const goalBonusXp = justHitGoal ? 50 : 0;
  const prevStreak = baseProgress.streak;
  const newStreak = justHitGoal ? prevStreak + 1 : prevStreak;
  const nextXp = baseProgress.xp + baseXp + goalBonusXp;

  const nextProgress: ProgressState = {
    ...baseProgress,
    xp: nextXp,
    level: calculateLevel(nextXp),
    streak: newStreak,
    longestStreak: Math.max(baseProgress.longestStreak, newStreak),
    lastGoalDate: justHitGoal ? todayKey : baseProgress.lastGoalDate,
    prevStreakBeforeToday: justHitGoal
      ? prevStreak
      : baseProgress.prevStreakBeforeToday,
    prevGoalDateBeforeToday: justHitGoal
      ? baseProgress.lastGoalDate
      : baseProgress.prevGoalDateBeforeToday,
  };

  return {
    nextProgress,
    justHitGoal,
    goalBonusXp,
    prevStreak,
    newStreak,
  };
}

export function removeLogFromProgress(
  progress: ProgressState,
  nextTodayTotalMl: number,
  goalMl: number,
  todayKey: string,
  removedXp: number = 10
): ProgressState {
  const goalBrokenToday =
    progress.lastGoalDate === todayKey && nextTodayTotalMl < goalMl;

  const bonusToDeduct = goalBrokenToday ? 50 : 0;
  const nextXp = Math.max(0, progress.xp - removedXp - bonusToDeduct);

  if (goalBrokenToday) {
    const revertedStreak =
      typeof progress.prevStreakBeforeToday === 'number'
        ? progress.prevStreakBeforeToday
        : Math.max(0, progress.streak - 1);

    return {
      ...progress,
      xp: nextXp,
      level: calculateLevel(nextXp),
      streak: revertedStreak,
      lastGoalDate: progress.prevGoalDateBeforeToday ?? null,
    };
  }

  return {
    ...progress,
    xp: nextXp,
    level: calculateLevel(nextXp),
  };
}

export interface WeekDayStripItem {
  label: string;
  dateKey: string;
  completed: boolean;
  frozen: boolean;
  isToday: boolean;
}

const DAY_LABELS_ID = ['S', 'S', 'R', 'K', 'J', 'S', 'M']; // Senin - Minggu

export function getCurrentWeekStrip(
  logs: WaterLog[],
  goalMl: number,
  lastFreezeUsedDate?: string | null,
  now: Date = new Date()
): WeekDayStripItem[] {
  const todayKey = getLocalDateKey(now);
  const jsDay = now.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;

  return DAY_LABELS_ID.map((label, idx) => {
    const dt = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + mondayOffset + idx
    );
    const dateKey = getLocalDateKey(dt);
    const total = getTotalMlForDate(logs, dateKey);
    const completed = total >= goalMl;
    const frozen = !completed && lastFreezeUsedDate === dateKey;
    return {
      label,
      dateKey,
      completed,
      frozen,
      isToday: dateKey === todayKey,
    };
  });
}
