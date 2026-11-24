import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2,
  Coffee,
  Coins,
  CupSoda,
  Droplet,
  Flame,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { DropiMood, getDropiTheme } from '../components/DropiMascot';
import { MyDropi } from '../components/MyDropi';
import { SpeechBubble } from '../components/SpeechBubble';
import { getWaterWavePalette, WaterWave } from '../components/WaterWave';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Burst } from '../components/Burst';
import { Button3D } from '../components/Button3D';
import { ProgressBar } from '../components/ProgressBar';
import { FeedbackSheet } from '../components/FeedbackSheet';
import { ComboPopup } from '../components/ComboPopup';
import { HydrationQuoteCard } from '../components/HydrationQuoteCard';
import { OfflineBanner } from '../components/PWAInstallButton';
import { useTetes } from '../state/TetesContext';
import { DrinkType, WaterLog } from '../lib/types';
import {
  calculateEffectiveMl,
  DRINK_TYPE_OPTIONS,
  formatTimeShort,
  getAffordableShopItems,
  getDrinkReactionMessage,
  getDrinkTypeOption,
  getLogDrinkType,
  getLogEffectiveMl,
  getLogRawAmountMl,
} from '../lib/hydration';
import { parseTimeToMinutes } from '../lib/storage';
import { DAILY_QUEST_DEFS } from '../lib/quests';
import { getDropiMood } from '../lib/dropiMood';
import { soundEngine, triggerLightTap } from '../lib/sound';

const QUICK_AMOUNTS = [100, 250, 500];

const renderDrinkIcon = (type: DrinkType, className = 'w-4 h-4') => {
  switch (type) {
    case 'electrolyte':
      return <Zap className={className} />;
    case 'coffee_tea':
      return <Coffee className={className} />;
    case 'sweet':
      return <CupSoda className={className} />;
    default:
      return <Droplet className={className} />;
  }
};

