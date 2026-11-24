import { describe, expect, it } from 'vitest';
import {
  analyzeDrySpellWindow,
  calculateDailyTargetMl,
  calculateEffectiveMl,
  calculateLevel,
  calculateRecommendedGoal,
  checkRapidIntake,
  DRINK_HYDRATION_FACTORS,
  getDrinkReactionMessage,
  getLogDrinkType,
  getLogEffectiveMl,
  getLogRawAmountMl,
  getMostFrequentDrinkType,
  getTotalMlAllTime,
  getTotalMlForDate,
  getWeeklyDrinkDistribution,
  getXpProgressInLevel,
  isAutoNightActive,
  isWindDownActive,
  resolveEffectiveDarkMode,
} from '../hydration';
import { DrinkLog } from '../types';
import {
  createDefaultState,
  getLocalDateKey,
  migrateState,
  validateBackupPayload,
} from '../storage';

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

  it('menghitung effectiveMl berdasarkan indeks hidrasi setiap jenis minuman', () => {
    expect(DRINK_HYDRATION_FACTORS).toEqual({
      water: 1.0,
      electrolyte: 1.1,
      coffee_tea: 0.85,
      sweet: 0.75,
    });

    expect(calculateEffectiveMl(250, 'water')).toBe(250);
    expect(calculateEffectiveMl(250, 'electrolyte')).toBe(275);
    expect(calculateEffectiveMl(250, 'coffee_tea')).toBe(213); // Math.round(212.5)
    expect(calculateEffectiveMl(250, 'sweet')).toBe(188); // Math.round(187.5)
  });

  it('kompatibel mundur dengan catatan minum lama tanpa field drinkType/rawAmountMl/effectiveMl', () => {
    const todayKey = getLocalDateKey();
    const nowIso = new Date().toISOString();

    const legacyLog: DrinkLog = {
      id: 'legacy-1',
      ts: nowIso,
      ml: 250,
    };

    const modernLog: DrinkLog = {
      id: 'modern-1',
      ts: nowIso,
      ml: 170,
      rawAmountMl: 200,
      drinkType: 'coffee_tea',
      effectiveMl: 170,
    };

    expect(getLogDrinkType(legacyLog)).toBe('water');
    expect(getLogRawAmountMl(legacyLog)).toBe(250);
    expect(getLogEffectiveMl(legacyLog)).toBe(250);

    expect(getLogDrinkType(modernLog)).toBe('coffee_tea');
    expect(getLogRawAmountMl(modernLog)).toBe(200);
    expect(getLogEffectiveMl(modernLog)).toBe(170);

    expect(getTotalMlForDate([legacyLog, modernLog], todayKey)).toBe(420);
    expect(getTotalMlAllTime([legacyLog, modernLog])).toBe(420);

    const migrated = migrateState({ logs: [legacyLog] });
    expect(migrated.logs).toHaveLength(1);
    expect(migrated.dailyBoosters).toEqual({
      exercise: false,
      hotWeather: false,
    });
  });

  it('menghitung dailyTargetMl dengan dailyBoosters tanpa mengubah target dasar', () => {
    const baseGoal = 2400;
    expect(
      calculateDailyTargetMl(baseGoal, { exercise: false, hotWeather: false })
    ).toBe(2400);
    expect(
      calculateDailyTargetMl(baseGoal, { exercise: true, hotWeather: false })
    ).toBe(2900);
    expect(
      calculateDailyTargetMl(baseGoal, { exercise: false, hotWeather: true })
    ).toBe(2700);
    expect(
      calculateDailyTargetMl(baseGoal, { exercise: true, hotWeather: true })
    ).toBe(3200);
  });

  it('memberikan reaksi kontekstual hanya untuk minuman non-air putih', () => {
    expect(getDrinkReactionMessage('water', 250, 250)).toBeNull();
    expect(getDrinkReactionMessage('electrolyte', 250, 275)).toContain('275 ml');
    expect(getDrinkReactionMessage('coffee_tea', 200, 170)).toContain('170 ml');
    expect(getDrinkReactionMessage('sweet', 200, 150)).toContain('150 ml');
  });
});

