import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';
import { TetesProvider, useTetes } from './state/TetesContext';
import { Splash } from './screens/Splash';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { Stats } from './screens/Stats';
import { Achievements } from './screens/Achievements';
import { Profile } from './screens/Profile';
import { Celebration } from './screens/Celebration';
import { StreakScreen } from './screens/StreakScreen';
import { BottomNav } from './components/BottomNav';
import { MyDropi } from './components/MyDropi';
import { Burst } from './components/Burst';
import { Button3D } from './components/Button3D';

const LevelUpModal: React.FC = () => {
  const { pendingLevelUp, dismissLevelUp } = useTetes();
  const reduceMotion = useReducedMotion();
  const [burstTrigger, setBurstTrigger] = useState(0);

  useEffect(() => {
    if (pendingLevelUp) {
      setBurstTrigger((c) => c + 1);
    }
  }, [pendingLevelUp]);

  return (
    <>
      <Burst trigger={burstTrigger} />
      <AnimatePresence>
        {pendingLevelUp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { scale: 0.78, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-full max-w-sm rounded-[24px] border-2 border-[#FFE47A] bg-white dark:bg-slate-900 p-6 text-center shadow-2xl"
              role="dialog"
              aria-label={`Naik ke Level ${pendingLevelUp}`}
            >
              <MyDropi mood="wow" size={120} />
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#FFF9DC] dark:bg-yellow-950 px-3 py-1 text-xs font-extrabold text-[#B88600] dark:text-[#FFD633]">
                <Star className="w-3.5 h-3.5 fill-[#FFC800] text-[#FFC800]" />
                Naik Level!
              </div>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-[#3C3C3C] dark:text-white">
                Level {pendingLevelUp}
              </h2>
              <p className="mt-1 text-sm font-bold text-[#777777] dark:text-slate-300">
                Keren! Cek halaman Profil untuk melihat hadiah baru yang terbuka.
              </p>
              <div className="mt-5">
                <Button3D variant="sun" fullWidth size="md" onClick={dismissLevelUp}>
                  Lanjutkan
                </Button3D>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const TetesShell: React.FC = () => {
  const { data, screen, setScreen, activeTab, setActiveTab } = useTetes();
  const reduceMotion = useReducedMotion();

  const handleSplashDone = () => {
    setScreen(data.profile.onboarded ? 'app' : 'onboarding');
  };

  return (
    <div className="min-h-dvh w-full flex justify-center bg-[#E8F4FB] dark:bg-[#090F1C]">
      <main className="relative min-h-dvh w-full max-w-[430px] bg-white dark:bg-slate-900 shadow-[0_0_40px_rgba(28,176,246,0.12)] dark:shadow-black/50 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {screen === 'splash' && (
            <Splash key="splash" onDone={handleSplashDone} />
          )}

          {screen === 'onboarding' && (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Onboarding />
            </motion.div>
          )}

          {screen === 'celebration' && (
            <motion.div
              key="celebration"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Celebration />
            </motion.div>
          )}

          {screen === 'streak' && (
            <motion.div
              key="streak"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <StreakScreen />
            </motion.div>
          )}

          {screen === 'app' && (
            <motion.div
              key="app"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="min-h-dvh"
            >
              {activeTab === 'home' && <Home />}
              {activeTab === 'stats' && <Stats />}
              {activeTab === 'achievements' && <Achievements />}
              {activeTab === 'profile' && <Profile />}
              <BottomNav activeTab={activeTab} onSelect={setActiveTab} />
            </motion.div>
          )}
        </AnimatePresence>

        <LevelUpModal />
      </main>
    </div>
  );
};

export default function App() {
  return (
    <TetesProvider>
      <TetesShell />
    </TetesProvider>
  );
}
