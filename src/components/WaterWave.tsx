import React, { useId } from 'react';
import { useReducedMotion } from 'framer-motion';
import { DrinkType } from '../lib/types';

export interface WaterWaveProps {
  /** Tinggi air antara 0 (kosong) hingga 1 (penuh) */
  level: number;
  /** Jenis minuman terakhir untuk warna adaptif */
  drinkType?: DrinkType;
  className?: string;
}

export interface WaterWavePalette {
  backTop: string;
  backBottom: string;
  frontTop: string;
  frontBottom: string;
  crestStroke: string;
  bubbleBg: string;
  bubbleBorder: string;
  vesselClass: string;
  vesselShadow: string;
}

export const WATER_WAVE_PALETTES: Record<DrinkType, WaterWavePalette> = {
  water: {
    backTop: '#0EA5E9',
    backBottom: '#0369A1',
    frontTop: '#38BDF8',
    frontBottom: '#0284C7',
    crestStroke: 'rgba(255, 255, 255, 0.55)',
    bubbleBg: 'rgba(255, 255, 255, 0.5)',
    bubbleBorder: 'rgba(255, 255, 255, 0.8)',
    vesselClass:
      'border-[#BAE6FD] dark:border-sky-700/80 bg-gradient-to-b from-[#F0F9FF] to-[#DFF3FF] dark:from-slate-800 dark:to-slate-900',
    vesselShadow:
      'shadow-[0_18px_38px_-14px_rgba(28,176,246,0.38)] dark:shadow-[0_18px_38px_-14px_rgba(14,165,233,0.28)]',
  },
  electrolyte: {
    backTop: '#06B6D4',
    backBottom: '#D97706',
    frontTop: '#22D3EE',
    frontBottom: '#F59E0B',
    crestStroke: 'rgba(254, 243, 199, 0.65)',
    bubbleBg: 'rgba(255, 251, 235, 0.52)',
    bubbleBorder: 'rgba(254, 243, 199, 0.85)',
    vesselClass:
      'border-[#A5F3FC] dark:border-cyan-700/80 bg-gradient-to-b from-[#ECFEFF] to-[#FEF3C7]/60 dark:from-slate-800 dark:to-amber-950/30',
    vesselShadow:
      'shadow-[0_18px_38px_-14px_rgba(245,158,11,0.34)] dark:shadow-[0_18px_38px_-14px_rgba(6,182,212,0.28)]',
  },
  coffee_tea: {
    backTop: '#78350F',
    backBottom: '#451A03',
    frontTop: '#B45309',
    frontBottom: '#7C2D12',
    crestStroke: 'rgba(253, 230, 138, 0.42)',
    bubbleBg: 'rgba(254, 243, 199, 0.35)',
    bubbleBorder: 'rgba(253, 230, 138, 0.6)',
    vesselClass:
      'border-[#FDE68A] dark:border-amber-800/70 bg-gradient-to-b from-[#FFFBEB] to-[#FEF3C7] dark:from-slate-800 dark:to-stone-900',
    vesselShadow:
      'shadow-[0_18px_38px_-14px_rgba(180,83,9,0.34)] dark:shadow-[0_18px_38px_-14px_rgba(146,64,14,0.32)]',
  },
  sweet: {
    backTop: '#DB2777',
    backBottom: '#9D174D',
    frontTop: '#F472B6',
    frontBottom: '#FB7185',
    crestStroke: 'rgba(255, 228, 230, 0.55)',
    bubbleBg: 'rgba(255, 241, 242, 0.5)',
    bubbleBorder: 'rgba(255, 228, 230, 0.85)',
    vesselClass:
      'border-[#FBCFE8] dark:border-pink-800/70 bg-gradient-to-b from-[#FDF2F8] to-[#FCE7F3] dark:from-slate-800 dark:to-pink-950/30',
    vesselShadow:
      'shadow-[0_18px_38px_-14px_rgba(236,72,153,0.32)] dark:shadow-[0_18px_38px_-14px_rgba(219,39,119,0.28)]',
  },
};

export function getWaterWavePalette(drinkType: DrinkType = 'water'): WaterWavePalette {
  return WATER_WAVE_PALETTES[drinkType] ?? WATER_WAVE_PALETTES.water;
}