describe('Fase 3 & 4 — Statistik pola minum & validasi cadangan JSON', () => {
  it('mendeteksi rentang 3 jam rawan dehidrasi pada pukul 07.00 - 21.00', () => {
    const baseDay = new Date(2026, 10, 23, 12, 0, 0);
    const logs: DrinkLog[] = [];
    // Isi catatan di pagi-siang (07-12) dan sore-malam (16-20), kosongkan 13-15 (13.00 - 16.00)
    for (const hour of [7, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20]) {
      const dt = new Date(2026, 10, 23, hour, 15, 0);
      logs.push({
        id: `log-${hour}`,
        ts: dt.toISOString(),
        ml: 250,
        rawAmountMl: 250,
        drinkType: 'water',
        effectiveMl: 250,
      });
    }

    const insight = analyzeDrySpellWindow(logs, baseDay);
    expect(insight).not.toBeNull();
    expect(insight?.startHour).toBe(13);
    expect(insight?.endHour).toBe(16);
    expect(insight?.label).toBe('13.00 – 16.00');
  });

  it('menghitung distribusi jenis minuman 7 hari terakhir dan jenis minuman terbanyak', () => {
    const now = new Date(2026, 10, 23, 15, 0, 0);
    const logs: DrinkLog[] = [
      {
        id: '1',
        ts: new Date(2026, 10, 23, 9, 0, 0).toISOString(),
        ml: 500,
        rawAmountMl: 500,
        drinkType: 'water',
        effectiveMl: 500,
      },
      {
        id: '2',
        ts: new Date(2026, 10, 22, 10, 0, 0).toISOString(),
        ml: 275,
        rawAmountMl: 250,
        drinkType: 'electrolyte',
        effectiveMl: 275,
      },
      {
        id: '3',
        ts: new Date(2026, 10, 21, 14, 0, 0).toISOString(),
        ml: 213,
        rawAmountMl: 250,
        drinkType: 'coffee_tea',
        effectiveMl: 213,
      },
      {
        id: '4',
        ts: new Date(2026, 10, 20, 16, 0, 0).toISOString(),
        ml: 250,
        rawAmountMl: 250,
        drinkType: 'water',
        effectiveMl: 250,
      },
    ];

    const dist = getWeeklyDrinkDistribution(logs, now);
    expect(dist.totalRawMl).toBe(1250);
    expect(dist.items.find((i) => i.id === 'water')?.percent).toBe(60);
    expect(getMostFrequentDrinkType(logs)).toBe('water');
  });

  it('memvalidasi payload cadangan JSON yang valid maupun tidak valid', () => {
    const validPayload = createDefaultState();
    validPayload.profile.name = 'Budi';
    const okRes = validateBackupPayload(validPayload);
    expect(okRes.valid).toBe(true);
    if (okRes.valid) {
      expect(okRes.data.profile.name).toBe('Budi');
    }

    const badPayload = validateBackupPayload({ hello: 'world' });
    expect(badPayload.valid).toBe(false);

    const nullPayload = validateBackupPayload(null);
    expect(nullPayload.valid).toBe(false);
  });
});

describe('Fase 5 — Mode Malam Otomatis & Wind-Down', () => {
  it('mengaktifkan Wind-Down 2 jam sebelum jam tidur hingga jam bangun', () => {
    // wake 05:00, sleep 22:00 -> wind-down 20:00..05:00
    expect(isWindDownActive('05:00', '22:00', new Date(2026, 10, 23, 19, 30))).toBe(false);
    expect(isWindDownActive('05:00', '22:00', new Date(2026, 10, 23, 20, 0))).toBe(true);
    expect(isWindDownActive('05:00', '22:00', new Date(2026, 10, 23, 23, 15))).toBe(true);
    expect(isWindDownActive('05:00', '22:00', new Date(2026, 10, 23, 4, 45))).toBe(true);
    expect(isWindDownActive('05:00', '22:00', new Date(2026, 10, 23, 6, 0))).toBe(false);
  });

  it('mengaktifkan Dark Mode otomatis saat malam hari pada themeMode auto', () => {
    expect(isAutoNightActive('05:00', '22:00', new Date(2026, 10, 23, 14, 0))).toBe(false);
    expect(isAutoNightActive('05:00', '22:00', new Date(2026, 10, 23, 18, 0))).toBe(true);
    expect(isAutoNightActive('05:00', '22:00', new Date(2026, 10, 23, 2, 0))).toBe(true);

    expect(
      resolveEffectiveDarkMode('auto', '05:00', '22:00', new Date(2026, 10, 23, 19, 0))
    ).toBe(true);
    expect(
      resolveEffectiveDarkMode('light', '05:00', '22:00', new Date(2026, 10, 23, 19, 0))
    ).toBe(false);
    expect(
      resolveEffectiveDarkMode('dark', '05:00', '22:00', new Date(2026, 10, 23, 11, 0))
    ).toBe(true);
  });
});

describe('Fase 6 — checkRapidIntake (Peringatan Pacing)', () => {
  it('aman jika total kumulatif 60 menit < 800 ml dan sekali catat < 700 ml', () => {
    const now = new Date(2026, 10, 23, 14, 0, 0).getTime();
    const logs: DrinkLog[] = [
      {
        id: 'a',
        ts: new Date(now - 25 * 60 * 1000).toISOString(),
        ml: 250,
        rawAmountMl: 250,
        drinkType: 'water',
        effectiveMl: 250,
      },
      {
        id: 'b',
        ts: new Date(now - 10 * 60 * 1000).toISOString(),
        ml: 250,
        rawAmountMl: 250,
        drinkType: 'water',
        effectiveMl: 250,
      },
    ];

    const res = checkRapidIntake(logs, 250, now);
    expect(res).toEqual({
      isTooFast: false,
      recentTotalMl: 750,
      suggestedWaitMinutes: 0,
    });
  });

  it('memperingatkan jika sekali minum >= 700 ml', () => {
    const now = new Date(2026, 10, 23, 14, 0, 0).getTime();
    const res = checkRapidIntake([], 700, now);
    expect(res.isTooFast).toBe(true);
    expect(res.recentTotalMl).toBe(700);
    expect(res.suggestedWaitMinutes).toBe(15);
  });

  it('memperingatkan jika akumulasi 2-3 kali minum dalam 45 menit melebihi 800 ml', () => {
    const now = new Date(2026, 10, 23, 14, 0, 0).getTime();
    const logs: DrinkLog[] = [
      {
        id: '1',
        ts: new Date(now - 42 * 60 * 1000).toISOString(), // sisa 18 menit menuju 60 menit
        ml: 350,
        rawAmountMl: 350,
        drinkType: 'water',
        effectiveMl: 350,
      },
      {
        id: '2',
        ts: new Date(now - 20 * 60 * 1000).toISOString(),
        ml: 300,
        rawAmountMl: 300,
        drinkType: 'water',
        effectiveMl: 300,
      },
    ];

    const res = checkRapidIntake(logs, 250, now);
    expect(res.isTooFast).toBe(true);
    expect(res.recentTotalMl).toBe(900);
    expect(res.suggestedWaitMinutes).toBe(18);
  });
});

