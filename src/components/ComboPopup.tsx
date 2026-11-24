import React, { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface ComboPopupProps {
  comboCount: number;
  triggerKey: string | null;
}

const COMBO_WORDS = ['KEREN!', 'SEGAR!', 'PERFECT!'];

export const ComboPopup: React.FC<ComboPopupProps> = ({
  comboCount,
  triggerKey,
}) => {
  const reduceMotion = useReducedMotion();

  const label = useMemo(() => {
    if (comboCount >= 3) {
      const extra = COMBO_WORDS[(comboCount - 3) % COMBO_WORDS.length];
      return `COMBO x${comboCount}! ${extra}`;
    }
    return '';
  }, [comboCount]);

  const visible = Boolean(triggerKey && comboCount >= 3);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Flash kuning transparan bergaya petir selama 400ms berbasis CSS */}
          {!reduceMotion && (
            <motion.div
              key={`flash-${triggerKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, times: [0, 0.25, 1] }}
              className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-[#FFC800]/25"
              aria-hidden="true"
            >
              <div
                className="w-64 h-64 bg-[#FFC800]/70"
                style={{
                  clipPath:
                    'polygon(55% 2%, 28% 49%, 48% 49%, 39% 98%, 74% 43%, 52% 43%)',
                }}
              />
            </motion.div>
          )}

          {/* Popup teks miring tebal oranye dengan outline putih */}
          <motion.div
            key={triggerKey}
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { scale: 0.45, opacity: 0, rotate: -10 }
            }
            animate={
              reduceMotion
                ? { opacity: [0, 1, 0] }
                : {
                    scale: [0.45, 1.18, 1, 0.9],
                    opacity: [0, 1, 1, 0],
                    rotate: [-10, -4, -6, -4],
                  }
            }
            exit={{ opacity: 0 }}
            transition={{ duration: 1.15, times: [0, 0.22, 0.72, 1] }}
            className="pointer-events-none fixed inset-x-0 top-1/3 z-40 flex items-center justify-center px-4 text-center"
            aria-live="polite"
          >
            <span
              className="font-display text-3xl sm:text-4xl font-extrabold italic tracking-tight text-[#FF9600]"
              style={{
                WebkitTextStroke: '5px #FFFFFF',
                paintOrder: 'stroke fill',
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.16))',
              }}
            >
              {label}
            </span>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
