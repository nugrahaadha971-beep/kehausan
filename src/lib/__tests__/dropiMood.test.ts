import { describe, expect, it } from 'vitest';
import { getDropiMood } from '../dropiMood';

describe('getDropiMood', () => {
  it('mengembalikan "drinking" saat justDrank aktif', () => {
    expect(
      getDropiMood({
        progress: 1,
        hour: 23,
        wakeHour: 7,
        sleepHour: 22,
        minutesSinceLastDrink: 0,
        justDrank: true,
      })
    ).toBe('drinking');
  });

  it('mengembalikan "celebrate" saat progres >= 1', () => {
    expect(
      getDropiMood({
        progress: 1,
        hour: 15,
        wakeHour: 7,
        sleepHour: 22,
        minutesSinceLastDrink: 10,
        justDrank: false,
      })
    ).toBe('celebrate');
  });

  it('mengembalikan "sleepy" di luar jam aktif bangun/tidur', () => {
    expect(
      getDropiMood({
        progress: 0.4,
        hour: 23,
        wakeHour: 7,
        sleepHour: 22,
        minutesSinceLastDrink: 30,
        justDrank: false,
      })
    ).toBe('sleepy');
  });

  it('mendukung jam tidur lewat tengah malam untuk status terjaga', () => {
    expect(
      getDropiMood({
        progress: 0.4,
        hour: 0,
        wakeHour: 7,
        sleepHour: 1,
        minutesSinceLastDrink: 30,
        justDrank: false,
      })
    ).toBe('happy');
  });

  it('mengembalikan "thirsty" saat belum minum > 120 menit di jam aktif', () => {
    expect(
      getDropiMood({
        progress: 0.4,
        hour: 14,
        wakeHour: 7,
        sleepHour: 22,
        minutesSinceLastDrink: 135,
        justDrank: false,
      })
    ).toBe('thirsty');
  });

  it('mengembalikan "happy" sebagai mood default di jam aktif', () => {
    expect(
      getDropiMood({
        progress: 0.2,
        hour: 8,
        wakeHour: 7,
        sleepHour: 22,
        minutesSinceLastDrink: 20,
        justDrank: false,
      })
    ).toBe('happy');
  });
});
