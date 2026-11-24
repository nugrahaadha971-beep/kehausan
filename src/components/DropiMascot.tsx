/**
 * DropiMascot v1.2: mendukung WARNA dan AKSESORI.
 *
 * Contoh Pemakaian:
 * import { DropiMascot } from './components/DropiMascot';
 *
 * <DropiMascot mood="happy" size={140} color="teal" accessory="hat" />
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export type DropiMood =
  | 'happy'
  | 'cheer'
  | 'celebrate'
  | 'thirsty'
  | 'sleepy'
  | 'sad'
  | 'wow'
  | 'drinking';

export type DropiColor = 'blue' | 'teal' | 'green' | 'purple' | 'yellow' | 'pink';
export type DropiAccessory = 'none' | 'hat' | 'glasses' | 'crown';

export interface DropiTheme {
  label: string;
  /** Warna highlight (kiri atas badan) */
  light: string;
  /** Warna utama badan dan lengan */
  base: string;
  /** Warna bayangan (kanan bawah badan) */
  dark: string;
  /** Warna bayangan dalam (inset) */
  inset: string;
  /** Warna bayangan di bawah badan */
  ground: string;
  /** Warna lingkaran latar di belakang maskot (dipakai di Profil/Home) */
  ring: string;
}

/** Sumber tunggal daftar warna. Pakai ini juga di layar Profil agar id-nya sama persis. */
export const DROPI_COLORS: Record<DropiColor, DropiTheme> = {
  blue: {
    label: 'Biru',
    light: '#8CE2FF',
    base: '#1CB0F6',
    dark: '#1182BA',
    inset: 'rgba(10, 75, 115, 0.35)',
    ground: 'rgba(17, 130, 186, 0.35)',
    ring: '#DDF4FF',
  },
  teal: {
    label: 'Tosca',
    light: '#8FF5E6',
    base: '#00C2B3',
    dark: '#00897D',
    inset: 'rgba(0, 80, 72, 0.35)',
    ground: 'rgba(0, 137, 125, 0.35)',
    ring: '#D5FBF6',
  },
  green: {
    label: 'Hijau',
    light: '#C2F28A',
    base: '#58CC02',
    dark: '#3F9100',
    inset: 'rgba(30, 80, 0, 0.35)',
    ground: 'rgba(63, 145, 0, 0.35)',
    ring: '#E3F9CC',
  },
  purple: {
    label: 'Ungu',
    light: '#E3C2FF',
    base: '#CE82FF',
    dark: '#9A4FD1',
    inset: 'rgba(70, 20, 110, 0.35)',
    ground: 'rgba(154, 79, 209, 0.35)',
    ring: '#F3E4FF',
  },
  yellow: {
    label: 'Kuning',
    light: '#FFE98A',
    base: '#FFC800',
    dark: '#D9A000',
    inset: 'rgba(110, 80, 0, 0.3)',
    ground: 'rgba(217, 160, 0, 0.35)',
    ring: '#FFF4C2',
  },
  pink: {
    label: 'Merah Muda',
    light: '#FFC2C2',
    base: '#FF7B7B',
    dark: '#D94F4F',
    inset: 'rgba(110, 25, 25, 0.3)',
    ground: 'rgba(217, 79, 79, 0.35)',
    ring: '#FFE1E1',
  },
};

/** Sumber tunggal daftar aksesori untuk layar Profil. */
export const DROPI_ACCESSORIES: { id: DropiAccessory; label: string }[] = [
  { id: 'none', label: 'Polos' },
  { id: 'hat', label: 'Topi' },
  { id: 'glasses', label: 'Kacamata' },
  { id: 'crown', label: 'Mahkota' },
];

// Alias supaya nilai berbahasa Indonesia atau id lama dari proyek tetap terbaca
const COLOR_ALIASES: Record<string, DropiColor> = {
  biru: 'blue',
  tosca: 'teal',
  hijau: 'green',
  ungu: 'purple',
  kuning: 'yellow',
  'merah muda': 'pink',
  merah_muda: 'pink',
  'merah-muda': 'pink',
  merahmuda: 'pink',
  rose: 'pink',
  red: 'pink',
  orange: 'yellow',
};

