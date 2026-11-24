import { describe, expect, it } from 'vitest';
import {
  calculateLevel,
  calculateRecommendedGoal,
  getXpProgressInLevel,
} from '../hydration';

describe('hydration.ts — rumus target harian & XP', () => {
  it('menghitung target dasar berat x 35 + bonus aktivitas dan membulatkan ke 50 ml terdekat', () => {
    // 60 * 35 = 2100 + 0 (santai) = 2100
    expect(calculateRecommendedGoal(60, 'santai')).toBe(2100);
    // 60 * 35 = 2100 + 300 (sedang) = 2400
    expect(calculateRecommendedGoal(60, 'sedang')).toBe(2400);
    // 60 * 35 = 2100 + 600 (aktif) = 2700
    expect(calculateRecommendedGoal(60, 'aktif')).toBe(2700);
    // 63 * 35 = 2205 + 300 = 2505 -> dibulatkan ke 2500
    expect(calculateRecommendedGoal(63, 'sedang')).toBe(2500);
    // 65 * 35 = 2275 + 0 = 2275 -> dibulatkan ke 2300
    expect(calculateRecommendedGoal(65, 'santai')).toBe(2300);
  });

  it('membatasi target harian dalam rentang 1500 ml sampai 4000 ml', () => {
    expect(calculateRecommendedGoal(30, 'santai')).toBe(1500);
    expect(calculateRecommendedGoal(10, 'santai')).toBe(1500);
    expect(calculateRecommendedGoal(120, 'aktif')).toBe(4000);
    expect(calculateRecommendedGoal(160, 'aktif')).toBe(4000);
  });

  it('menghitung level setiap 100 XP dengan benar', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(250)).toBe(3);

    expect(getXpProgressInLevel(245)).toEqual({
      level: 3,
      current: 45,
      needed: 100,
      percent: 45,
    });
  });
});
