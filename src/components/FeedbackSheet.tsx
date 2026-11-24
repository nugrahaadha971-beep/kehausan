import React, { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button3D } from './Button3D';
import { MyDropi } from './MyDropi';
import { DrinkEventFeedback } from '../state/TetesContext';
import {
  getDrinkTypeOption,
  getLogDrinkType,
  getLogEffectiveMl,
  getLogRawAmountMl,
} from '../lib/hydration';

interface FeedbackSheetProps {
  feedback: DrinkEventFeedback | null;
  onContinue: () => void;
}

const POSITIVE_TITLES = [
  'Mantap!',
  'Segar!',
  'Terus begitu!',
  'Glek glek, keren!',
  'Lanjutkan!',
  'Hebat sekali!',
  'Tubuhmu berterima kasih!',
  'Fokus makin tajam!',
  'Tegukan sempurna!',
  'Konsisten banget!',
  'Energi terisi lagi!',
  'Juara hidrasi!',
];

const CLOUD_PUFFS = [
  { left: '-4%', width: 68, height: 42 },
  { left: '9%', width: 74, height: 48 },
  { left: '23%', width: 70, height: 44 },
  { left: '36%', width: 78, height: 50 },
  { left: '51%', width: 72, height: 46 },
  { left: '65%', width: 76, height: 48 },
  { left: '79%', width: 70, height: 44 },
  { left: '91%', width: 64, height: 40 },
];

export const FeedbackSheet: React.FC<FeedbackSheetProps> = ({
  feedback,
  onContinue,
}) => {
  const reduceMotion = useReducedMotion();

  const title = useMemo(() => {
    if (!feedback) return POSITIVE_TITLES[0];
    const idx = Math.floor(Math.random() * POSITIVE_TITLES.length);
    return POSITIVE_TITLES[idx];
  }, [feedback]);

  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          key={feedback.log.id}
          initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
          animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
          transition={
            reduceMotion
              ? { duration: 0.15 }
              : { type: 'spring', stiffness: 300, damping: 28 }
          }
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
          role="dialog"
          aria-label="Konfirmasi catatan minum"
        >
          {/* Awan hijau bergelombang berbasis CSS (lingkaran/elips bertumpuk) bergerak naik-turun pelan */}
          <motion.div
            aria-hidden="true"
            animate={reduceMotion ? {} : { y: [0, -3.5, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="relative h-7 w-full overflow-hidden -mb-1 pointer-events-none"
          >
            {CLOUD_PUFFS.map((puff, i) => (
              <span
                key={i}
                style={{
                  left: puff.left,
                  width: puff.width,
                  height: puff.height,
                }}
                className="absolute top-1.5 rounded-full bg-[#D7FFB8] dark:bg-[#153F1E]"
              />
            ))}
          </motion.div>

          <div className="relative bg-[#D7FFB8] dark:bg-[#153F1E] px-5 pt-2 pb-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative shrink-0 flex items-center">
                <MyDropi mood="cheer" size={56} />
                <span className="absolute -bottom-0.5 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#58CC02] text-white border-2 border-[#D7FFB8] dark:border-[#153F1E] shadow-sm">
                  <Check className="h-3.5 w-3.5 stroke-[3.2]" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl font-extrabold text-[#2E7D00] dark:text-[#A4F96C] leading-tight">
                  {title}
                </h3>
                <p className="text-sm font-bold text-[#3A8E00] dark:text-[#86E64D] tabular-nums">
                  {(() => {
                    const dType = getLogDrinkType(feedback.log);
                    const rawMl = getLogRawAmountMl(feedback.log);
                    const effMl = getLogEffectiveMl(feedback.log);
                    const opt = getDrinkTypeOption(dType);
                    if (dType === 'water') {
                      return `+${effMl} ml tercatat · +${feedback.xpEarned} XP`;
                    }
                    return `+${rawMl} ml ${opt.shortLabel} (${effMl} ml efektif) · +${feedback.xpEarned} XP`;
                  })()}
                  {feedback.justHitGoal
                    ? ` · Target tercapai!${feedback.goalBonusDrops > 0 ? ` (+${feedback.goalBonusDrops} Koin)` : ''}`
                    : ''}
                </p>
              </div>
            </div>

            <Button3D variant="mint" fullWidth size="lg" onClick={onContinue}>
              LANJUT
            </Button3D>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