export const Home: React.FC = () => {
  const {
    data,
    todayLogs,
    todayTotalMl,
    dailyTargetMl,
    dailyBoosters,
    todayPercent,
    minutesSinceLastDrink,
    reminderDue,
    lastDrinkFeedback,
    clearDrinkFeedback,
    streakFreezeNotice,
    dismissStreakFreezeNotice,
    isWindDown,
    checkDrinkPace,
    logWater,
    deleteLog,
    restoreLog,
    claimQuest,
    toggleDailyBooster,
    setScreen,
    setActiveTab,
  } = useTetes();

  const reduceMotion = useReducedMotion();

  const [selectedDrinkType, setSelectedDrinkType] = useState<DrinkType>('water');
  const [nonWaterReaction, setNonWaterReaction] = useState<string | null>(null);
  const [pacingReminder, setPacingReminder] = useState<string | null>(null);
  const reactionTimerRef = useRef<number | null>(null);
  const pacingTimerRef = useRef<number | null>(null);

  const [windDownWarning, setWindDownWarning] = useState<{
    ml: number;
    drinkType: DrinkType;
  } | null>(null);
  const [rapidIntakeWarning, setRapidIntakeWarning] = useState<{
    ml: number;
    drinkType: DrinkType;
    recentTotalMl: number;
    suggestedWaitMinutes: number;
  } | null>(null);

  const [justDrank, setJustDrank] = useState(false);

  const [floatingMl, setFloatingMl] = useState<{ id: string; ml: number } | null>(null);
  const [flyingXpKey, setFlyingXpKey] = useState<string | null>(null);
  const [comboTrigger, setComboTrigger] = useState<{ count: number; key: string } | null>(null);
  const [burstTrigger, setBurstTrigger] = useState(0);
  const [showSheet, setShowSheet] = useState(false);

  // Bottom sheet input ml kustom (slider + ketik manual presisi)
  const [showCustomSheet, setShowCustomSheet] = useState(false);
  const [customMl, setCustomMl] = useState(300);
  const [customMlInput, setCustomMlInput] = useState('300');
  const [modalDrinkType, setModalDrinkType] = useState<DrinkType>('water');
  const manualMlInputRef = useRef<HTMLInputElement | null>(null);

  // Pengingat item toko Dropi yang sudah mampu dibeli dengan Koin Tetes
  const affordableShopItems = useMemo(
    () =>
      getAffordableShopItems({
        drops: data.drops,
        unlockedColors: data.unlockedColors,
        unlockedAccessories: data.unlockedAccessories,
        streakFreezes: data.streakFreezes,
      }),
    [data.drops, data.unlockedColors, data.unlockedAccessories, data.streakFreezes]
  );

  const affordableShopKey = useMemo(
    () =>
      affordableShopItems.length > 0
        ? `${data.drops}:${affordableShopItems.map((i) => i.id).join(',')}`
        : '',
    [data.drops, affordableShopItems]
  );

  const [dismissedShopKey, setDismissedShopKey] = useState<string>('');
  const showShopReminderBanner =
    affordableShopItems.length > 0 && dismissedShopKey !== affordableShopKey;

  useEffect(() => {
    if (!affordableShopKey || !data.settings.notifications) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }
    try {
      const storageKey = 'tetes:lastShopNotifKey';
      if (window.localStorage.getItem(storageKey) === affordableShopKey) return;
      const firstItem = affordableShopItems[0];
      new Notification('Koin Tetes Cukup untuk Belanja!', {
        body: `Kamu punya ${data.drops} Koin Tetes — cukup untuk membuka ${firstItem.label} di Toko Dropi!`,
        icon: './pwa-192x192.png',
      });
      window.localStorage.setItem(storageKey, affordableShopKey);
    } catch {
      // Abaikan jika browser membatasi Notification atau storage
    }
  }, [affordableShopKey, affordableShopItems, data.drops, data.settings.notifications]);

  // Hapus & Urungkan (4 detik)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [undoLog, setUndoLog] = useState<WaterLog | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  const timersRef = useRef<number[]>([]);
  const justDrankTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      if (justDrankTimerRef.current) window.clearTimeout(justDrankTimerRef.current);
      if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
      if (pacingTimerRef.current) window.clearTimeout(pacingTimerRef.current);
    };
  }, []);

  const commitDrink = (
    ml: number,
    drinkType: DrinkType = selectedDrinkType
  ) => {
    setWindDownWarning(null);
    setRapidIntakeWarning(null);
    setPacingReminder(null);

    const feedback = logWater(ml, drinkType);
    const effMl = getLogEffectiveMl(feedback.log);
    const rawMl = getLogRawAmountMl(feedback.log);
    const reaction = getDrinkReactionMessage(drinkType, rawMl, effMl);

    if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
    if (reaction) {
      setNonWaterReaction(reaction);
      reactionTimerRef.current = window.setTimeout(() => {
        setNonWaterReaction(null);
      }, 10000);
    } else {
      setNonWaterReaction(null);
    }

    setJustDrank(true);
    if (justDrankTimerRef.current) window.clearTimeout(justDrankTimerRef.current);
    justDrankTimerRef.current = window.setTimeout(() => {
      setJustDrank(false);
    }, 1600);

    setFloatingMl({ id: feedback.log.id, ml: effMl });
    setFlyingXpKey(feedback.log.id);
    setShowSheet(false);

    if (feedback.comboCount >= 3) {
      setComboTrigger({ count: feedback.comboCount, key: feedback.log.id });
    }

    if (feedback.justHitGoal) {
      setBurstTrigger((c) => c + 1);
      const tBurst = window.setTimeout(() => {
        setBurstTrigger((c) => c + 1);
      }, 250);
      timersRef.current.push(tBurst);
    }

    const t1 = window.setTimeout(() => {
      setShowSheet(true);
    }, reduceMotion ? 120 : 520);

    const t2 = window.setTimeout(() => {
      setFloatingMl(null);
      setFlyingXpKey(null);
    }, 1200);

    const t3 = window.setTimeout(() => {
      setComboTrigger(null);
    }, 1350);

    timersRef.current.push(t1, t2, t3);
  };

  const evaluateRapidIntakeThenCommit = (
    ml: number,
    drinkType: DrinkType = selectedDrinkType
  ) => {
    const pace = checkDrinkPace(ml);
    if (pace.isTooFast) {
      soundEngine.play('pop', data.settings.sound);
      setRapidIntakeWarning({
        ml,
        drinkType,
        recentTotalMl: pace.recentTotalMl,
        suggestedWaitMinutes: pace.suggestedWaitMinutes,
      });
      return;
    }
    commitDrink(ml, drinkType);
  };

  const handleDrink = (
    ml: number,
    drinkType: DrinkType = selectedDrinkType
  ) => {
    if (isWindDown && ml >= 300) {
      soundEngine.play('click', data.settings.sound);
      setWindDownWarning({ ml, drinkType });
      return;
    }
    evaluateRapidIntakeThenCommit(ml, drinkType);
  };

  const handleContinueFeedback = () => {
    const hitGoal = lastDrinkFeedback?.justHitGoal;
    setShowSheet(false);
    clearDrinkFeedback();
    if (hitGoal) {
      soundEngine.play('tada', data.settings.sound);
      setScreen('celebration');
    } else if (lastDrinkFeedback?.leveledUpTo) {
      soundEngine.play('ding', data.settings.sound);
    }
  };

  const handleDeleteLog = (id: string) => {
    const removed = deleteLog(id);
    setConfirmDeleteId(null);
    if (!removed) return;

    setUndoLog(removed);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => {
      setUndoLog(null);
    }, 4000);
  };

  const handleUndoDelete = () => {
    if (!undoLog) return;
    restoreLog(undoLog);
    setUndoLog(null);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
  };

  const waterLevel =
    dailyTargetMl > 0
      ? Math.min(1, todayTotalMl / dailyTargetMl)
      : 0;

  const selectedDrinkOption = useMemo(
    () => getDrinkTypeOption(selectedDrinkType),
    [selectedDrinkType]
  );

  const mainQuickMl = isWindDown ? 150 : data.profile.cupMl;

  const mainCupEffectiveMl = useMemo(
    () => calculateEffectiveMl(mainQuickMl, selectedDrinkType),
    [mainQuickMl, selectedDrinkType]
  );

  const dropiTheme = useMemo(
    () => getDropiTheme(data.profile.dropiColor),
    [data.profile.dropiColor]
  );

  const dropiMood: DropiMood = useMemo(() => {
    if (justDrank) return 'drinking';
    if (waterLevel >= 1) return 'celebrate';
    if (isWindDown) return 'sleepy';

    const now = new Date();
    const wakeMin = parseTimeToMinutes(data.profile.wakeTime);
    const sleepMin = parseTimeToMinutes(data.profile.sleepTime);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const minsSinceWake = nowMin >= wakeMin ? nowMin - wakeMin : 0;

    return getDropiMood({
      progress: waterLevel,
      hour: now.getHours(),
      wakeHour: Math.floor(wakeMin / 60),
      sleepHour: Math.floor(sleepMin / 60),
      minutesSinceLastDrink:
        minutesSinceLastDrink !== null ? minutesSinceLastDrink : minsSinceWake,
      justDrank,
    });
  }, [
    waterLevel,
    isWindDown,
    data.profile.wakeTime,
    data.profile.sleepTime,
    minutesSinceLastDrink,
    justDrank,
  ]);

  const dropiSpeech = useMemo(() => {
    if (pacingReminder) {
      return pacingReminder;
    }
    if (nonWaterReaction) {
      return nonWaterReaction;
    }
    if (isWindDown && dropiMood === 'sleepy') {
      return 'Sudah mendekati jam tidur! Cukup teguk sedikit saja (100–150 ml) agar tidurmu nyenyak dan tidak terbangun untuk ke kamar mandi.';
    }
    switch (dropiMood) {
      case 'drinking':
        return 'Glek glek... segarnya luar biasa!';
      case 'celebrate':
        return 'Target hari ini tercapai! Kamu hebat banget!';
      case 'sleepy':
        return 'Sudah masuk jam istirahat. Sampai jumpa besok pagi!';
      case 'sad':
        return data.progress.streak > 0
          ? `Streak ${data.progress.streak} harimu hampir putus! Yuk penuhi targetnya.`
          : 'Sebentar lagi waktu tidur, yuk tambah sedikit minum dulu!';
      case 'thirsty':
        return 'Tenggorokanku kering nih... Temani minum yuk!';
      case 'wow':
        return 'Sedikit lagi 100%! Ayo tuntaskan hari ini!';
      case 'cheer':
        return 'Setengah jalan! Keren banget, lanjutkan!';
      default:
        return new Date().getHours() < 11 && todayLogs.length === 0
          ? 'Pagi! Yuk mulai harimu dengan segelas air.'
          : 'Satu teguk lagi biar fokus dan energimu tetap penuh!';
    }
  }, [
    pacingReminder,
    nonWaterReaction,
    isWindDown,
    dropiMood,
    data.progress.streak,
    todayLogs.length,
  ]);

  const boosterBonusMl = dailyTargetMl - data.profile.goalMl;

  const lastDrinkType: DrinkType = useMemo(
    () => (todayLogs.length > 0 ? getLogDrinkType(todayLogs[0]) : 'water'),
    [todayLogs]
  );

  const wavePalette = useMemo(
    () => getWaterWavePalette(lastDrinkType),
    [lastDrinkType]
  );

  return (
    <div className="pb-24">
      {/* Header sapaan + Streak + Pelindung + Koin Tetes + XP */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl px-3 sm:px-4 py-2.5 border-b border-[#CBEBFF]/70 dark:border-slate-800 ring-1 ring-inset ring-white/50 dark:ring-white/10 shadow-[0_8px_24px_-12px_rgba(14,165,233,0.18)] dark:shadow-[0_8px_24px_-12px_rgba(2,6,23,0.65)]">
        <div className="min-w-0">
          <h1 className="font-display text-base sm:text-lg font-extrabold text-[#3C3C3C] dark:text-white truncate">
            Halo, {data.profile.name || 'Teman'}!
          </h1>
          <p className="text-[11px] font-bold text-[#777777] dark:text-slate-400 truncate tabular-nums">
            Lv {data.progress.level} · Target {dailyTargetMl.toLocaleString('id-ID')} ml
            {boosterBonusMl > 0 ? ` (+${boosterBonusMl})` : ''}
          </p>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Chip Streak */}
          <button
            type="button"
            onClick={() => {
              soundEngine.play('click', data.settings.sound);
              setScreen('streak');
            }}
            aria-label={`Streak ${data.progress.streak} hari`}
            className="min-h-[34px] inline-flex items-center gap-1 rounded-full bg-[#FFF3DF] dark:bg-amber-950/60 border border-[#FFD18A] dark:border-amber-700/60 px-2 py-1 text-xs font-extrabold text-[#E07600] dark:text-[#FFAC33] cursor-pointer active:scale-95 transition-transform"
          >
            <Flame className="w-3.5 h-3.5 fill-[#FF9600] text-[#FF9600]" />
            <span className="tabular-nums">{data.progress.streak}</span>
          </button>

          {/* Chip Pelindung Streak */}
          <button
            type="button"
            onClick={() => {
              soundEngine.play('click', data.settings.sound);
              setScreen('streak');
            }}
            title={`${data.streakFreezes} Pelindung Streak`}
            aria-label={`${data.streakFreezes} Pelindung Streak`}
            className="min-h-[34px] inline-flex items-center gap-1 rounded-full bg-[#E8F7FF] dark:bg-sky-950/60 border border-[#9BE0FF] dark:border-sky-700/60 px-2 py-1 text-xs font-extrabold text-[#0B82BA] dark:text-[#7CE0FF] cursor-pointer active:scale-95 transition-transform"
          >
            <Shield className="w-3.5 h-3.5 fill-[#1CB0F6]/25 text-[#1CB0F6]" />
            <span className="tabular-nums">{data.streakFreezes}</span>
          </button>

          {/* Chip Saldo Koin Tetes (Menonjol & interaktif ke Toko Dropi) */}
          <button
            type="button"
            onClick={() => {
              soundEngine.play('click', data.settings.sound);
              setActiveTab('profile');
            }}
            title={`Saldo ${data.drops} Koin Tetes — ketuk untuk buka Toko Dropi`}
            aria-label={`Saldo ${data.drops} Koin Tetes`}
            className="relative min-h-[36px] inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#14B8A6] to-[#0D9488] border-2 border-[#0F766E] px-2.5 py-1 text-xs font-extrabold text-white shadow-sm cursor-pointer active:scale-95 transition-transform"
          >
            <Coins className="w-4 h-4 text-[#FEF08A]" />
            <span className="tabular-nums">{data.drops.toLocaleString('id-ID')}</span>
            <span className="hidden xs:inline text-[10px] font-bold text-[#CCFBF1]">
              Koin
            </span>
            {affordableShopItems.length > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FFC800] ring-2 ring-white dark:ring-slate-900"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#9A3412]" />
              </span>
            )}
          </button>

          {/* Chip XP */}
          <div
            aria-label={`Total ${data.progress.xp} XP`}
            className="min-h-[34px] inline-flex items-center gap-1 rounded-full bg-[#FFF9DC] dark:bg-yellow-950/50 border border-[#FFE47A] dark:border-yellow-700/60 px-2 py-1 text-xs font-extrabold text-[#B88600] dark:text-[#FFD633]"
          >
            <Star className="w-3.5 h-3.5 fill-[#FFC800] text-[#FFC800]" />
            <span className="tabular-nums">{data.progress.xp}</span>
          </div>
        </div>
      </header>

      <OfflineBanner />

      {/* Pengingat Notifikasi Item Toko Dropi yang Mampu Dibeli */}
      <AnimatePresence>
        {showShopReminderBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="status"
            className="mx-4 mt-3 flex items-center justify-between gap-2.5 rounded-[18px] border-2 border-[#14B8A6] bg-[#F0FDFA] dark:bg-teal-950/50 px-3.5 py-2.5 shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#14B8A6] text-white">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-[#0F766E] dark:text-[#5EEAD4]">
                  Koin Tetes cukup untuk belanja!
                </div>
                <p className="text-[11px] font-bold text-[#115E59] dark:text-teal-200 leading-snug">
                  Saldo {data.drops.toLocaleString('id-ID')} koin bisa membuka{' '}
                  <strong>{affordableShopItems[0].label}</strong>
                  {affordableShopItems.length > 1
                    ? ` +${affordableShopItems.length - 1} item lainnya`
                    : ''}
                  .
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.play('click', data.settings.sound);
                  setActiveTab('profile');
                }}
                className="min-h-[34px] rounded-xl bg-[#14B8A6] px-2.5 py-1 text-[11px] font-extrabold text-white cursor-pointer active:scale-95 whitespace-nowrap"
              >
                Buka Toko
              </button>
              <button
                type="button"
                aria-label="Tutup pengingat toko"
                onClick={() => setDismissedShopKey(affordableShopKey)}
                className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-full text-[#0F766E] dark:text-[#5EEAD4] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Toast/Banner saat Pelindung Streak menyelamatkan streak */}
      <AnimatePresence>
        {streakFreezeNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="status"
            className="mx-4 mt-3 flex items-center justify-between gap-2.5 rounded-[18px] border-2 border-[#1CB0F6] bg-[#E8F7FF] dark:bg-[#0C2D48] px-3.5 py-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Shield className="w-5 h-5 shrink-0 text-[#1CB0F6] fill-[#1CB0F6]/20" />
              <div className="text-xs font-extrabold text-[#0B6A99] dark:text-[#7CE0FF]">
                Pelindung Streak menyelamatkan streak {streakFreezeNotice.savedStreak} harimu! Sisa {streakFreezeNotice.remainingFreezes} pelindung.
              </div>
            </div>
            <button
              type="button"
              aria-label="Tutup info Pelindung Streak"
              onClick={dismissStreakFreezeNotice}
              className="shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-full text-[#0B6A99] dark:text-[#7CE0FF] hover:bg-black/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pengingat dalam aplikasi saat interval terlewati */}
      <AnimatePresence>
        {reminderDue && !justDrank && !isWindDown && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-[18px] border-2 border-[#FFC800] bg-[#FFFBEB] dark:bg-amber-950/40 px-4 py-2.5"
          >
            <div className="text-xs font-extrabold text-[#8A6100] dark:text-[#FFD866]">
              Sudah agak lama belum minum nih! Yuk teguk sedikit biar tetap segar.
            </div>
            <button
              type="button"
              onClick={() => handleDrink(mainQuickMl)}
              className="shrink-0 min-h-[36px] rounded-full bg-[#FFC800] px-3 py-1 text-xs font-extrabold text-[#3C3C3C] cursor-pointer active:scale-95"
            >
              Minum
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Peringatan ramah saat mencatat volume besar (>= 300 ml) pada fase Wind-Down */}
      <AnimatePresence>
        {windDownWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="alertdialog"
            aria-label="Peringatan minum malam"
            className="mx-4 mt-3 rounded-[18px] border-2 border-[#A78BFA] dark:border-indigo-700 bg-[#F5F3FF] dark:bg-indigo-950/50 p-3.5 space-y-2.5"
          >
            <div className="flex items-start gap-2.5">
              <Moon className="w-5 h-5 shrink-0 text-[#7C3AED] dark:text-indigo-300 mt-0.5" />
              <p className="text-xs font-extrabold leading-relaxed text-[#4C1D95] dark:text-indigo-100">
                Minum terlalu banyak menjelang tidur bisa bikin terbangun untuk buang air kecil. Yakin mau minum sebanyak ini ({windDownWarning.ml} ml)?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setWindDownWarning(null)}
                className="min-h-[36px] rounded-xl border border-[#DDD6FE] dark:border-indigo-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-extrabold text-[#5B21B6] dark:text-indigo-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const pending = windDownWarning;
                  setWindDownWarning(null);
                  evaluateRapidIntakeThenCommit(pending.ml, pending.drinkType);
                }}
                className="min-h-[36px] rounded-xl bg-[#7C3AED] px-3.5 py-1 text-xs font-extrabold text-white cursor-pointer active:scale-95"
              >
                Lanjut Catat
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Area Hero: Maskot Dropi + Balon Ucapan + WaterWave Container */}
      <section className="relative px-3.5 sm:px-4 pt-4 pb-2 flex flex-col items-center">
        <div className="w-full flex items-center gap-2 mb-3">
          <div className="relative shrink-0 flex items-center justify-center">
            <span
              aria-hidden="true"
              style={{ backgroundColor: dropiTheme.ring }}
              className="absolute h-20 w-20 rounded-full transition-colors duration-300"
            />
            <MyDropi mood={dropiMood} size={86} />
          </div>
          <div className="flex-1 min-w-0">
            <SpeechBubble text={dropiSpeech} tailSide="left" />
          </div>
        </div>

        {/* Wadah WaterWave berukuran pasti (relative, overflow-hidden, rounded) */}
        <div className="relative flex items-center justify-center my-1">
          <div
            role="img"
            aria-label={`Wadah air terisi ${todayPercent} persen, ${todayTotalMl} dari ${dailyTargetMl} mililiter`}
            className={`relative w-48 h-60 rounded-[36px] overflow-hidden border-4 transition-colors duration-500 ring-1 ring-inset ring-white/50 dark:ring-white/10 ${wavePalette.vesselClass} ${wavePalette.vesselShadow}`}
          >
            <WaterWave level={waterLevel} drinkType={lastDrinkType} />

            {/* Highlight kaca vertikal di sisi kiri */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-4 left-3.5 bottom-6 w-2 rounded-full bg-white/35"
            />

            {/* Highlight refleksi atas wadah */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-4 top-1.5 h-3 rounded-full bg-white/30 dark:bg-white/10 blur-[1px]"
            />

            {/* Angka progres di tengah */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3">
              <div className="rounded-[20px] bg-white/88 dark:bg-slate-900/85 backdrop-blur-md px-3.5 py-2 text-center border border-white/70 dark:border-slate-700/80 ring-1 ring-inset ring-white/50 dark:ring-white/10 shadow-[0_10px_24px_-8px_rgba(14,165,233,0.24)] dark:shadow-[0_10px_24px_-8px_rgba(2,6,23,0.65)]">
                <div className="font-display text-3xl font-extrabold leading-none text-[#1899D6] dark:text-[#4CC5FF] tabular-nums">
                  <AnimatedNumber value={todayPercent} durationMs={480} />%
                </div>
                <div className="mt-1 text-xs font-extrabold text-[#3C3C3C] dark:text-slate-100 tabular-nums">
                  <AnimatedNumber value={todayTotalMl} durationMs={560} /> /{' '}
                  {dailyTargetMl.toLocaleString('id-ID')} ml
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {floatingMl && !reduceMotion && (
              <motion.div
                key={`float-${floatingMl.id}`}
                initial={{ y: 20, opacity: 1, scale: 0.9 }}
                animate={{ y: -70, opacity: 0, scale: 1.12 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="pointer-events-none absolute top-10 font-display text-2xl font-extrabold text-[#1CB0F6] drop-shadow-sm tabular-nums"
              >
                +{floatingMl.ml} ml
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {flyingXpKey && !reduceMotion && (
              <motion.div
                key={`xp-${flyingXpKey}`}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.9 }}
                animate={{
                  x: 115,
                  y: -220,
                  opacity: [1, 1, 0],
                  scale: [1, 1.15, 0.7],
                }}
                transition={{ duration: 0.85, ease: 'easeInOut' }}
                className="pointer-events-none absolute top-6 inline-flex items-center gap-1 rounded-full bg-[#FFC800] px-2.5 py-1 text-xs font-extrabold text-[#3C3C3C] shadow-md z-30"
              >
                <Star className="w-3.5 h-3.5 fill-white text-white" />
                +10 XP
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chip pengubah target harian sementara */}
        <div
          className="w-full mt-2 flex flex-wrap items-center justify-center gap-2"
          role="group"
          aria-label="Penyesuaian target hidrasi hari ini"
        >
          <button
            type="button"
            aria-pressed={dailyBoosters.exercise}
            onClick={() => toggleDailyBooster('exercise')}
            className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-extrabold transition-all cursor-pointer active:scale-95 ${
              dailyBoosters.exercise
                ? 'border-[#58CC02] bg-[#E8FDD8] dark:bg-emerald-950/60 text-[#2E7D00] dark:text-[#86EFAC]'
                : 'border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#666666] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span>🏃 Olahraga (+500ml)</span>
          </button>

          <button
            type="button"
            aria-pressed={dailyBoosters.hotWeather}
            onClick={() => toggleDailyBooster('hotWeather')}
            className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-extrabold transition-all cursor-pointer active:scale-95 ${
              dailyBoosters.hotWeather
                ? 'border-[#FF9600] bg-[#FFF4E0] dark:bg-amber-950/60 text-[#B85D00] dark:text-[#FCD34D]'
                : 'border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#666666] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span>☀️ Cuaca Panas (+300ml)</span>
          </button>
        </div>

        {/* Selector Jenis Minuman ringkas */}
        <div
          className="w-full mt-3 grid grid-cols-4 gap-1.5 sm:gap-2"
          role="radiogroup"
          aria-label="Pilih jenis minuman"
        >
          {DRINK_TYPE_OPTIONS.map((opt) => {
            const active = selectedDrinkType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  triggerLightTap(data.settings.haptics);
                  soundEngine.play('click', data.settings.sound);
                  setSelectedDrinkType(opt.id);
                }}
                className={`min-h-[52px] flex flex-col items-center justify-center rounded-[14px] border-2 px-1 py-1.5 text-center transition-all cursor-pointer active:scale-95 ${
                  active
                    ? 'border-[#1CB0F6] bg-[#DDF4FF] dark:bg-[#0C2D48] text-[#1899D6] dark:text-[#7CE0FF]'
                    : 'border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#666666] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {renderDrinkIcon(opt.id, 'w-4 h-4 shrink-0')}
                <span className="mt-0.5 text-[11px] font-extrabold leading-tight truncate max-w-full">
                  {opt.shortLabel}
                </span>
                <span className="text-[10px] font-bold opacity-80 tabular-nums">
                  {opt.percentLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tombol aksi 3D utama */}
        <div className="w-full mt-2.5">
          <Button3D
            variant="water"
            fullWidth
            size="lg"
            silent
            onClick={() => handleDrink(mainQuickMl, selectedDrinkType)}
          >
            {isWindDown ? (
              <Moon className="w-5 h-5" />
            ) : (
              renderDrinkIcon(selectedDrinkType, 'w-5 h-5')
            )}
            <span>
              + {mainQuickMl} ml
              {isWindDown && selectedDrinkType === 'water'
                ? ' (Tegukan Malam)'
                : selectedDrinkType !== 'water'
                  ? ` ${selectedDrinkOption.shortLabel} (${mainCupEffectiveMl} ml)`
                  : ''}
            </span>
          </Button3D>
        </div>

        {/* Baris chip cepat */}
        <div className="w-full mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                triggerLightTap(data.settings.haptics);
                handleDrink(amt, selectedDrinkType);
              }}
              className="min-h-[44px] rounded-[14px] border-2 border-[#E5E5E5] dark:border-slate-700 border-b-4 border-b-[#D5D5D5] dark:border-b-slate-800 bg-white dark:bg-slate-800 px-1 text-xs sm:text-sm font-extrabold text-[#1CB0F6] dark:text-[#4CC5FF] hover:bg-[#F2FAFF] dark:hover:bg-slate-700 active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer tabular-nums whitespace-nowrap"
            >
              +{amt}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              triggerLightTap(data.settings.haptics);
              soundEngine.play('click', data.settings.sound);
              setModalDrinkType(selectedDrinkType);
              setCustomMlInput(String(customMl));
              setShowCustomSheet(true);
            }}
            className="min-h-[44px] inline-flex items-center justify-center gap-0.5 sm:gap-1 rounded-[14px] border-2 border-[#E5E5E5] dark:border-slate-700 border-b-4 border-b-[#D5D5D5] dark:border-b-slate-800 bg-white dark:bg-slate-800 px-1 text-xs sm:text-sm font-extrabold text-[#777777] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            Lainnya
          </button>
        </div>
      </section>

      {/* Kata Mutiara Hidrasi */}
      <HydrationQuoteCard />

      {/* Kartu Misi Harian (Quests) */}
      <section className="px-4 mt-5" aria-labelledby="quests-heading">
        <div className="flex items-center justify-between mb-2.5">
          <h2
            id="quests-heading"
            className="font-display text-lg font-extrabold text-[#3C3C3C] dark:text-white"
          >
            Misi Hari Ini
          </h2>
          <span className="text-xs font-bold text-[#777777] dark:text-slate-400">
            Hadiah Koin, XP & Pelindung
          </span>
        </div>

        <div className="space-y-2.5">
          {DAILY_QUEST_DEFS.map((def) => {
            const item = data.quests.items.find((i) => i.id === def.id) || {
              id: def.id,
              progress: 0,
              claimed: false,
            };
            const pct = Math.min(100, Math.round((item.progress / def.target) * 100));
            const done = item.progress >= def.target;

            return (
              <div
                key={def.id}
                className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 ring-1 ring-inset ring-white/50 dark:ring-white/10 shadow-[0_10px_24px_-12px_rgba(14,165,233,0.18)] dark:shadow-[0_10px_24px_-12px_rgba(2,6,23,0.55)]"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-sm font-extrabold text-[#3C3C3C] dark:text-slate-100">
                      {def.title}
                    </div>
                    <div className="text-xs font-bold text-[#777777] dark:text-slate-400 tabular-nums mt-0.5">
                      {item.progress} / {def.target} {def.unit} · +{def.rewardDrops} Koin · +{def.rewardXp} XP
                      {def.rewardFreeze ? ' + 1 Pelindung' : ''}
                    </div>
                  </div>

                  {item.claimed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#58CC02] shrink-0 py-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Diklaim
                    </span>
                  ) : done ? (
                    <button
                      type="button"
                      onClick={() => claimQuest(def.id)}
                      className="min-h-[36px] shrink-0 rounded-[12px] bg-[#FFC800] border-b-3 border-[#E0A800] px-3 py-1 text-xs font-extrabold text-[#3C3C3C] active:translate-y-[2px] cursor-pointer"
                    >
                      Klaim!
                    </button>
                  ) : (
                    <Sparkles className="w-4 h-4 text-[#FFC800] shrink-0 mt-0.5" />
                  )}
                </div>

                <ProgressBar
                  percent={pct}
                  color={done ? 'mint' : 'sun'}
                  heightClass="h-3"
                  shine={done && !item.claimed}
                  ariaLabel={def.title}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Daftar Catatan Hari Ini */}
      <section className="px-4 mt-6" aria-labelledby="logs-heading">
        <div className="flex items-center justify-between mb-2.5">
          <h2
            id="logs-heading"
            className="font-display text-lg font-extrabold text-[#3C3C3C] dark:text-white"
          >
            Catatan Hari Ini
          </h2>
          <span className="text-xs font-bold text-[#777777] dark:text-slate-400 tabular-nums">
            {todayLogs.length} catatan
          </span>
        </div>

        {todayLogs.length === 0 ? (
          <div className="flex items-center gap-3 rounded-[20px] border-2 border-dashed border-[#CBEBFF] dark:border-slate-700 bg-[#F7FAFC] dark:bg-slate-800/50 p-4 ring-1 ring-inset ring-white/50 dark:ring-white/10 shadow-[0_10px_24px_-12px_rgba(14,165,233,0.14)] dark:shadow-[0_10px_24px_-12px_rgba(2,6,23,0.45)]">
            <MyDropi mood="happy" size={58} />
            <p className="text-sm font-bold text-[#777777] dark:text-slate-300">
              Belum ada catatan hari ini. Ketuk tombol biru di atas saat kamu minum ya!
            </p>
          </div>
        ) : (
          <div className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-[#F0F0F0] dark:divide-slate-700 overflow-hidden ring-1 ring-inset ring-white/50 dark:ring-white/10 shadow-[0_12px_28px_-12px_rgba(14,165,233,0.18)] dark:shadow-[0_12px_28px_-12px_rgba(2,6,23,0.55)]">
            {todayLogs.map((log, index) => {
              const confirming = confirmDeleteId === log.id;
              const dType = getLogDrinkType(log);
              const rawMl = getLogRawAmountMl(log);
              const effMl = getLogEffectiveMl(log);
              const opt = getDrinkTypeOption(dType);
              return (
                <motion.div
                  key={log.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.2) }}
                  className="flex items-center justify-between px-4 py-3 min-h-[56px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DDF4FF] dark:bg-[#0C2D48] text-[#1CB0F6]">
                      {renderDrinkIcon(dType, 'w-4 h-4')}
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-[#3C3C3C] dark:text-white tabular-nums">
                        +{effMl} ml
                        {dType !== 'water' && (
                          <span className="ml-1.5 text-xs font-bold text-[#1CB0F6]">
                            efektif
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-[#777777] dark:text-slate-400 tabular-nums">
                        {dType !== 'water'
                          ? `${rawMl} ml ${opt.shortLabel} · Pukul ${formatTimeShort(log.ts)}`
                          : `Pukul ${formatTimeShort(log.ts)}`}
                      </div>
                    </div>
                  </div>

                  {confirming ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteLog(log.id)}
                        className="min-h-[36px] rounded-[10px] bg-[#FF4B4B] px-3 py-1 text-xs font-extrabold text-white cursor-pointer"
                      >
                        Hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[36px] rounded-[10px] bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-xs font-extrabold text-[#777777] dark:text-slate-200 cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(log.id)}
                      aria-label={`Hapus catatan ${effMl} ml pukul ${formatTimeShort(log.ts)}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-[#FF4B4B] hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Toast Urungkan hapus (4 detik) */}
      <AnimatePresence>
        {undoLog && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] max-w-[398px] flex items-center justify-between rounded-[16px] bg-[#3C3C3C] dark:bg-slate-700 text-white px-4 py-3 shadow-xl"
            role="status"
          >
            <span className="text-sm font-bold tabular-nums">
              Catatan +{getLogEffectiveMl(undoLog)} ml dihapus
            </span>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="inline-flex items-center gap-1 text-sm font-extrabold text-[#4CC5FF] cursor-pointer min-h-[36px] px-2"
            >
              <RotateCcw className="w-4 h-4" />
              Urungkan
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Sheet Input ml Kustom */}
      <AnimatePresence>
        {showCustomSheet && (() => {
          const parsedInput = parseInt(customMlInput, 10);
          const safeCustomMl =
            customMlInput !== '' && Number.isFinite(parsedInput)
              ? Math.max(1, Math.min(2000, parsedInput))
              : Math.max(1, Math.min(2000, customMl));
          const sliderValue = Math.min(1000, Math.max(50, safeCustomMl));
          const modalOpt = getDrinkTypeOption(modalDrinkType);
          const modalEffectiveMl = calculateEffectiveMl(safeCustomMl, modalDrinkType);

          return (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px]">
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
                animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="w-full max-w-[430px] max-h-[90dvh] overflow-y-auto rounded-t-[24px] bg-white dark:bg-slate-900 px-5 pt-3 pb-7 shadow-2xl border-t-2 border-[#E5E5E5] dark:border-slate-700"
                role="dialog"
                aria-label="Catat jumlah air kustom"
              >
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#E5E5E5] dark:bg-slate-700" />
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-xl font-extrabold text-[#3C3C3C] dark:text-white">
                    Jumlah Air Kustom
                  </h3>
                  <button
                    type="button"
                    aria-label="Tutup"
                    onClick={() => setShowCustomSheet(false)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-extrabold text-[#777777] dark:text-slate-400 mb-2">
                    Pilih Jenis Minuman
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {DRINK_TYPE_OPTIONS.map((opt) => {
                      const active = modalDrinkType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundEngine.play('click', data.settings.sound);
                            setModalDrinkType(opt.id);
                          }}
                          className={`min-h-[54px] flex flex-col items-center justify-center rounded-[14px] border-2 px-1 py-1.5 text-center transition-all cursor-pointer ${
                            active
                              ? 'border-[#1CB0F6] bg-[#DDF4FF] dark:bg-[#0C2D48] text-[#1899D6] dark:text-[#7CE0FF]'
                              : 'border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#666666] dark:text-slate-300'
                          }`}
                        >
                          {renderDrinkIcon(opt.id, 'w-4 h-4 shrink-0')}
                          <span className="mt-0.5 text-[11px] font-extrabold leading-tight truncate max-w-full">
                            {opt.shortLabel}
                          </span>
                          <span className="text-[10px] font-bold opacity-80 tabular-nums">
                            {opt.percentLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[20px] bg-[#F7FAFC] dark:bg-slate-800 p-4 text-center mb-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <input
                      ref={manualMlInputRef}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={2000}
                      step={1}
                      value={customMlInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setCustomMlInput('');
                          return;
                        }
                        const digits = raw.replace(/[^0-9]/g, '');
                        if (!digits) {
                          setCustomMlInput('');
                          return;
                        }
                        const parsed = parseInt(digits, 10);
                        const clamped = Math.max(1, Math.min(2000, parsed));
                        setCustomMl(clamped);
                        setCustomMlInput(String(clamped));
                      }}
                      onBlur={() => {
                        setCustomMl(safeCustomMl);
                        setCustomMlInput(String(safeCustomMl));
                      }}
                      aria-label="Masukkan jumlah mililiter manual"
                      className="w-28 rounded-xl border-2 border-[#D6ECFA] dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-0.5 text-center font-display text-4xl font-extrabold text-[#1CB0F6] dark:text-[#4CC5FF] tabular-nums focus:border-[#1CB0F6] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="font-display text-2xl font-extrabold text-[#1CB0F6] dark:text-[#4CC5FF]">
                      ml
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.play('click', data.settings.sound);
                        manualMlInputRef.current?.focus();
                        manualMlInputRef.current?.select();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBEBFF] dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1 text-[11px] font-extrabold text-[#0284C7] dark:text-[#7CE0FF] hover:bg-[#EEF8FF] dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      Ketik Manual (1–2.000 ml)
                    </button>
                  </div>

                  {modalDrinkType !== 'water' && (
                    <div className="mt-2 text-xs font-extrabold text-[#777777] dark:text-slate-300 tabular-nums">
                      {modalOpt.label} →{' '}
                      <span className="text-[#1CB0F6] dark:text-[#4CC5FF]">
                        {modalEffectiveMl} ml efektif
                      </span>
                    </div>
                  )}

                  <input
                    type="range"
                    min={50}
                    max={1000}
                    step={25}
                    value={sliderValue}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomMl(val);
                      setCustomMlInput(String(val));
                    }}
                    aria-label="Geser jumlah mililiter"
                    className="mt-3 w-full accent-[#1CB0F6] cursor-pointer h-3"
                  />
                  <div className="mt-1 flex justify-between text-xs font-bold text-[#777777] dark:text-slate-400 tabular-nums">
                    <span>50 ml</span>
                    <span>500 ml</span>
                    <span>1.000 ml</span>
                  </div>
                </div>

                <Button3D
                  variant="water"
                  fullWidth
                  size="lg"
                  silent
                  onClick={() => {
                    setShowCustomSheet(false);
                    handleDrink(safeCustomMl, modalDrinkType);
                  }}
                >
                  Catat +{safeCustomMl} ml
                  {modalDrinkType !== 'water'
                    ? ` (${modalEffectiveMl} ml efektif)`
                    : ''}
                </Button3D>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Modal Peringatan Pacing / Terlalu Banyak Minum dalam Waktu Dekat (Fase 6) */}
      <AnimatePresence>
        {rapidIntakeWarning && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-[2px] p-0 sm:p-4">
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { y: 40, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              role="alertdialog"
              aria-labelledby="rapid-intake-title"
              aria-describedby="rapid-intake-desc"
              className="w-full max-w-[430px] rounded-t-[24px] sm:rounded-[24px] border-2 border-[#BCE8FF] dark:border-slate-700 bg-white dark:bg-slate-900 px-5 pt-4 pb-6 shadow-2xl"
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#E5E5E5] dark:bg-slate-700 sm:hidden" />

              <div className="flex flex-col items-center text-center">
                <MyDropi mood="wow" size={96} />

                <h3
                  id="rapid-intake-title"
                  className="mt-2 font-display text-xl font-extrabold text-[#3C3C3C] dark:text-white"
                >
                  Pelan-pelan teguknya! 💧
                </h3>

                <p
                  id="rapid-intake-desc"
                  className="mt-2 text-xs sm:text-sm font-bold leading-relaxed text-[#555555] dark:text-slate-300"
                >
                  Kamu sudah mencatat{' '}
                  <strong className="text-[#1CB0F6] dark:text-[#4CC5FF] tabular-nums">
                    {rapidIntakeWarning.recentTotalMl.toLocaleString('id-ID')} ml
                  </strong>{' '}
                  dalam 1 jam terakhir. Minum terlalu banyak sekaligus membuat ginjal cepat membuangnya lewat urine sehingga penyerapan cairan kurang optimal. Sebaiknya tunggu sekitar{' '}
                  <strong className="text-[#FF9600] dark:text-[#FBBF24] tabular-nums">
                    {rapidIntakeWarning.suggestedWaitMinutes} menit
                  </strong>{' '}
                  lagi.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <Button3D
                  variant="white"
                  fullWidth
                  size="md"
                  onClick={() => {
                    const waitMins = rapidIntakeWarning.suggestedWaitMinutes;
                    setRapidIntakeWarning(null);
                    setPacingReminder(
                      `Sip! Istirahatkan sejenak, tunggu sekitar ${waitMins} menit lagi agar penyerapan air makin optimal.`
                    );
                    if (pacingTimerRef.current) {
                      window.clearTimeout(pacingTimerRef.current);
                    }
                    pacingTimerRef.current = window.setTimeout(() => {
                      setPacingReminder(null);
                    }, 9000);
                  }}
                >
                  Tunggu Nanti
                </Button3D>

                <Button3D
                  variant="water"
                  fullWidth
                  size="md"
                  silent
                  onClick={() => {
                    const pending = rapidIntakeWarning;
                    commitDrink(pending.ml, pending.drinkType);
                  }}
                >
                  Tetap Catat
                </Button3D>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Burst trigger={burstTrigger} />

      {/* Combo Popup ("COMBO x3! KEREN!") */}
      <ComboPopup
        comboCount={comboTrigger?.count || 0}
        triggerKey={comboTrigger?.key || null}
      />

      {/* Feedback Sheet Duolingo-style */}
      <FeedbackSheet
        feedback={showSheet ? lastDrinkFeedback : null}
        onContinue={handleContinueFeedback}
      />
    </div>
  );
};
