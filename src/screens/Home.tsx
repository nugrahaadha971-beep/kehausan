import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2,
  Droplet,
  Flame,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { DropiMood, getDropiTheme } from '../components/DropiMascot';
import { MyDropi } from '../components/MyDropi';
import { SpeechBubble } from '../components/SpeechBubble';
import { WaterWave } from '../components/WaterWave';
import { Burst } from '../components/Burst';
import { Button3D } from '../components/Button3D';
import { ProgressBar } from '../components/ProgressBar';
import { FeedbackSheet } from '../components/FeedbackSheet';
import { ComboPopup } from '../components/ComboPopup';
import { HydrationQuoteCard } from '../components/HydrationQuoteCard';
import { OfflineBanner } from '../components/PWAInstallButton';
import { useTetes } from '../state/TetesContext';
import { WaterLog } from '../lib/types';
import { formatTimeShort } from '../lib/hydration';
import { parseTimeToMinutes } from '../lib/storage';
import { DAILY_QUEST_DEFS } from '../lib/quests';
import { getDropiMood } from '../lib/dropiMood';
import { soundEngine } from '../lib/sound';

const QUICK_AMOUNTS = [100, 250, 500];

export const Home: React.FC = () => {
  const {
    data,
    todayLogs,
    todayTotalMl,
    todayPercent,
    minutesSinceLastDrink,
    reminderDue,
    lastDrinkFeedback,
    clearDrinkFeedback,
    logWater,
    deleteLog,
    restoreLog,
    claimQuest,
    setScreen,
  } = useTetes();

  const reduceMotion = useReducedMotion();

  const [justDrank, setJustDrank] = useState(false);
  const [displayMl, setDisplayMl] = useState(todayTotalMl);
  const prevMlRef = useRef(todayTotalMl);

  const [floatingMl, setFloatingMl] = useState<{ id: string; ml: number } | null>(null);
  const [flyingXpKey, setFlyingXpKey] = useState<string | null>(null);
  const [comboTrigger, setComboTrigger] = useState<{ count: number; key: string } | null>(null);
  const [burstTrigger, setBurstTrigger] = useState(0);
  const [showSheet, setShowSheet] = useState(false);

  // Bottom sheet input ml kustom
  const [showCustomSheet, setShowCustomSheet] = useState(false);
  const [customMl, setCustomMl] = useState(300);

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
    };
  }, []);

  // Count-up angka ml halus di tengah wadah air
  useEffect(() => {
    const startVal = prevMlRef.current;
    const endVal = todayTotalMl;
    prevMlRef.current = todayTotalMl;

    if (reduceMotion || startVal === endVal) {
      setDisplayMl(endVal);
      return;
    }

    const duration = 520;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayMl(Math.round(startVal + (endVal - startVal) * eased));
      if (t < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [todayTotalMl, reduceMotion]);

  const handleDrink = (ml: number) => {
    const feedback = logWater(ml);

    setJustDrank(true);
    if (justDrankTimerRef.current) window.clearTimeout(justDrankTimerRef.current);
    justDrankTimerRef.current = window.setTimeout(() => {
      setJustDrank(false);
    }, 1600);

    setFloatingMl({ id: feedback.log.id, ml: feedback.log.ml });
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
    data.profile.goalMl > 0
      ? Math.min(1, todayTotalMl / data.profile.goalMl)
      : 0;

  const dropiTheme = useMemo(
    () => getDropiTheme(data.profile.dropiColor),
    [data.profile.dropiColor]
  );

  const dropiMood: DropiMood = useMemo(() => {
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
    data.profile.wakeTime,
    data.profile.sleepTime,
    minutesSinceLastDrink,
    justDrank,
  ]);

  const dropiSpeech = useMemo(() => {
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
  }, [dropiMood, data.progress.streak, todayLogs.length]);

  return (
    <div className="pb-24">
      {/* Header sapaan + Streak chip + XP chip */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3.5 sm:px-4 py-3 border-b border-[#E5E5E5]/70 dark:border-slate-800">
        <div className="min-w-0">
          <h1 className="font-display text-lg sm:text-xl font-extrabold text-[#3C3C3C] dark:text-white truncate">
            Halo, {data.profile.name || 'Teman'}!
          </h1>
          <p className="text-[11px] sm:text-xs font-bold text-[#777777] dark:text-slate-400 truncate">
            Lv {data.progress.level} · Target {data.profile.goalMl.toLocaleString('id-ID')} ml
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Chip Streak */}
          <button
            type="button"
            onClick={() => {
              soundEngine.play('click', data.settings.sound);
              setScreen('streak');
            }}
            aria-label={`Streak ${data.progress.streak} hari`}
            className="min-h-[38px] inline-flex items-center gap-1 rounded-full bg-[#FFF3DF] dark:bg-amber-950/60 border border-[#FFD18A] dark:border-amber-700/60 px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-extrabold text-[#E07600] dark:text-[#FFAC33] cursor-pointer active:scale-95 transition-transform"
          >
            <Flame className="w-4 h-4 fill-[#FF9600] text-[#FF9600]" />
            <span className="tabular-nums">{data.progress.streak}</span>
            {data.progress.freezes > 0 && (
              <span
                title={`${data.progress.freezes} Pelindung Streak`}
                className="inline-flex items-center gap-0.5 text-[11px] text-[#1CB0F6] ml-0.5"
              >
                <Shield className="w-3.5 h-3.5 fill-[#1CB0F6]/20" />
                {data.progress.freezes}
              </span>
            )}
          </button>

          {/* Chip XP */}
          <div
            aria-label={`Total ${data.progress.xp} XP`}
            className="min-h-[38px] inline-flex items-center gap-1 rounded-full bg-[#FFF9DC] dark:bg-yellow-950/50 border border-[#FFE47A] dark:border-yellow-700/60 px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-extrabold text-[#B88600] dark:text-[#FFD633]"
          >
            <Star className="w-4 h-4 fill-[#FFC800] text-[#FFC800]" />
            <span className="tabular-nums">{data.progress.xp}</span>
          </div>
        </div>
      </header>

      <OfflineBanner />

      {/* Pengingat dalam aplikasi saat interval terlewati */}
      <AnimatePresence>
        {reminderDue && !justDrank && (
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
              onClick={() => handleDrink(data.profile.cupMl)}
              className="shrink-0 min-h-[36px] rounded-full bg-[#FFC800] px-3 py-1 text-xs font-extrabold text-[#3C3C3C] cursor-pointer active:scale-95"
            >
              Minum
            </button>
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
            aria-label={`Wadah air terisi ${todayPercent} persen, ${todayTotalMl} dari ${data.profile.goalMl} mililiter`}
            className="relative w-48 h-60 rounded-[36px] overflow-hidden border-4 border-[#BAE6FD] dark:border-slate-700 bg-[#EBF8FF] dark:bg-slate-800 shadow-inner"
          >
            <WaterWave level={waterLevel} />

            {/* Highlight kaca vertikal di sisi kiri */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-4 left-3.5 bottom-6 w-2 rounded-full bg-white/35"
            />

            {/* Angka progres di tengah */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3">
              <div className="rounded-[20px] bg-white/88 dark:bg-slate-900/85 backdrop-blur-sm px-3.5 py-2 text-center shadow-sm border border-white/60 dark:border-slate-700/80">
                <div className="font-display text-3xl font-extrabold leading-none text-[#1899D6] dark:text-[#4CC5FF] tabular-nums">
                  {todayPercent}%
                </div>
                <div className="mt-1 text-xs font-extrabold text-[#3C3C3C] dark:text-slate-100 tabular-nums">
                  {displayMl.toLocaleString('id-ID')} /{' '}
                  {data.profile.goalMl.toLocaleString('id-ID')} ml
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

        {/* Tombol aksi 3D utama */}
        <div className="w-full mt-3">
          <Button3D
            variant="water"
            fullWidth
            size="lg"
            silent
            onClick={() => handleDrink(data.profile.cupMl)}
          >
            <Droplet className="w-5 h-5 fill-white/30" />
            + {data.profile.cupMl} ml
          </Button3D>
        </div>

        {/* Baris chip cepat */}
        <div className="w-full mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleDrink(amt)}
              className="min-h-[44px] rounded-[14px] border-2 border-[#E5E5E5] dark:border-slate-700 border-b-4 border-b-[#D5D5D5] dark:border-b-slate-800 bg-white dark:bg-slate-800 px-1 text-xs sm:text-sm font-extrabold text-[#1CB0F6] dark:text-[#4CC5FF] hover:bg-[#F2FAFF] dark:hover:bg-slate-750 active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer tabular-nums whitespace-nowrap"
            >
              +{amt}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              soundEngine.play('click', data.settings.sound);
              setShowCustomSheet(true);
            }}
            className="min-h-[44px] inline-flex items-center justify-center gap-0.5 sm:gap-1 rounded-[14px] border-2 border-[#E5E5E5] dark:border-slate-700 border-b-4 border-b-[#D5D5D5] dark:border-b-slate-800 bg-white dark:bg-slate-800 px-1 text-xs sm:text-sm font-extrabold text-[#777777] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer whitespace-nowrap"
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
            Hadiah XP & Pelindung
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
                className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-sm font-extrabold text-[#3C3C3C] dark:text-slate-100">
                      {def.title}
                    </div>
                    <div className="text-xs font-bold text-[#777777] dark:text-slate-400 tabular-nums mt-0.5">
                      {item.progress} / {def.target} {def.unit} · +{def.rewardXp} XP
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
          <div className="flex items-center gap-3 rounded-[20px] border-2 border-dashed border-[#E5E5E5] dark:border-slate-700 bg-[#F7FAFC] dark:bg-slate-800/50 p-4">
            <MyDropi mood="happy" size={58} />
            <p className="text-sm font-bold text-[#777777] dark:text-slate-300">
              Belum ada catatan hari ini. Ketuk tombol biru di atas saat kamu minum ya!
            </p>
          </div>
        ) : (
          <div className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-[#F0F0F0] dark:divide-slate-700 overflow-hidden">
            {todayLogs.map((log, index) => {
              const confirming = confirmDeleteId === log.id;
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
                      <Droplet className="w-4 h-4 fill-[#1CB0F6]" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-[#3C3C3C] dark:text-white tabular-nums">
                        +{log.ml} ml
                      </div>
                      <div className="text-xs font-bold text-[#777777] dark:text-slate-400 tabular-nums">
                        Pukul {formatTimeShort(log.ts)}
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
                      aria-label={`Hapus catatan ${log.ml} ml pukul ${formatTimeShort(log.ts)}`}
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
              Catatan +{undoLog.ml} ml dihapus
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
        {showCustomSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px]">
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="w-full max-w-[430px] rounded-t-[24px] bg-white dark:bg-slate-900 px-5 pt-3 pb-7 shadow-2xl border-t-2 border-[#E5E5E5] dark:border-slate-700"
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

              <div className="rounded-[20px] bg-[#F7FAFC] dark:bg-slate-800 p-5 text-center mb-4">
                <div className="font-display text-4xl font-extrabold text-[#1CB0F6] tabular-nums">
                  {customMl} ml
                </div>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={25}
                  value={customMl}
                  onChange={(e) => setCustomMl(Number(e.target.value))}
                  aria-label="Geser jumlah mililiter"
                  className="mt-4 w-full accent-[#1CB0F6] cursor-pointer h-3"
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
                  handleDrink(customMl);
                }}
              >
                Catat +{customMl} ml
              </Button3D>
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