const ACCESSORY_ALIASES: Record<string, DropiAccessory> = {
  none: 'none',
  polos: 'none',
  topi: 'hat',
  hat: 'hat',
  cap: 'hat',
  kacamata: 'glasses',
  glasses: 'glasses',
  mahkota: 'crown',
  crown: 'crown',
};

export function normalizeDropiColor(value?: string | null): DropiColor {
  const key = String(value ?? '').trim().toLowerCase();
  if (key in DROPI_COLORS) return key as DropiColor;
  return COLOR_ALIASES[key] ?? 'blue';
}

export function normalizeDropiAccessory(value?: string | null): DropiAccessory {
  const key = String(value ?? '').trim().toLowerCase();
  return ACCESSORY_ALIASES[key] ?? 'none';
}

/** Ambil tema warna lengkap (mis. untuk lingkaran latar di belakang maskot). */
export function getDropiTheme(color?: string | null): DropiTheme {
  return DROPI_COLORS[normalizeDropiColor(color)];
}

export interface DropiMascotProps {
  mood?: DropiMood;
  size?: number;
  className?: string;
  /** blue | teal | green | purple | yellow | pink (alias: biru, tosca, hijau, ungu, kuning) */
  color?: string;
  /** none | hat | glasses | crown (alias: polos, topi, kacamata, mahkota) */
  accessory?: string;
}

