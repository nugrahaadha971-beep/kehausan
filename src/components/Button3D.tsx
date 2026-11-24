import React from 'react';
import { soundEngine } from '../lib/sound';
import { useTetes } from '../state/TetesContext';

type ButtonVariant = 'water' | 'mint' | 'sun' | 'berry' | 'coral' | 'white' | 'ghost';

interface Button3DProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  silent?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  water:
    'bg-[#1CB0F6] border-b-4 border-[#1899D6] text-white hover:bg-[#23B8FF] active:border-b-0 active:translate-y-[4px]',
  mint:
    'bg-[#58CC02] border-b-4 border-[#46A302] text-white hover:bg-[#61DA06] active:border-b-0 active:translate-y-[4px]',
  sun:
    'bg-[#FFC800] border-b-4 border-[#E0A800] text-[#3C3C3C] hover:bg-[#FFD224] active:border-b-0 active:translate-y-[4px]',
  berry:
    'bg-[#CE82FF] border-b-4 border-[#A955E0] text-white hover:bg-[#D796FF] active:border-b-0 active:translate-y-[4px]',
  coral:
    'bg-[#FF4B4B] border-b-4 border-[#D93535] text-white hover:bg-[#FF5E5E] active:border-b-0 active:translate-y-[4px]',
  white:
    'bg-white dark:bg-slate-800 border-2 border-[#E5E5E5] dark:border-slate-700 border-b-4 border-b-[#D5D5D5] dark:border-b-slate-900 text-[#1CB0F6] dark:text-[#4CC5FF] hover:bg-slate-50 dark:hover:bg-slate-750 active:border-b-2 active:translate-y-[2px]',
  ghost:
    'bg-transparent text-[#777777] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98]',
};

const SIZE_CLASSES = {
  sm: 'min-h-[44px] px-4 py-2 text-sm',
  md: 'min-h-[48px] px-5 py-3 text-base',
  lg: 'min-h-[54px] px-6 py-3.5 text-lg',
};

export const Button3D: React.FC<Button3DProps> = ({
  variant = 'water',
  fullWidth = false,
  size = 'md',
  silent = false,
  disabled,
  className = '',
  onClick,
  children,
  ...rest
}) => {
  const { data } = useTetes();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !silent) {
      soundEngine.play('click', data.settings.sound);
    }
    onClick?.(e);
  };

  return (
    <button
      type={rest.type || 'button'}
      disabled={disabled}
      onClick={handleClick}
      className={[
        'relative inline-flex items-center justify-center gap-2 rounded-[16px] font-extrabold tracking-wide whitespace-nowrap select-none transition-all duration-100 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1CB0F6]/40',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
};
