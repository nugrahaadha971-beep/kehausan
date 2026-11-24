import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface SpeechBubbleProps {
  text: string;
  tailSide?: 'left' | 'bottom' | 'top';
  className?: string;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  text,
  tailSide = 'left',
  className = '',
}) => {
  const reduceMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState(text);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayed(text);
      return;
    }
    setDisplayed('');
    let idx = 0;
    const interval = window.setInterval(() => {
      idx++;
      setDisplayed(text.slice(0, idx));
      if (idx >= text.length) {
        window.clearInterval(interval);
      }
    }, 20);
    return () => window.clearInterval(interval);
  }, [text, reduceMotion]);

  return (
    <div
      aria-live="polite"
      className={`relative rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-bold leading-snug text-[#3C3C3C] dark:text-slate-100 shadow-sm ${className}`}
    >
      <p className="line-clamp-2 min-h-[1.25rem]">{displayed}</p>

      {tailSide === 'left' && (
        <span
          aria-hidden="true"
          className="absolute -left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 rotate-45 border-b-2 border-l-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800"
        />
      )}
      {tailSide === 'bottom' && (
        <span
          aria-hidden="true"
          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 h-4 w-4 rotate-45 border-b-2 border-r-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800"
        />
      )}
      {tailSide === 'top' && (
        <span
          aria-hidden="true"
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-4 w-4 rotate-45 border-t-2 border-l-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800"
        />
      )}
    </div>
  );
};
