import { describe, expect, it } from 'vitest';
import {
  getSessionHydrationQuote,
  HYDRATION_QUOTES,
  pickDifferentQuoteIndex,
} from '../hydrationQuotes';

describe('hydrationQuotes.ts', () => {
  it('menyediakan daftar kutipan motivasi hidrasi yang valid dan singkat', () => {
    expect(HYDRATION_QUOTES.length).toBeGreaterThanOrEqual(10);
    for (const q of HYDRATION_QUOTES) {
      expect(q.text.trim().length).toBeGreaterThan(15);
      expect(q.topic.trim().length).toBeGreaterThan(2);
    }
  });

  it('tidak pernah mengulang indeks kutipan yang sama berturut-turut', () => {
    const total = HYDRATION_QUOTES.length;
    for (let prev = 0; prev < total; prev++) {
      for (const rand of [0, 0.25, 0.5, 0.75, 0.99]) {
        const next = pickDifferentQuoteIndex(total, prev, () => rand);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(total);
        expect(next).not.toBe(prev);
      }
    }
  });

  it('mengembalikan kutipan yang sama dalam satu sesi buka aplikasi', () => {
    const first = getSessionHydrationQuote();
    const second = getSessionHydrationQuote();
    expect(first).toEqual(second);
    expect(HYDRATION_QUOTES).toContain(first);
  });
});