export const DropiMascot: React.FC<DropiMascotProps> = ({
  mood = 'happy',
  size = 140,
  className = '',
  color = 'blue',
  accessory = 'none',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [isBlinking, setIsBlinking] = useState(false);

  const theme = useMemo(() => getDropiTheme(color), [color]);
  const acc = normalizeDropiAccessory(accessory);
  // Topi pesta hanya tampil saat perayaan DAN pengguna tidak memakai aksesori
  const showPartyHat = mood === 'celebrate' && acc === 'none';

  // Efek kedipan mata acak setiap 3 - 5 detik
  useEffect(() => {
    if (mood === 'sleepy' || prefersReducedMotion) return;

    let blinkTimeout: ReturnType<typeof setTimeout>;
    let resetTimeout: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      const nextDelay = 3000 + Math.random() * 2000;
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        resetTimeout = setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 140);
      }, nextDelay);
    };

    scheduleBlink();
    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(resetTimeout);
    };
  }, [mood, prefersReducedMotion]);

  // Variasi animasi tubuh utama berdasarkan mood
  const getBodyAnimation = () => {
    if (prefersReducedMotion) {
      return { opacity: 1, scale: 1, y: 0 };
    }

    switch (mood) {
      case 'cheer':
        return {
          y: [0, -24, 0, -6, 0],
          scaleX: [1, 0.92, 1.12, 0.96, 1],
          scaleY: [1, 1.08, 0.88, 1.04, 1],
          transition: {
            duration: 0.75,
            times: [0, 0.4, 0.65, 0.85, 1],
            ease: 'easeOut' as const,
            repeat: Infinity,
            repeatDelay: 0.8,
          },
        };
      case 'celebrate':
        return {
          y: [0, -18, 0],
          rotate: [0, -6, 6, 0],
          scaleX: [1, 0.94, 1.12, 1],
          scaleY: [1, 1.06, 0.88, 1],
          transition: {
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      case 'thirsty':
        return {
          x: [-1.5, 1.5, -1.5],
          scaleX: [1, 1.04, 1],
          scaleY: [1, 0.96, 1],
          transition: {
            duration: 0.35,
            repeat: Infinity,
            ease: 'linear' as const,
          },
        };
      case 'sleepy':
        return {
          scaleX: [1, 1.04, 1],
          scaleY: [1, 0.96, 1],
          transition: {
            duration: 3.2,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      case 'drinking':
        return {
          y: [0, -3, 0],
          scaleX: [1, 1.05, 1],
          scaleY: [1, 0.95, 1],
          transition: {
            duration: 0.5,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      default:
        // Idle bobbing naik-turun 4px (2.4s) + squash & stretch halus saat mendarat
        return {
          y: [0, -4, 0, 0],
          scaleX: [1, 0.98, 1.12, 1],
          scaleY: [1, 1.02, 0.88, 1],
          transition: {
            duration: 2.4,
            times: [0, 0.45, 0.82, 1],
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
    }
  };

  // Gradien badan mengikuti warna yang dipilih
  const bodyGradient = `radial-gradient(circle at 32% 28%, ${theme.light} 0%, ${theme.base} 58%, ${theme.dark} 100%)`;

  const scale = size / 140;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Maskot Dropi ${theme.label} sedang ${mood}`}
    >
      {/* Partikel suasana (Keringat untuk thirsty, zZz untuk sleepy) */}
      <AnimatePresence mode="wait">
        {mood === 'thirsty' && !prefersReducedMotion && (
          <motion.div
            key="sweat-drop"
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: [0, 16, 26] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeIn' }}
            style={{
              position: 'absolute',
              top: 26 * scale,
              right: 22 * scale,
              width: 10 * scale,
              height: 14 * scale,
              borderRadius: '0 50% 50% 50%',
              rotate: 45, // rotate lewat Framer Motion agar tidak tertimpa animasi y
              background: 'radial-gradient(circle at 35% 35%, #FFFFFF, #7DD3FC)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              zIndex: 20,
            }}
          />
        )}

        {mood === 'sleepy' && !prefersReducedMotion && (
          <motion.div
            key="zzz-text"
            initial={{ opacity: 0, y: 4, scale: 0.8 }}
            animate={{ opacity: [0, 1, 0], y: -22 * scale, scale: [0.85, 1.1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 8 * scale,
              right: 12 * scale,
              fontSize: 16 * scale,
              fontWeight: 800,
              color: '#38BDF8',
              textShadow: '0 2px 4px rgba(0,0,0,0.12)',
              zIndex: 20,
            }}
          >
            zZz
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wrapper transisi antar mood (fade + scale 0.9 ke 1) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mood}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="relative flex items-center justify-center w-full h-full"
        >
          {/* Badan utama tetesan air */}
          <motion.div
            animate={getBodyAnimation()}
            style={{
              width: 96 * scale,
              height: 108 * scale,
              borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%',
              background: bodyGradient,
              boxShadow: `
                inset -8px -10px 18px ${theme.inset},
                inset 8px 10px 16px rgba(255, 255, 255, 0.45),
                0 ${8 * scale}px 0 ${theme.ground}
              `,
              filter: mood === 'thirsty' ? 'saturate(0.7) brightness(1.08)' : 'none',
              transformOrigin: 'bottom center',
              position: 'relative',
            }}
          >
            {/* Kilau cahaya utama di dahi kiri atas */}
            <div
              style={{
                position: 'absolute',
                top: 16 * scale,
                left: 20 * scale,
                width: 16 * scale,
                height: 26 * scale,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.55)',
                transform: 'rotate(-28deg)',
              }}
            />

            {/* Lengan kiri & kanan (mengikuti warna badan) */}
            <div
              style={{
                position: 'absolute',
                left: -10 * scale,
                top: 56 * scale,
                width: 16 * scale,
                height: 24 * scale,
                borderRadius: 999,
                background: theme.base,
                transform:
                  mood === 'cheer' || mood === 'celebrate'
                    ? 'rotate(-135deg) translateY(-10px)'
                    : 'rotate(22deg)',
                transition: 'transform 0.25s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: -10 * scale,
                top: 56 * scale,
                width: 16 * scale,
                height: 24 * scale,
                borderRadius: 999,
                background: theme.base,
                transform:
                  mood === 'cheer' || mood === 'celebrate'
                    ? 'rotate(135deg) translateY(-10px)'
                    : 'rotate(-22deg)',
                transition: 'transform 0.25s ease',
              }}
            />

            {/* Wadah wajah */}
            <div
              style={{
                position: 'absolute',
                top: 44 * scale,
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Baris Mata */}
              <div
                style={{
                  display: 'flex',
                  gap: 18 * scale,
                  alignItems: 'center',
                }}
              >
                {[0, 1].map((idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 18 * scale,
                      height:
                        mood === 'sleepy' || isBlinking
                          ? 3 * scale
                          : mood === 'wow'
                          ? 21 * scale
                          : 19 * scale,
                      borderRadius: 999,
                      background: '#1E293B',
                      position: 'relative',
                      transition: 'height 0.1s ease',
                      transform:
                        mood === 'sad' || mood === 'thirsty'
                          ? idx === 0
                            ? 'rotate(-10deg)'
                            : 'rotate(10deg)'
                          : 'none',
                    }}
                  >
                    {/* Kilau bola mata putih */}
                    {mood !== 'sleepy' && !isBlinking && (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            top: 3 * scale,
                            left: 4 * scale,
                            width: 6 * scale,
                            height: 6 * scale,
                            borderRadius: '50%',
                            background: '#FFFFFF',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 3 * scale,
                            right: 4 * scale,
                            width: 3 * scale,
                            height: 3 * scale,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.8)',
                          }}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Pipi Merah Muda */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: 66 * scale,
                  marginTop: 2 * scale,
                }}
              >
                <div
                  style={{
                    width: 13 * scale,
                    height: 8 * scale,
                    borderRadius: '50%',
                    background:
                      mood === 'thirsty'
                        ? 'rgba(248, 113, 113, 0.35)'
                        : 'rgba(255, 118, 150, 0.65)',
                  }}
                />
                <div
                  style={{
                    width: 13 * scale,
                    height: 8 * scale,
                    borderRadius: '50%',
                    background:
                      mood === 'thirsty'
                        ? 'rgba(248, 113, 113, 0.35)'
                        : 'rgba(255, 118, 150, 0.65)',
                  }}
                />
              </div>

              {/* Mulut ekspresif berbasis CSS */}
              <div style={{ marginTop: -2 * scale }}>
                {(mood === 'happy' || mood === 'cheer' || mood === 'celebrate') && (
                  <div
                    style={{
                      width: (mood === 'happy' ? 18 : 22) * scale,
                      height: (mood === 'happy' ? 10 : 13) * scale,
                      background: '#7F1D1D',
                      borderRadius: '2px 2px 14px 14px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Lidah kecil */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -3 * scale,
                        left: '20%',
                        width: '60%',
                        height: 7 * scale,
                        borderRadius: '50%',
                        background: '#FB7185',
                      }}
                    />
                  </div>
                )}

                {(mood === 'wow' || mood === 'drinking') && (
                  <div
                    style={{
                      width: 13 * scale,
                      height: 15 * scale,
                      borderRadius: '50%',
                      background: '#7F1D1D',
                      border: `${2 * scale}px solid #1E293B`,
                    }}
                  />
                )}

                {(mood === 'sad' || mood === 'thirsty') && (
                  <div
                    style={{
                      width: 18 * scale,
                      height: 8 * scale,
                      borderTop: `${3 * scale}px solid #1E293B`,
                      borderRadius: '50% 50% 0 0',
                      marginTop: 4 * scale,
                    }}
                  />
                )}

                {mood === 'sleepy' && (
                  <div
                    style={{
                      width: 10 * scale,
                      height: 6 * scale,
                      borderRadius: '50%',
                      background: '#1E293B',
                      opacity: 0.75,
                    }}
                  />
                )}
              </div>
            </div>

            {/* ================= AKSESORI (ikut bergerak bersama badan) ================= */}

            {/* Topi (cap) */}
            {acc === 'hat' && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -12 * scale,
                  left: '50%',
                  width: 58 * scale,
                  height: 30 * scale,
                  transform: 'translateX(-50%) rotate(-6deg)',
                  transformOrigin: 'bottom center',
                  zIndex: 15,
                }}
              >
                {/* Kubah topi */}
                <div
                  style={{
                    position: 'absolute',
                    left: 4 * scale,
                    top: 0,
                    width: 50 * scale,
                    height: 24 * scale,
                    borderRadius: `${25 * scale}px ${25 * scale}px ${4 * scale}px ${4 * scale}px`,
                    background: 'linear-gradient(180deg, #FF6B6B 0%, #E63946 100%)',
                    boxShadow: 'inset -4px -4px 6px rgba(0,0,0,0.15)',
                  }}
                />
                {/* Kilau kubah */}
                <div
                  style={{
                    position: 'absolute',
                    left: 14 * scale,
                    top: 4 * scale,
                    width: 10 * scale,
                    height: 6 * scale,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.5)',
                    transform: 'rotate(-20deg)',
                  }}
                />
                {/* Kancing di puncak */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: -3 * scale,
                    width: 7 * scale,
                    height: 7 * scale,
                    marginLeft: -3.5 * scale,
                    borderRadius: '50%',
                    background: '#C92A3A',
                  }}
                />
                {/* Pinggiran topi (brim) */}
                <div
                  style={{
                    position: 'absolute',
                    left: 26 * scale,
                    top: 20 * scale,
                    width: 34 * scale,
                    height: 9 * scale,
                    borderRadius: 999,
                    background: '#C92A3A',
                    boxShadow: `0 ${2 * scale}px 0 rgba(0,0,0,0.15)`,
                  }}
                />
              </div>
            )}

            {/* Mahkota */}
            {acc === 'crown' && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -20 * scale,
                  left: '50%',
                  width: 42 * scale,
                  height: 28 * scale,
                  transform: 'translateX(-50%)',
                  zIndex: 15,
                  filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath:
                      'polygon(0% 100%, 0% 25%, 25% 60%, 50% 0%, 75% 60%, 100% 25%, 100% 100%)',
                    background: 'linear-gradient(180deg, #FFE14D 0%, #FF9600 100%)',
                  }}
                >
                  {/* Pita dasar mahkota */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: 7 * scale,
                      background: '#E08600',
                    }}
                  />
                </div>
                {/* Permata kecil di ujung mahkota */}
                {[
                  { left: '0%', top: '25%' },
                  { left: '50%', top: '0%' },
                  { left: '100%', top: '25%' },
                ].map((pos, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: pos.left,
                      top: pos.top,
                      width: 7 * scale,
                      height: 7 * scale,
                      marginLeft: -3.5 * scale,
                      marginTop: -3.5 * scale,
                      borderRadius: '50%',
                      background: i === 1 ? '#FF4B4B' : '#FFFFFF',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Kacamata */}
            {acc === 'glasses' && (
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none' }}>
                {[16, 52].map((left) => (
                  <div
                    key={left}
                    style={{
                      position: 'absolute',
                      left: left * scale,
                      top: 39 * scale,
                      width: 28 * scale,
                      height: 28 * scale,
                      borderRadius: '50%',
                      border: `${3 * scale}px solid #1E293B`,
                      background: 'rgba(255,255,255,0.22)',
                    }}
                  />
                ))}
                {/* Jembatan kacamata */}
                <div
                  style={{
                    position: 'absolute',
                    left: 44 * scale,
                    top: 51 * scale,
                    width: 8 * scale,
                    height: 3 * scale,
                    background: '#1E293B',
                  }}
                />
              </div>
            )}

            {/* Topi pesta khusus perayaan (hanya jika tanpa aksesori) */}
            {showPartyHat && (
              <motion.div
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                style={{
                  position: 'absolute',
                  top: -26 * scale,
                  left: '50%',
                  width: 30 * scale,
                  height: 38 * scale,
                  x: '-50%',
                  rotate: 10,
                  transformOrigin: 'bottom center',
                  zIndex: 15,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                    background: `repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0 ${5 * scale}px, transparent ${5 * scale}px ${12 * scale}px), linear-gradient(180deg, #FFD84D 0%, #FF9600 100%)`,
                  }}
                />
                {/* Pompom di puncak */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: -4 * scale,
                    width: 9 * scale,
                    height: 9 * scale,
                    marginLeft: -4.5 * scale,
                    borderRadius: '50%',
                    background: '#FF4B4B',
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
