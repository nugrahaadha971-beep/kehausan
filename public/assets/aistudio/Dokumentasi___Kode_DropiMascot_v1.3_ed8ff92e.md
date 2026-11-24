# Modul Maskot: DropiMascot v1.3 (Organik, Kenyal & Interaktif)

Dokumen ini berisi pembaruan penuh komponen `src/components/DropiMascot.tsx` untuk mengatasi gerakan yang terasa kaku dan membuatnya lebih hidup seperti tetesan air sungguhan.

## Ringkasan Peningkatan Animasi
1. **Fisika Antisipasi & Pendaratan (*Squash & Stretch*):** Pada mood `cheer` dan `celebrate`, Dropi menekuk tubuh terlebih dahulu sebelum melompat ke atas dan memipih lembut saat mendarat.
2. **Bayangan Lantai Terpisah (*Grounded Shadow*):** Bayangan bawah dipisah dari elemen badan sehingga tetap menempel di permukaan dan mengecil secara realistis saat Dropi berada di puncak lompatan.
3. ***Follow-Through* & Ayunan Lengan Independen:** Wajah, kacamata, topi, mahkota, serta lengan kiri-kanan memiliki jeda inersia (*delay* 40–140 ms) agar tidak bergerak kaku sebagai satu blok gambar.
4. **Interaksi Ketuk (*Tap/Poke Jiggle*):** Mengetuk Dropi memicu efek membal seperti jeli air (*spring bounce*) disertai ekspresi kaget (`wow`) sesaat.
5. **Ekspresi Mikro Alami:** Dilengkapi *double-blink* acak (25% peluang berkedip dua kali) dan lirikan bola mata halus saat *idle*.

---

## Kode Lengkap (`src/components/DropiMascot.tsx`)

