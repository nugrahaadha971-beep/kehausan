import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export interface AnimatedNumberProps {
  value: number;
  durationMs?: number;
  formatter?: (val: number) => string;
  className?: string;
}

const defaultFormatter = (val: number) => Math.round(val).toLocaleString('id-ID');

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  durationMs = 560,
  formatter = defaultFormatter,
  className = '',
}) => {
  const reduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = value;
    prevValueRef.current = value;

    if (reduceMotion || startVal === endVal || durationMs <= 0) {
      setDisplayValue(endVal);
      return;
    }

    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayValue(Math.round(startVal + (endVal - startVal) * eased));
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs, reduceMotion]);

  return (
    <span
      className={`tabular-nums ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {formatter(displayValue)}
    </span>
  );
};
