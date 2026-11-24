import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { getSessionHydrationQuote } from '../lib/hydrationQuotes';

export const HydrationQuoteCard: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const quote = useMemo(() => getSessionHydrationQuote(), []);

  return (
    <motion.section
      aria-labelledby="quote-heading"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="px-4 mt-5"
    >
      <div className="rounded-[20px] border-2 border-[#BCE8FF] dark:border-sky-800/70 bg-gradient-to-br from-[#F2FAFF] to-[#E6F6FF] dark:from-slate-800 dark:to-slate-800/80 p-4 ring-1 ring-inset ring-white/50 dark:ring-white/10 shadow-[0_12px_28px_-12px_rgba(28,176,246,0.24)] dark:shadow-[0_12px_28px_-12px_rgba(2,6,23,0.55)]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1CB0F6] text-white shadow-xs">
              <Quote className="w-3.5 h-3.5 fill-white/25" />
            </span>
            <h2
              id="quote-heading"
              className="font-display text-sm sm:text-base font-extrabold text-[#1899D6] dark:text-[#4CC5FF] truncate"
            >
              Kata Mutiara Hidrasi
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-white/85 dark:bg-slate-700/80 border border-[#BCE8FF] dark:border-slate-600 px-2.5 py-0.5 text-[11px] font-extrabold text-[#1899D6] dark:text-[#7CE0FF]">
            {quote.topic}
          </span>
        </div>

        <p className="text-sm font-bold leading-relaxed text-[#3C3C3C] dark:text-slate-100">
          “{quote.text}”
        </p>
      </div>
    </motion.section>
  );
};
