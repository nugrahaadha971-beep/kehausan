import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Award,
  Calendar,
  Crown,
  Droplet,
  Flame,
  Lock,
  Sunrise,
  X,
} from 'lucide-react';
import { MyDropi } from '../components/MyDropi';
import { ProgressBar } from '../components/ProgressBar';
import { Button3D } from '../components/Button3D';
import { useTetes } from '../state/TetesContext';
import {
  ACHIEVEMENTS,
  AchievementDefinition,
  computeAchievementValue,
  getTierForValue,
} from '../lib/achievements';
import { AchievementTier } from '../lib/types';
import { soundEngine } from '../lib/sound';

const TIER_STYLES: Record<
  AchievementTier,
  { label: string; bg: string; border: string; text: string }
> = {
  none: {
    label: 'Terkunci',
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-dashed border-slate-300 dark:border-slate-600',
    text: 'text-slate-400',
  },
  bronze: {
    label: 'Perunggu',
    bg: 'bg-gradient-to-b from-[#F5C596] to-[#D98A4E]',
    border: 'border-[#B86D35]',
    text: 'text-white',
  },
  silver: {
    label: 'Perak',
    bg: 'bg-gradient-to-b from-[#E8EEF5] to-[#B0C0D0]',
    border: 'border-[#899AAD]',
    text: 'text-[#2F3B47]',
  },
  gold: {
    label: 'Emas',
    bg: 'bg-gradient-to-b from-[#FFE66D] to-[#FFC800]',
    border: 'border-[#D9A200]',
    text: 'text-[#4A3600]',
  },
};

function BadgeIcon({
  icon,
  className,
}: {
  icon: AchievementDefinition['icon'];
  className?: string;
}) {
  switch (icon) {
    case 'droplet':
      return <Droplet className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'sunrise':
      return <Sunrise className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'calendar':
      return <Calendar className={className} />;
    default:
      return <Award className={className} />;
  }
}

export const Achievements: React.FC = () => {
  const { data } = useTetes();
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<{
    def: AchievementDefinition;
    tier: AchievementTier;
    value: number;
    nextTarget: number;
  } | null>(null);

  const nonCollectorUnlocked = ACHIEVEMENTS.filter(
    (a) => a.id !== 'collector' && data.achievements[a.id]
  ).length;

  const totalUnlocked = Object.keys(data.achievements).length;

  return (
    <div className="pb-24 px-4 pt-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#3C3C3C] dark:text-white">
            Pencapaian
          </h1>
          <p className="text-xs font-bold text-[#777777] dark:text-slate-400 tabular-nums">
            {totalUnlocked} dari {ACHIEVEMENTS.length} lencana terbuka
          </p>
        </div>

        <MyDropi
          mood={totalUnlocked > 0 ? 'cheer' : 'happy'}
          size={58}
        />
      </div>

      {/* Grid Lencana */}
      <div className="grid grid-cols-2 gap-3">
        {ACHIEVEMENTS.map((def, idx) => {
          const val = computeAchievementValue(
            def.id,
            data.logs,
            data.progress,
            data.profile.goalMl,
            nonCollectorUnlocked
          );
          const record: { unlockedAt: string; tier: Exclude<AchievementTier, 'none'> } | undefined =
            data.achievements[def.id];
          const earnedTier: AchievementTier = record?.tier ?? getTierForValue(def, val);
          const style = TIER_STYLES[earnedTier];
          const nextTarget =
            earnedTier === 'none'
              ? def.thresholds.bronze
              : earnedTier === 'bronze'
                ? def.thresholds.silver
                : def.thresholds.gold;
          const pct = Math.min(100, Math.round((val / nextTarget) * 100));

          return (
            <motion.button
              key={def.id}
              type="button"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04, type: 'spring', stiffness: 280, damping: 22 }}
              whileTap={reduceMotion ? {} : { scale: 0.97 }}
              onClick={() => {
                soundEngine.play('pop', data.settings.sound);
                setSelected({ def, tier: earnedTier, value: val, nextTarget });
              }}
              className="flex flex-col items-center rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-center cursor-pointer hover:border-[#1CB0F6]/60 transition-colors"
            >
              {/* Lencana Bulat */}
              <div
                className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 shadow-sm ${style.bg} ${style.border} ${style.text}`}
              >
                {earnedTier === 'none' ? (
                  <Lock className="w-6 h-6" />
                ) : (
                  <BadgeIcon icon={def.icon} className="w-7 h-7 stroke-[2.4]" />
                )}
              </div>

              <div className="mt-2.5 text-sm font-extrabold text-[#3C3C3C] dark:text-white leading-tight">
                {def.title}
              </div>
              <div className="mt-0.5 text-[11px] font-bold text-[#777777] dark:text-slate-400">
                {style.label} · {Math.min(val, nextTarget).toLocaleString('id-ID')}/
                {nextTarget.toLocaleString('id-ID')}
              </div>

              <div className="mt-2.5 w-full">
                <ProgressBar
                  percent={pct}
                  color={earnedTier === 'none' ? 'water' : 'sun'}
                  heightClass="h-2.5"
                  shine={false}
                  ariaLabel={`Progres lencana ${def.title}`}
                />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Modal Detail Lencana dengan Dropi "wow" */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="relative w-full max-w-sm rounded-[24px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center shadow-2xl"
              role="dialog"
              aria-label={selected.def.title}
            >
              <button
                type="button"
                aria-label="Tutup detail lencana"
                onClick={() => setSelected(null)}
                className="absolute right-3 top-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#777777] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <MyDropi
                mood={selected.tier === 'none' ? 'happy' : 'wow'}
                size={112}
              />

              <h2 className="mt-2 font-display text-2xl font-extrabold text-[#3C3C3C] dark:text-white">
                {selected.def.title}
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#777777] dark:text-slate-300">
                {selected.def.description}
              </p>

              <div className="mt-4 rounded-[16px] bg-[#F7FAFC] dark:bg-slate-800 p-3.5 text-left">
                <div className="flex justify-between text-xs font-extrabold text-[#3C3C3C] dark:text-slate-200 mb-2 tabular-nums">
                  <span>Tingkat: {TIER_STYLES[selected.tier].label}</span>
                  <span>
                    {selected.value.toLocaleString('id-ID')} /{' '}
                    {selected.nextTarget.toLocaleString('id-ID')} {selected.def.unit}
                  </span>
                </div>
                <ProgressBar
                  percent={Math.min(
                    100,
                    Math.round((selected.value / selected.nextTarget) * 100)
                  )}
                  color={selected.tier === 'none' ? 'water' : 'sun'}
                  heightClass="h-3"
                />
                <div className="mt-2.5 flex justify-between text-[11px] font-bold text-[#777777] dark:text-slate-400 tabular-nums">
                  <span>Perunggu: {selected.def.thresholds.bronze.toLocaleString('id-ID')}</span>
                  <span>Perak: {selected.def.thresholds.silver.toLocaleString('id-ID')}</span>
                  <span>Emas: {selected.def.thresholds.gold.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="mt-5">
                <Button3D
                  variant="water"
                  fullWidth
                  size="md"
                  onClick={() => setSelected(null)}
                >
                  Tutup
                </Button3D>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
