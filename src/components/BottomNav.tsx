import React from 'react';
import { Award, BarChart3, Droplets, User } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { TabId } from '../lib/types';
import { soundEngine } from '../lib/sound';
import { useTetes } from '../state/TetesContext';

interface BottomNavProps {
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
}

const NAV_ITEMS: { id: TabId; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Beranda', Icon: Droplets },
  { id: 'stats', label: 'Statistik', Icon: BarChart3 },
  { id: 'achievements', label: 'Pencapaian', Icon: Award },
  { id: 'profile', label: 'Profil', Icon: User },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelect }) => {
  const reduceMotion = useReducedMotion();
  const { data } = useTetes();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 border-t-2 border-[#E5E5E5] dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4 h-16 px-2">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (activeTab !== id) {
                  soundEngine.play('click', data.settings.sound);
                  onSelect(id);
                }
              }}
              aria-current={active ? 'page' : undefined}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1CB0F6] ${
                active
                  ? 'text-[#1CB0F6] dark:text-[#4CC5FF]'
                  : 'text-[#777777] dark:text-slate-400 hover:text-[#3C3C3C] dark:hover:text-slate-200'
              }`}
            >
              <motion.div
                animate={
                  active && !reduceMotion
                    ? { scale: 1.15, rotate: [0, -8, 6, 0] }
                    : { scale: 1, rotate: 0 }
                }
                transition={{ duration: 0.35 }}
              >
                <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
              </motion.div>
              <span className="text-[11px] font-extrabold tracking-tight whitespace-nowrap">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
