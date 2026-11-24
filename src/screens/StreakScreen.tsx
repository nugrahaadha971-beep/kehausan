import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Flame, Shield } from 'lucide-react';
import { MyDropi } from '../components/MyDropi';
import { Button3D } from '../components/Button3D';
import { ProgressBar } from '../components/ProgressBar';
import { useTetes } from '../state/TetesContext';
import {
  getCurrentWeekStrip,
  getNextStreakMilestone,
  getPreviousStreakMilestone,
} from '../lib/streak';

export const StreakScreen: React.FC = () => {
  const { data, setScreen } = useTetes();
  const reduceMotion = useReducedMotion();

  const targetStreak = data.progress.streak;
  const startStreak = Math.max(0, targetStreak - 1);
  const [shownNumber, setShownNumber] = useState(
    reduceMotion ? targetStreak : startStreak
  );

  useEffect(() => {
    if (reduceMotion) {
      setShownNumber(targetStreak);
      return;
    }
    const timer = window.setTimeout(() => {
      setShownNumber(targetStreak);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [targetStreak, reduceMotion]);

  const weekStrip = getCurrentWeekStrip(
    data.logs,
    data.profile.goalMl,
    data.progress.lastFreezeUsedDate
  );

  const nextMilestone = getNextStreakMilestone(targetStreak);
  const prevMilestone = getPreviousStreakMilestone(targetStreak);
  const milestoneSpan = Math.max(1, nextMilestone - prevMilestone);
  const milestoneCurrent = Math.max(0, targetStreak - prevMilestone);
  const milestonePercent = Math.min(
    100,
    Math.round((milestoneCurrent / milestoneSpan) * 100)
  );
  const daysRemaining = Math.max(0, nextMilestone - targetStreak);

  return (
    <div
      className="relative flex min-h-dvh flex-col justify-between overflow-hidden px-5 py-8 text-white"
      style={{
        background: 'linear-gradient(180deg, #1B0B4E 0%, #2C268D 55%, #4B5CF2 100%)',
      }}
    >
      {/* Spotlight dari atas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[380px] h-[340px] opacity-35"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(255, 200, 0, 0.55) 0%, rgba(75, 92, 242, 0) 72%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center pt-4 text-center">
        {/* Dropi kecil mengintip di belakang/atas api raksasa */}
        <div className="relative flex flex-col items-center">
          <motion.div
            initial={reduceMotion ? {} : { y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 18 }}
            className="-mb-6 z-0"
          >
            <MyDropi mood="cheer" size={76} />
          </motion.div>

          {/* Ikon api besar berdenyut */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="animate-flame relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-b from-[#FFE14D]/30 via-[#FF9600]/25 to-[#FF5500]/20 shadow-[0_0_50px_rgba(255,150,0,0.55)]">
              <Flame className="w-20 h-20 text-[#FF9600] fill-[#FFC800] drop-shadow-lg" />
            </div>
          </div>
        </div>

        {/* Angka streak raksasa dengan efek roda angka */}
        <div className="mt-3 flex items-baseline justify-center overflow-hidden h-20">
          <motion.span
            key={shownNumber}
            initial={reduceMotion ? false : { y: 36, opacity: 0, scale: 0.85 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 16 }}
            className="font-display text-7xl font-extrabold leading-none text-[#FFC800] tabular-nums drop-shadow-md"
          >
            {shownNumber}
          </motion.span>
        </div>

        <h1 className="mt-1 font-display text-2xl font-extrabold text-white">
          Streak {targetStreak} hari!
        </h1>
        <p className="mt-1 text-sm font-bold text-indigo-100/90 max-w-xs">
          Kamu luar biasa, {data.profile.name || 'Teman'}! Teruskan kebiasaan segarmu.
        </p>

        {/* Strip 7 hari (S S R K J S M) */}
        <div className="mt-6 w-full rounded-[20px] bg-white/10 backdrop-blur-sm border border-white/15 p-4">
          <div className="grid grid-cols-7 gap-1.5">
            {weekStrip.map((day, i) => (
              <motion.div
                key={day.dateKey}
                initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 320, damping: 20 }}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={`text-xs font-extrabold ${
                    day.isToday ? 'text-[#FFC800]' : 'text-indigo-200'
                  }`}
                >
                  {day.label}
                </span>

                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                    day.completed
                      ? 'bg-[#FF9600] border-[#FFE066] text-white shadow-[0_0_12px_rgba(255,150,0,0.65)]'
                      : day.frozen
                        ? 'bg-[#1CB0F6] border-[#9BE7FF] text-white'
                        : day.isToday
                          ? 'border-[#FFC800] bg-white/10 text-indigo-200'
                          : 'border-white/20 bg-white/5 text-white/30'
                  }`}
                  title={day.dateKey}
                >
                  {day.completed ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : day.frozen ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <Flame className="w-3.5 h-3.5 opacity-40" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {data.streakFreezes > 0 && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-[#9BE7FF]">
              <Shield className="w-3.5 h-3.5" />
              <span>
                Kamu punya {data.streakFreezes} Pelindung Streak siap menjaga harimu
              </span>
            </div>
          )}
        </div>

        {/* Bar progres milestone berikutnya */}
        <div className="mt-4 w-full rounded-[20px] bg-white/10 backdrop-blur-sm border border-white/15 p-4 text-left">
          <div className="flex items-center justify-between text-xs font-extrabold text-[#FFE066] mb-2 tabular-nums">
            <span>Menuju Milestone {nextMilestone} Hari</span>
            <span>
              {targetStreak} / {nextMilestone}
            </span>
          </div>
          <ProgressBar
            percent={milestonePercent}
            color="sun"
            heightClass="h-3.5"
            ariaLabel={`Progres menuju streak ${nextMilestone} hari`}
          />
          <p className="mt-2.5 text-xs font-bold text-indigo-100">
            {targetStreak === 0
              ? `Capai 100% target hari ini untuk menyalakan streak pertamamu!`
              : daysRemaining === 0
                ? 'Milestone luar biasa tercapai!'
                : `Wah ada percikan! Tinggal ${daysRemaining} hari lagi menuju ${nextMilestone} hari.`}
          </p>
        </div>
      </div>

      {/* Tombol putih besar LANJUT */}
      <div className="relative z-10 pt-6">
        <Button3D
          variant="white"
          fullWidth
          size="lg"
          onClick={() => setScreen('app')}
          className="!text-[#1B0B4E] dark:!bg-white dark:!text-[#1B0B4E]"
        >
          LANJUT
        </Button3D>
      </div>
    </div>
  );
};
