import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MyDropi } from '../components/MyDropi';

interface SplashProps {
  onDone: () => void;
}

const MINI_DROPS: { x: string; delay: number; size: number }[] = [
  { x: '10%', delay: 0.05, size: 42 },
  { x: '26%', delay: 0.18, size: 36 },
  { x: '45%', delay: 0.1, size: 44 },
  { x: '64%', delay: 0.24, size: 38 },
  { x: '82%', delay: 0.14, size: 42 },
  { x: '91%', delay: 0.28, size: 34 },
];

export const Splash: React.FC<SplashProps> = ({ onDone }) => {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDone();
    }, 1550);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#DDF4FF] via-[#F4FBFF] to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 px-6 text-center"
    >
      {/* Logo utama */}
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { scale: 0.75, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="relative flex items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute h-36 w-36 rounded-full bg-[#BCE8FF]/45 dark:bg-sky-500/15 blur-sm"
          />
          <MyDropi mood="cheer" size={136} />
        </div>
        <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight text-[#1CB0F6]">
          Tetes
        </h1>
        <p className="mt-1.5 text-base font-bold text-[#777777] dark:text-slate-300">
          Minum air, jadi kebiasaan seru.
        </p>
      </motion.div>

      {/* Hujan Dropi kecil memantul di bawah layar */}
      {!reduceMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 overflow-hidden"
        >
          {MINI_DROPS.map((item, i) => (
            <motion.div
              key={i}
              style={{ left: item.x }}
              className="absolute -translate-x-1/2 bottom-4"
              initial={{ y: -420, opacity: 0 }}
              animate={{
                y: [-420, 0, -28, 0, -10, 0],
                opacity: [0, 1, 1, 1, 1, 1],
              }}
              transition={{
                duration: 1.15,
                delay: item.delay,
                times: [0, 0.52, 0.68, 0.82, 0.92, 1],
                ease: 'easeOut',
              }}
            >
              <MyDropi mood="happy" size={item.size} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