```tsx
/**
 * DropiMascot v1.3: Organik, Kenyal (Squash & Stretch), & Interaktif.
 *
 * Contoh Pemakaian:
 * import { DropiMascot } from './components/DropiMascot';
 *
 * <DropiMascot mood="happy" size={140} color="teal" accessory="hat" />
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useAnimationControls,
} from 'framer-motion';

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
    ground: 'rgba(17, 130, 186, 0.28)',
    ring: '#DDF4FF',
  },
  teal: {
    label: 'Tosca',
    light: '#8FF5E6',
    base: '#00C2B3',
    dark: '#00897D',
    inset: 'rgba(0, 80, 72, 0.35)',
    ground: 'rgba(0, 137, 125, 0.28)',
    ring: '#D5FBF6',
  },
  green: {
    label: 'Hijau',
    light: '#C2F28A',
    base: '#58CC02',
    dark: '#3F9100',
    inset: 'rgba(30, 80, 0, 0.35)',
    ground: 'rgba(63, 145, 0, 0.28)',
    ring: '#E3F9CC',
  },
  purple: {
    label: 'Ungu',
    light: '#E3C2FF',
    base: '#CE82FF',
    dark: '#9A4FD1',
    inset: 'rgba(70, 20, 110, 0.35)',
    ground: 'rgba(154, 79, 209, 0.28)',
    ring: '#F3E4FF',
  },
  yellow: {
    label: 'Kuning',
    light: '#FFE98A',
    base: '#FFC800',
    dark: '#D9A000',
    inset: 'rgba(110, 80, 0, 0.3)',
    ground: 'rgba(217, 160, 0, 0.28)',
    ring: '#FFF4C2',
  },
  pink: {
    label: 'Merah Muda',
    light: '#FFC2C2',
    base: '#FF7B7B',
    dark: '#D94F4F',
    inset: 'rgba(110, 25, 25, 0.3)',
    ground: 'rgba(217, 79, 79, 0.28)',
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
  /** Opsional: callback saat maskot diketuk pengguna */
  onPoke?: () => void;
}

export const DropiMascot: React.FC<DropiMascotProps> = ({
  mood = 'happy',
  size = 140,
  className = '',
  color = 'blue',
  accessory = 'none',
  onPoke,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [isBlinking, setIsBlinking] = useState(false);
  const [isPoked, setIsPoked] = useState(false);
  const [lookOffset, setLookOffset] = useState({ x: 0, y: 0 });
  const pokeControls = useAnimationControls();
  const pokeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = useMemo(() => getDropiTheme(color), [color]);
  const acc = normalizeDropiAccessory(accessory);
  const effectiveMood: DropiMood = isPoked && mood !== 'sleepy' ? 'wow' : mood;
  const showPartyHat = effectiveMood === 'celebrate' && acc === 'none';

  // 1. Kedipan mata alami (sesekali double-blink)
  useEffect(() => {
    if (effectiveMood === 'sleepy' || prefersReducedMotion) return;

    let blinkTimeout: ReturnType<typeof setTimeout>;
    let subTimeout: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      const nextDelay = 2600 + Math.random() * 2600;
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        const isDouble = Math.random() < 0.25;

        subTimeout = setTimeout(() => {
          setIsBlinking(false);
          if (isDouble) {
            subTimeout = setTimeout(() => {
              setIsBlinking(true);
              subTimeout = setTimeout(() => {
                setIsBlinking(false);
                scheduleBlink();
              }, 110);
            }, 90);
          } else {
            scheduleBlink();
          }
        }, 120);
      }, nextDelay);
    };

    scheduleBlink();
    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(subTimeout);
    };
  }, [effectiveMood, prefersReducedMotion]);

  // Lirikan bola mata halus saat idle/happy
  useEffect(() => {
    if (prefersReducedMotion || effectiveMood === 'sleepy') {
      setLookOffset({ x: 0, y: 0 });
      return;
    }
    const interval = setInterval(() => {
      const dirs = [
        { x: 0, y: 0 },
        { x: 1.5, y: -0.5 },
        { x: -1.5, y: -0.5 },
        { x: 0, y: 0 },
      ];
      setLookOffset(dirs[Math.floor(Math.random() * dirs.length)]);
    }, 2200);
    return () => clearInterval(interval);
  }, [effectiveMood, prefersReducedMotion]);

  // 2. Interaksi saat Dropi diketuk (efek jeli air membal)
  const handlePoke = () => {
    onPoke?.();
    if (prefersReducedMotion) return;

    setIsPoked(true);
    if (pokeTimerRef.current) clearTimeout(pokeTimerRef.current);
    pokeTimerRef.current = setTimeout(() => setIsPoked(false), 650);

    pokeControls.start({
      scaleX: [1, 1.24, 0.84, 1.1, 0.96, 1],
      scaleY: [1, 0.78, 1.18, 0.92, 1.04, 1],
      rotate: [0, -5, 5, -2, 0],
      transition: { duration: 0.55, ease: 'easeOut' },
    });
  };

  useEffect(() => {
    return () => {
      if (pokeTimerRef.current) clearTimeout(pokeTimerRef.current);
    };
  }, []);

  // 3. Kurva gerak badan utama (antisipasi -> lompat -> squash mendarat)
  const getBodyAnimation = () => {
    if (prefersReducedMotion) return { opacity: 1, scale: 1, y: 0 };

    switch (effectiveMood) {
      case 'cheer':
        return {
          y: [0, 4, -24, 2, -4, 0],
          scaleX: [1, 1.14, 0.88, 1.16, 0.96, 1],
          scaleY: [1, 0.86, 1.14, 0.84, 1.04, 1],
          rotate: [0, -2, 3, -2, 0, 0],
          transition: {
            duration: 0.95,
            times: [0, 0.15, 0.45, 0.68, 0.85, 1],
            ease: 'easeInOut' as const,
            repeat: Infinity,
            repeatDelay: 0.6,
          },
        };
      case 'celebrate':
        return {
          y: [0, 3, -20, 2, -16, 0],
          rotate: [0, -4, -9, 4, 9, 0],
          scaleX: [1, 1.12, 0.9, 1.14, 0.92, 1],
          scaleY: [1, 0.88, 1.12, 0.86, 1.1, 1],
          transition: {
            duration: 1.15,
            times: [0, 0.14, 0.36, 0.55, 0.78, 1],
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      case 'thirsty':
        return {
          x: [0, -1.8, 1.8, -1.2, 1.2, 0],
          y: [0, 2, 2.5, 2, 0],
          scaleX: [1, 1.07, 1.08, 1.06, 1],
          scaleY: [1, 0.93, 0.92, 0.94, 1],
          rotate: [0, -1.5, 1.5, -1, 0],
          transition: {
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      case 'sad':
        return {
          y: [0, 3, 0],
          scaleX: [1, 1.06, 1],
          scaleY: [1, 0.94, 1],
          rotate: [-2, 0, -2],
          transition: {
            duration: 2.8,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      case 'sleepy':
        return {
          scaleX: [1, 1.06, 1.01, 1],
          scaleY: [1, 0.94, 0.99, 1],
          rotate: [0, 2.5, -1, 0],
          transition: {
            duration: 3.6,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      case 'drinking':
        return {
          y: [0, -4, 1, -3, 0],
          scaleX: [1, 0.94, 1.08, 0.96, 1],
          scaleY: [1, 1.06, 0.92, 1.04, 1],
          rotate: [0, -4, 2, -3, 0],
          transition: {
            duration: 0.65,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      case 'wow':
        return {
          y: [0, -8, 0],
          scaleX: [1, 0.91, 1.07, 1],
          scaleY: [1, 1.1, 0.93, 1],
          transition: {
            duration: 0.55,
            ease: 'easeOut' as const,
          },
        };
      default:
        return {
          y: [0, -5, -1, 0],
          scaleX: [1, 0.96, 1.06, 1],
          scaleY: [1, 1.04, 0.95, 1],
          rotate: [0, -1.8, 1.5, 0],
          transition: {
            duration: 2.8,
            times: [0, 0.42, 0.78, 1],
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
    }
  };

  // 4. Bayangan lantai terpisah
  const getGroundShadowAnimation = () => {
    if (prefersReducedMotion) return {};
    if (effectiveMood === 'cheer') {
      return {
        scaleX: [1, 1.12, 0.62, 1.15, 0.95, 1],
        opacity: [0.85, 0.95, 0.35, 1, 0.85, 0.85],
        transition: {
          duration: 0.95,
          times: [0, 0.15, 0.45, 0.68, 0.85, 1],
          repeat: Infinity,
          repeatDelay: 0.6,
        },
      };
    }
    if (effectiveMood === 'celebrate') {
      return {
        scaleX: [1, 1.1, 0.65, 1.12, 0.7, 1],
        opacity: [0.85, 0.95, 0.4, 0.95, 0.45, 0.85],
        transition: {
          duration: 1.15,
          times: [0, 0.14, 0.36, 0.55, 0.78, 1],
          repeat: Infinity,
        },
      };
    }
    return {
      scaleX: [1, 0.9, 1.05, 1],
      opacity: [0.85, 0.65, 0.9, 0.85],
      transition: {
        duration: 2.8,
        times: [0, 0.42, 0.78, 1],
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    };
  };

  // 5. Ayunan lengan organik
  const getArmAnimation = (side: 'left' | 'right') => {
    const dir = side === 'left' ? -1 : 1;
    if (prefersReducedMotion) {
      return { rotate: dir * -22 };
    }
    if (effectiveMood === 'cheer' || effectiveMood === 'celebrate') {
      return {
        rotate: [dir * 125, dir * 155, dir * 120, dir * 150, dir * 125],
        y: [-8, -13, -7, -12, -8],
        transition: {
          duration: 0.55,
          repeat: Infinity,
          ease: 'easeInOut' as const,
          delay: side === 'right' ? 0.08 : 0,
        },
      };
    }
    if (effectiveMood === 'drinking') {
      return {
        rotate: side === 'right' ? [110, 125, 110] : [-25, -15, -25],
        y: side === 'right' ? [-6, -9, -6] : [0, -2, 0],
        transition: { duration: 0.65, repeat: Infinity, ease: 'easeInOut' as const },
      };
    }
    if (effectiveMood === 'thirsty' || effectiveMood === 'sad') {
      return {
        rotate: [dir * -12, dir * -8, dir * -12],
        y: [3, 5, 3],
        transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const },
      };
    }
    return {
      rotate: [dir * -20, dir * -32, dir * -16, dir * -20],
      transition: {
        duration: 2.8,
        repeat: Infinity,
        ease: 'easeInOut' as const,
        delay: side === 'left' ? 0.1 : 0.16,
      },
    };
  };

  // 6. Follow-through wajah
  const getFaceFollowThrough = () => {
    if (prefersReducedMotion) return {};
    if (effectiveMood === 'cheer' || effectiveMood === 'celebrate') {
      return {
        y: [0, 2, -4, 2, 0],
        transition: { duration: 0.95, repeat: Infinity, ease: 'easeInOut' as const },
      };
    }
    return {
      y: [0, -1.8, 1.2, 0],
      x: [0, -0.8, 0.8, 0],
      transition: {
        duration: 2.8,
        repeat: Infinity,
        ease: 'easeInOut' as const,
        delay: 0.12,
      },
    };
  };

  const bodyGradient = `radial-gradient(circle at 32% 28%, ${theme.light} 0%, ${theme.base} 58%, ${theme.dark} 100%)`;
  const scale = size / 140;

  return (
    <div
      onClick={handlePoke}
      className={`relative inline-flex items-center justify-center select-none cursor-pointer ${className}`}
      style={{ width: size, height: size, WebkitTapHighlightColor: 'transparent' }}
      role="img"
      aria-label={`Maskot Dropi ${theme.label} sedang ${effectiveMood}`}
    >
      {/* Partikel suasana */}
      <AnimatePresence mode="wait">
        {effectiveMood === 'thirsty' && !prefersReducedMotion && (
          <motion.div
            key="sweat-drop"
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], y: [0, 16, 28], scale: [0.7, 1, 0.85] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.35, repeat: Infinity, ease: 'easeIn' }}
            style={{
              position: 'absolute',
              top: 24 * scale,
              right: 20 * scale,
              width: 10 * scale,
              height: 14 * scale,
              borderRadius: '0 50% 50% 50%',
              rotate: 45,
              background: 'radial-gradient(circle at 35% 35%, #FFFFFF, #7DD3FC)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              zIndex: 25,
            }}
          />
        )}

        {effectiveMood === 'sleepy' && !prefersReducedMotion && (
          <motion.div
            key="zzz-text"
            initial={{ opacity: 0, y: 4, scale: 0.75 }}
            animate={{
              opacity: [0, 1, 0.9, 0],
              y: -24 * scale,
              x: [0, 5 * scale, -3 * scale],
              scale: [0.8, 1.15],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 8 * scale,
              right: 12 * scale,
              fontSize: 16 * scale,
              fontWeight: 800,
              color: '#38BDF8',
              textShadow: '0 2px 4px rgba(0,0,0,0.12)',
              zIndex: 25,
            }}
          >
            zZz
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bayangan lantai terpisah */}
      <motion.div
        animate={getGroundShadowAnimation()}
        style={{
          position: 'absolute',
          bottom: 10 * scale,
          width: 78 * scale,
          height: 14 * scale,
          borderRadius: '50%',
          background: theme.ground,
          filter: 'blur(1px)',
          zIndex: 1,
        }}
      />

      {/* Wrapper transisi mood + reaksi ketuk */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mood}
          initial={{ opacity: 0, scale: 0.85, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20 }}
          className="relative flex items-center justify-center w-full h-full z-10"
        >
          {/* Layer khusus efek jeli saat diketuk */}
          <motion.div
            animate={pokeControls}
            style={{ transformOrigin: 'bottom center' }}
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
                  inset 8px 10px 16px rgba(255, 255, 255, 0.48)
                `,
                filter:
                  effectiveMood === 'thirsty'
                    ? 'saturate(0.68) brightness(1.08)'
                    : 'none',
                transformOrigin: 'bottom center',
                position: 'relative',
              }}
            >
              {/* Kilau cahaya utama di dahi kiri atas */}
              <motion.div
                animate={
                  prefersReducedMotion
                    ? {}
                    : { scale: [1, 1.08, 0.96, 1], opacity: [0.55, 0.72, 0.5, 0.55] }
                }
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  top: 15 * scale,
                  left: 19 * scale,
                  width: 16 * scale,
                  height: 26 * scale,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.6)',
                  rotate: -28,
                }}
              />
              {/* Titik kilau kedua kecil */}
              <div
                style={{
                  position: 'absolute',
                  top: 42 * scale,
                  left: 14 * scale,
                  width: 6 * scale,
                  height: 6 * scale,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.45)',
                }}
              />

              {/* Lengan Kiri */}
              <motion.div
                animate={getArmAnimation('left')}
                style={{
                  position: 'absolute',
                  left: -9 * scale,
                  top: 52 * scale,
                  width: 16 * scale,
                  height: 24 * scale,
                  borderRadius: 999,
                  background: `linear-gradient(180deg, ${theme.base} 0%, ${theme.dark} 100%)`,
                  transformOrigin: 'top center',
                  zIndex: -1,
                }}
              />

              {/* Lengan Kanan */}
              <motion.div
                animate={getArmAnimation('right')}
                style={{
                  position: 'absolute',
                  right: -9 * scale,
                  top: 52 * scale,
                  width: 16 * scale,
                  height: 24 * scale,
                  borderRadius: 999,
                  background: `linear-gradient(180deg, ${theme.base} 0%, ${theme.dark} 100%)`,
                  transformOrigin: 'top center',
                  zIndex: -1,
                }}
              />

              {/* Wadah wajah dengan inersia follow-through */}
              <motion.div
                animate={getFaceFollowThrough()}
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
                  {[0, 1].map((idx) => {
                    const isHappySquint =
                      (effectiveMood === 'cheer' || effectiveMood === 'celebrate') &&
                      !isBlinking;

                    return (
                      <motion.div
                        key={idx}
                        animate={{
                          scaleY:
                            effectiveMood === 'sleepy' || isBlinking
                              ? 0.16
                              : isHappySquint
                              ? 0.85
                              : effectiveMood === 'wow'
                              ? 1.12
                              : 1,
                          scaleX: isBlinking ? 1.15 : 1,
                        }}
                        transition={{ duration: 0.09 }}
                        style={{
                          width: 18 * scale,
                          height: 19 * scale,
                          borderRadius: 999,
                          background: '#1E293B',
                          position: 'relative',
                          transform:
                            effectiveMood === 'sad' || effectiveMood === 'thirsty'
                              ? idx === 0
                                ? 'rotate(-12deg)'
                                : 'rotate(12deg)'
                              : 'none',
                        }}
                      >
                        {effectiveMood !== 'sleepy' && !isBlinking && (
                          <motion.div
                            animate={{
                              x: lookOffset.x * scale,
                              y: lookOffset.y * scale,
                            }}
                            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                            style={{ position: 'absolute', inset: 0 }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                top: 3 * scale,
                                left: 4 * scale,
                                width: 6.5 * scale,
                                height: 6.5 * scale,
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
                                background: 'rgba(255,255,255,0.85)',
                              }}
                            />
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
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
                  {[0, 1].map((c) => (
                    <motion.div
                      key={c}
                      animate={{
                        scale:
                          effectiveMood === 'cheer' || effectiveMood === 'celebrate'
                            ? [1, 1.18, 1]
                            : 1,
                      }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                      style={{
                        width: 13 * scale,
                        height: 8 * scale,
                        borderRadius: '50%',
                        background:
                          effectiveMood === 'thirsty'
                            ? 'rgba(248, 113, 113, 0.35)'
                            : 'rgba(255, 118, 150, 0.68)',
                      }}
                    />
                  ))}
                </div>

                {/* Mulut ekspresif */}
                <div style={{ marginTop: -2 * scale }}>
                  {(effectiveMood === 'happy' ||
                    effectiveMood === 'cheer' ||
                    effectiveMood === 'celebrate') && (
                    <motion.div
                      animate={
                        effectiveMood === 'cheer' || effectiveMood === 'celebrate'
                          ? { scaleY: [1, 1.15, 0.95, 1] }
                          : {}
                      }
                      transition={{ duration: 0.6, repeat: Infinity }}
                      style={{
                        width: (effectiveMood === 'happy' ? 18 : 22) * scale,
                        height: (effectiveMood === 'happy' ? 10 : 13) * scale,
                        background: '#7F1D1D',
                        borderRadius: '2px 2px 14px 14px',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
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
                    </motion.div>
                  )}

                  {(effectiveMood === 'wow' || effectiveMood === 'drinking') && (
                    <motion.div
                      animate={
                        effectiveMood === 'drinking'
                          ? { scale: [1, 0.82, 1.05, 1] }
                          : { scale: [0.7, 1.15, 1] }
                      }
                      transition={{
                        duration: effectiveMood === 'drinking' ? 0.65 : 0.35,
                        repeat: effectiveMood === 'drinking' ? Infinity : 0,
                      }}
                      style={{
                        width: 13 * scale,
                        height: 15 * scale,
                        borderRadius: '50%',
                        background: '#7F1D1D',
                        border: `${2 * scale}px solid #1E293B`,
                      }}
                    />
                  )}

                  {(effectiveMood === 'sad' || effectiveMood === 'thirsty') && (
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

                  {effectiveMood === 'sleepy' && (
                    <motion.div
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
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
              </motion.div>

              {/* ================= AKSESORI ================= */}

              {acc === 'hat' && (
                <motion.div
                  aria-hidden="true"
                  animate={
                    prefersReducedMotion
                      ? {}
                      : { y: [0, -1.5, 0.5, 0], rotate: [-6, -8, -5, -6] }
                  }
                  transition={{ duration: 2.8, repeat: Infinity, delay: 0.14 }}
                  style={{
                    position: 'absolute',
                    top: -12 * scale,
                    left: '50%',
                    width: 58 * scale,
                    height: 30 * scale,
                    x: '-50%',
                    transformOrigin: 'bottom center',
                    zIndex: 15,
                  }}
                >
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
                </motion.div>
              )}

              {acc === 'crown' && (
                <motion.div
                  aria-hidden="true"
                  animate={
                    prefersReducedMotion
                      ? {}
                      : { y: [0, -2, 0.5, 0], rotate: [0, -2, 2, 0] }
                  }
                  transition={{ duration: 2.8, repeat: Infinity, delay: 0.14 }}
                  style={{
                    position: 'absolute',
                    top: -20 * scale,
                    left: '50%',
                    width: 42 * scale,
                    height: 28 * scale,
                    x: '-50%',
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
                </motion.div>
              )}

              {acc === 'glasses' && (
                <motion.div
                  aria-hidden="true"
                  animate={getFaceFollowThrough()}
                  style={{ position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none' }}
                >
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
                </motion.div>
              )}

              {showPartyHat && (
                <motion.div
                  aria-hidden="true"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1, rotate: [10, 14, 7, 10] }}
                  transition={{
                    scale: { type: 'spring', stiffness: 260, damping: 14 },
                    rotate: { duration: 1.15, repeat: Infinity },
                  }}
                  style={{
                    position: 'absolute',
                    top: -26 * scale,
                    left: '50%',
                    width: 30 * scale,
                    height: 38 * scale,
                    x: '-50%',
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
```