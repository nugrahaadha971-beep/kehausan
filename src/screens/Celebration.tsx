import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';
import { MyDropi } from '../components/MyDropi';
import { Button3D } from '../components/Button3D';
import { Burst } from '../components/Burst';
import { useTetes } from '../state/TetesContext';

export const Celebration: React.FC = () => {
  const { data, todayTotalMl, setScreen } = useTetes();
  const reduceMotion = useReducedMotion();
  const [burstTrigger, setBurstTrigger] = useState(0);

  // Saat target harian tercapai, naikkan trigger dua kali dengan selang 250 ms
  useEffect(() => {
    setBurstTrigger((c) => c + 1);
    const timer = window.setTimeout(() => {
      setBurstTrigger((c) => c + 1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#E8F8FF] via-[#FFFDF2] to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 px-6 py-10 text-center">
      <Burst trigger={burstTrigger} />

      {/* Cahaya berputar (sunburst) berbasis CSS */}
      {!reduceMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[58%] w-[440px] h-[440px] rounded-full opacity-30 animate-sunburst"
          style={{
            background:
              'repeating-conic-gradient(from 0deg, rgba(255, 200, 0, 0.55) 0deg 15deg, transparent 15deg 30deg)',
            maskImage: 'radial-gradient(circle, black 20%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(circle, black 20%, transparent 70%)',
          }}
        />
      )}

      <div className="relative z-10 pt-6">
        <span className="inline-block rounded-full bg-[#D7FFB8] dark:bg-emerald-950 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#2E7D00] dark:text-[#9AF762]">
          100% Terpenuhi!
        </span>
      </div>

      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="relative z-10 flex flex-col items-center"
      >
        <MyDropi mood="celebrate" size={172} />

        <h1 className="mt-4 font-display text-3xl font-extrabold text-[#3C3C3C] dark:text-white">
          Target hari ini tercapai!
        </h1>
        <p className="mt-2 text-base font-bold text-[#777777] dark:text-slate-300">
          Keren banget, {data.profile.name || 'Teman'}! Tubuhmu terhidrasi sempurna.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-xs">
          <div className="rounded-[20px] border-2 border-[#BCE8FF] dark:border-slate-700 bg-white/95 dark:bg-slate-800 p-4 shadow-sm">
            <div className="text-xs font-extrabold text-[#777777] dark:text-slate-400">
              Total Hari Ini
            </div>
            <div className="mt-1 font-display text-2xl font-extrabold text-[#1CB0F6] tabular-nums">
              {todayTotalMl.toLocaleString('id-ID')} ml
            </div>
          </div>

          <div className="rounded-[20px] border-2 border-[#FFE47A] dark:border-amber-700/60 bg-white/95 dark:bg-slate-800 p-4 shadow-sm">
            <div className="text-xs font-extrabold text-[#777777] dark:text-slate-400">
              Bonus Target
            </div>
            <div className="mt-1 inline-flex items-center justify-center gap-1 font-display text-2xl font-extrabold text-[#E0A800] dark:text-[#FFD633] tabular-nums">
              <Star className="w-5 h-5 fill-[#FFC800] text-[#FFC800]" />
              +50 XP
            </div>
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 w-full">
        <Button3D
          variant="mint"
          fullWidth
          size="lg"
          onClick={() => setScreen('streak')}
        >
          LANJUT
        </Button3D>
      </div>
    </div>
  );
};
