import { describe, expect, it } from 'vitest';
import {
  applyLogToProgress,
  getCurrentWeekStrip,
  reconcileStreak,
  removeLogFromProgress,
} from '../streak';
import { loadState, saveState } from '../storage';
import { ProgressState, WaterLog } from '../types';

const baseProgress = (overrides: Partial<ProgressState> = {}): ProgressState => ({
  xp: 0,
  level: 1,
  streak: 0,
  longestStreak: 0,
  freezes: 1,
  lastGoalDate: null,
  lastFreezeUsedDate: null,
  prevStreakBeforeToday: 0,
  prevGoalDateBeforeToday: null,
  ...overrides,
});

describe('streak.ts — kenaikan, anti-dobel, rollback hapus, reset, dan pelindung streak', () => {
  it('menaikkan streak tepat satu kali saat target tercapai dan tidak bertambah dua kali di hari yang sama', () => {
    const today = '2026-11-23';
    const start = baseProgress({ streak: 2, longestStreak: 2, lastGoalDate: '2026-11-22', xp: 40 });

    // Minum pertama belum mencapai target (1500 / 2000)
    const step1 = applyLogToProgress(start, 0, 1500, 2000, today, 10);
    expect(step1.justHitGoal).toBe(false);
    expect(step1.newStreak).toBe(2);
    expect(step1.nextProgress.xp).toBe(50);

    // Minum kedua mencapai target (2000 / 2000)
    const step2 = applyLogToProgress(step1.nextProgress, 1500, 2000, 2000, today, 10);
    expect(step2.justHitGoal).toBe(true);
    expect(step2.newStreak).toBe(3);
    expect(step2.nextProgress.lastGoalDate).toBe(today);
    expect(step2.nextProgress.xp).toBe(110); // +10 +50 bonus

    // Minum ketiga di hari yang sama (2250 / 2000) -> TIDAK boleh menaikkan streak lagi
    const step3 = applyLogToProgress(step2.nextProgress, 2000, 2250, 2000, today, 10);
    expect(step3.justHitGoal).toBe(false);
    expect(step3.newStreak).toBe(3);
    expect(step3.goalBonusXp).toBe(0);
    expect(step3.nextProgress.xp).toBe(120);
  });

  it('mengembalikan streak & bonus XP jika catatan dihapus hingga di bawah target hari ini', () => {
    const today = '2026-11-23';
    const yesterday = '2026-11-22';
    const initial = baseProgress({
      streak: 4,
      longestStreak: 4,
      lastGoalDate: yesterday,
      xp: 90,
    });

    const afterHit = applyLogToProgress(initial, 1750, 2000, 2000, today, 10);
    expect(afterHit.nextProgress.streak).toBe(5);
    expect(afterHit.nextProgress.lastGoalDate).toBe(today);
    expect(afterHit.nextProgress.xp).toBe(150);

    // Hapus catatan sehingga total hari ini turun jadi 1750 (< 2000)
    const afterDelete = removeLogFromProgress(afterHit.nextProgress, 1750, 2000, today, 10);
    expect(afterDelete.streak).toBe(4);
    expect(afterDelete.lastGoalDate).toBe(yesterday);
    expect(afterDelete.xp).toBe(90);

    // Jika mencatat lagi hingga mencapai target, streak kembali jadi 5 (bukan 6)
    const afterReLog = applyLogToProgress(afterDelete, 1750, 2000, 2000, today, 10);
    expect(afterReLog.nextProgress.streak).toBe(5);
    expect(afterReLog.nextProgress.xp).toBe(150);
  });

  it('memakai 1 Pelindung Streak secara otomatis saat terlewat tepat 1 hari', () => {
    const p = baseProgress({
      streak: 5,
      longestStreak: 5,
      freezes: 1,
      lastGoalDate: '2026-11-21', // Kemarin (22) terlewat
    });

    const reconciled = reconcileStreak(p, '2026-11-23');
    expect(reconciled.streak).toBe(5);
    expect(reconciled.freezes).toBe(0);
    expect(reconciled.lastGoalDate).toBe('2026-11-22');
    expect(reconciled.lastFreezeUsedDate).toBe('2026-11-22');
  });

  it('mereset streak ke 0 saat terlewat 1 hari tanpa Pelindung Streak atau terlewat > 1 hari', () => {
    const noFreeze = baseProgress({
      streak: 6,
      freezes: 0,
      lastGoalDate: '2026-11-21',
    });
    expect(reconcileStreak(noFreeze, '2026-11-23').streak).toBe(0);

    const missedTwoDays = baseProgress({
      streak: 6,
      freezes: 2,
      lastGoalDate: '2026-11-20',
    });
    expect(reconcileStreak(missedTwoDays, '2026-11-23').streak).toBe(0);
  });

  it('menghasilkan strip 7 hari dengan status selesai & terlindungi', () => {
    // 2026-11-23 adalah hari Senin
    const now = new Date(2026, 10, 23, 10, 0, 0);
    const logs: WaterLog[] = [
      { id: '1', ts: new Date(2026, 10, 23, 8, 0, 0).toISOString(), ml: 2000 },
    ];
    const strip = getCurrentWeekStrip(logs, 2000, null, now);
    expect(strip).toHaveLength(7);
    expect(strip[0].completed).toBe(true);
    expect(strip[0].isToday).toBe(true);
  });

  it('aman tanpa error ketika localStorage dinonaktifkan/throw', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: {
        get localStorage() {
          throw new Error('SecurityError: localStorage disabled');
        },
      },
      configurable: true,
    });

    try {
      const state = loadState();
      expect(state.version).toBe(1);
      expect(() => saveState(state)).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
      });
    }
  });
});
