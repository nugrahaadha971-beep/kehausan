import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ProgressBarProps {
  percent: number; // 0 to 100
  color?: 'water' | 'mint' | 'sun' | 'berry';
  heightClass?: string;
  shine?: boolean;
  className?: string;
  ariaLabel?: string;
}

const COLOR_MAP = {
  water: 'bg-[#1CB0F6]',
  mint: 'bg-[#58CC02]',
  sun: 'bg-[#FFC800]',
  berry: 'bg-[#CE82FF]',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  color = 'mint',
  heightClass = 'h-4',
  shine = true,
  className = '',
  ariaLabel = 'Progres',
}) => {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative w-full overflow-hidden rounded-full bg-[#E5E5E5] dark:bg-slate-700 ${heightClass} ${className}`}
    >
      <motion.div
        className={`relative h-full rounded-full ${COLOR_MAP[color]} overflow-hidden`}
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={
          reduceMotion
            ? { duration: 0.15 }
            : { type: 'spring', stiffness: 160, damping: 22 }
        }
      >
        {/* Highlight atas khas Duolingo */}
        <div className="absolute inset-x-2 top-1 h-[28%] rounded-full bg-white/35 pointer-events-none" />
        {/* Kilau berjalan */}
        {shine && !reduceMotion && clamped > 5 && (
          <div className="animate-shine absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />
        )}
      </motion.div>
    </div>
  );
};
