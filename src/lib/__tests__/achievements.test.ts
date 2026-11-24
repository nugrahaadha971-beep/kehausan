import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  computeAchievementValue,
  evaluateAchievements,
} from '../achievements';
import { ProgressState, WaterLog } from '../types';

const makeProgress = (overrides: Partial<ProgressState> = {}): ProgressState => ({
  xp: 0,
  level: 1,
  streak: 0,
  longestStreak: 0,
  freezes: 1,
  lastGoalDate: null,
  ...overrides,
});

describe('achievements.ts — pembukaan lencana & tingkatan tier', () => {
  it('membuka lencana Tegukan Pertama pada catatan minum pertama lalu naik tier ke perak/emas', () => {
    const log1: WaterLog = {
      id: 'l1',
      ts: new Date(2026, 10, 23, 9, 0, 0).toISOString(),
      ml: 250,
    };
    const res1 = evaluateAchievements({}, [log1], makeProgress(), 2000);
    expect(res1.nextRecords.first_sip?.tier).toBe('bronze');
    expect(res1.newlyUnlocked.some((u) => u.def.id === 'first_sip')).toBe(true);

    const logs25: WaterLog[] = Array.from({ length: 25 }, (_, i) => ({
      id: `l-${i}`,
      ts: new Date(2026, 10, 23, 10, i, 0).toISOString(),
      ml: 250,
    }));
    const res2 = evaluateAchievements(res1.nextRecords, logs25, makeProgress(), 2000);
    expect(res2.nextRecords.first_sip?.tier).toBe('silver');
  });

  it('membuka lencana Streak 3/7/14 dan Penjaga Api 30/50/100', () => {
    const res7 = evaluateAchievements(
      {},
      [],
      makeProgress({ streak: 7, longestStreak: 7 }),
      2000
    );
    expect(res7.nextRecords.streak_3?.tier).toBe('silver');
    expect(res7.nextRecords.streak_30).toBeUndefined();

    const res30 = evaluateAchievements(
      res7.nextRecords,
      [],
      makeProgress({ streak: 30, longestStreak: 30 }),
      2000
    );
    expect(res30.nextRecords.streak_3?.tier).toBe('gold');
    expect(res30.nextRecords.streak_30?.tier).toBe('bronze');
  });

  it('membuka Pagi Segar (minum sebelum jam 8) dan Sultan Air (total 50L)', () => {
    const morningLogs: WaterLog[] = [1, 2, 3, 4, 5, 6, 7].map((day) => ({
      id: `m-${day}`,
      ts: new Date(2026, 10, day, 7, 15, 0).toISOString(),
      ml: 500,
    }));
    const bigLog: WaterLog = {
      id: 'sultan',
      ts: new Date(2026, 10, 10, 12, 0, 0).toISOString(),
      ml: 47000,
    };

    const res = evaluateAchievements(
      {},
      [...morningLogs, bigLog],
      makeProgress(),
      2000
    );

    expect(res.nextRecords.morning_fresh?.tier).toBe('silver');
    expect(res.nextRecords.water_sultan?.tier).toBe('gold');
  });

  it('membuka lencana Konsisten (7 hari seminggu) dan Si Kolektor (>=3 lencana)', () => {
    const now = new Date();
    const sevenDaysLogs: WaterLog[] = Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i,
        7,
        30,
        0
      );
      return { id: `c-${i}`, ts: dt.toISOString(), ml: 2200 };
    });

    const res = evaluateAchievements(
      {},
      sevenDaysLogs,
      makeProgress({ streak: 7, longestStreak: 7 }),
      2000
    );

    expect(res.nextRecords.consistent_week?.tier).toBe('gold');
    expect(res.nextRecords.collector).toBeDefined();

    const val = computeAchievementValue(
      'consistent_week',
      sevenDaysLogs,
      makeProgress(),
      2000,
      0
    );
    expect(val).toBe(7);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(7);
  });
});