const MICRO_BUBBLES = [
  { left: '14%', bottom: '8%', size: 4, duration: '5.8s', delay: '0s', sway: '5px' },
  { left: '24%', bottom: '12%', size: 3, duration: '6.6s', delay: '1.1s', sway: '-4px' },
  { left: '34%', bottom: '6%', size: 5, duration: '7.2s', delay: '2.3s', sway: '6px' },
  { left: '43%', bottom: '14%', size: 2.5, duration: '5.2s', delay: '0.6s', sway: '-5px' },
  { left: '53%', bottom: '9%', size: 4, duration: '6.9s', delay: '3.1s', sway: '4px' },
  { left: '63%', bottom: '7%', size: 3.5, duration: '6.1s', delay: '1.7s', sway: '-6px' },
  { left: '72%', bottom: '11%', size: 5, duration: '7.6s', delay: '0.4s', sway: '5px' },
  { left: '83%', bottom: '8%', size: 3, duration: '5.5s', delay: '2.8s', sway: '-4px' },
  { left: '29%', bottom: '4%', size: 3, duration: '8.1s', delay: '4.0s', sway: '3px' },
  { left: '60%', bottom: '5%', size: 4.5, duration: '7.4s', delay: '3.6s', sway: '-5px' },
  { left: '78%', bottom: '15%', size: 2.5, duration: '6.3s', delay: '1.9s', sway: '4px' },
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const WaterWave: React.FC<WaterWaveProps> = ({
  level,
  drinkType = 'water',
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const clampedLevel = clamp01(level);
  const palette = getWaterWavePalette(drinkType);

  const backGradId = `wave-back-${uid}`;
  const frontGradId = `wave-front-${uid}`;

  // Geser cairan dari bawah ke atas secara proporsional.
  // Saat level = 0, turun penuh (+105% agar puncak gelombang tidak menyembul).
  const translatePct = clampedLevel <= 0.005 ? 105 : (1 - clampedLevel) * 100;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Wrapper ketinggian cairan */}
      <div
        style={{
          transform: `translate3d(0, ${translatePct}%, 0)`,
          transition: prefersReducedMotion
            ? 'none'
            : 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className="relative w-full h-full will-change-transform"
      >
        {/* Lapisan 1: Gelombang SVG Belakang (fase lambat) */}
        <div
          className={`absolute -top-4 left-0 w-[200%] h-7 ${
            prefersReducedMotion ? '' : 'animate-wave-back'
          }`}
        >
          <svg
            viewBox="0 0 400 28"
            preserveAspectRatio="none"
            className="w-full h-full block"
          >
            <defs>
              <linearGradient id={backGradId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={palette.backTop}
                  style={{ transition: 'stop-color 550ms ease' }}
                />
                <stop
                  offset="100%"
                  stopColor={palette.backBottom}
                  style={{ transition: 'stop-color 550ms ease' }}
                />
              </linearGradient>
            </defs>
            <path
              d="M 0 14 Q 50 3 100 14 T 200 14 Q 250 3 300 14 T 400 14 L 400 28 L 0 28 Z"
              fill={`url(#${backGradId})`}
              opacity="0.88"
            />
          </svg>
        </div>

        {/* Badan cairan belakang */}
        <div
          style={{
            background: `linear-gradient(180deg, ${palette.backTop} 0%, ${palette.backBottom} 100%)`,
            transition: 'background 550ms ease',
          }}
          className="absolute inset-x-0 top-3 bottom-0 opacity-85"
        />

        {/* Lapisan 2: Gelombang SVG Depan (fase berlawanan & lebih cepat) */}
        <div
          className={`absolute -top-3.5 left-0 w-[200%] h-7 ${
            prefersReducedMotion ? '' : 'animate-wave-front'
          }`}
        >
          <svg
            viewBox="0 0 400 28"
            preserveAspectRatio="none"
            className="w-full h-full block"
          >
            <defs>
              <linearGradient id={frontGradId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={palette.frontTop}
                  style={{ transition: 'stop-color 550ms ease' }}
                />
                <stop
                  offset="100%"
                  stopColor={palette.frontBottom}
                  style={{ transition: 'stop-color 550ms ease' }}
                />
              </linearGradient>
            </defs>
            <path
              d="M 0 15 Q 50 24 100 15 T 200 15 Q 250 24 300 15 T 400 15 L 400 28 L 0 28 Z"
              fill={`url(#${frontGradId})`}
            />
            <path
              d="M 0 15 Q 50 24 100 15 T 200 15 Q 250 24 300 15 T 400 15"
              fill="none"
              stroke={palette.crestStroke}
              strokeWidth="1.6"
            />
          </svg>
        </div>

        {/* Badan cairan depan dengan kedalaman gradasi */}
        <div
          style={{
            background: `linear-gradient(180deg, ${palette.frontTop} 0%, ${palette.frontBottom} 100%)`,
            transition: 'background 550ms ease',
          }}
          className="absolute inset-x-0 top-3.5 bottom-0"
        />

        {/* Gelembung udara mikro naik perlahan */}
        {clampedLevel > 0.04 && !prefersReducedMotion && (
          <div className="absolute inset-x-0 top-3 bottom-0 overflow-hidden">
            {MICRO_BUBBLES.map((b, idx) => (
              <span
                key={idx}
                style={
                  {
                    left: b.left,
                    bottom: b.bottom,
                    width: `${b.size}px`,
                    height: `${b.size}px`,
                    backgroundColor: palette.bubbleBg,
                    border: `1px solid ${palette.bubbleBorder}`,
                    '--bubble-duration': b.duration,
                    '--bubble-delay': b.delay,
                    '--bubble-sway': b.sway,
                  } as React.CSSProperties
                }
                className="animate-micro-bubble absolute rounded-full"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
