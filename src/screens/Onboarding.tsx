import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  Bell,
  Clock,
  Minus,
  Plus,
  Sparkles,
  Zap,
} from 'lucide-react';
import { MyDropi } from '../components/MyDropi';
import { SpeechBubble } from '../components/SpeechBubble';
import { Button3D } from '../components/Button3D';
import { ProgressBar } from '../components/ProgressBar';
import { ActivityLevel, HydrationReason, Profile } from '../lib/types';
import {
  calculateRecommendedGoal,
  CUP_PRESETS,
  REASON_OPTIONS,
} from '../lib/hydration';
import { useTetes } from '../state/TetesContext';
import { soundEngine } from '../lib/sound';

const ACTIVITY_OPTIONS: {
  id: ActivityLevel;
  title: string;
  desc: string;
  bonus: string;
}[] = [
  { id: 'santai', title: 'Santai', desc: 'Banyak duduk atau aktivitas ringan', bonus: '+0 ml' },
  { id: 'sedang', title: 'Sedang', desc: 'Jalan kaki atau olahraga 2–3x/minggu', bonus: '+300 ml' },
  { id: 'aktif', title: 'Sangat Aktif', desc: 'Olahraga rutin atau kerja fisik', bonus: '+600 ml' },
];

export const Onboarding: React.FC = () => {
  const { data, completeOnboarding, skipOnboarding } = useTetes();
  const reduceMotion = useReducedMotion();

  // Langkah 0..2 = intro slides, 3..10 = pertanyaan interaktif + hasil + notifikasi
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [name, setName] = useState(data.profile.name);
  const [reason, setReason] = useState<HydrationReason | null>(null);
  const [weightKg, setWeightKg] = useState(data.profile.weightKg || 60);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [wakeTime, setWakeTime] = useState(data.profile.wakeTime || '06:30');
  const [sleepTime, setSleepTime] = useState(data.profile.sleepTime || '22:30');
  const [cupMl, setCupMl] = useState<number | null>(250);
  const [customGoal, setCustomGoal] = useState<number | null>(null);
  const [displayGoal, setDisplayGoal] = useState(0);

  const recommendedGoal = calculateRecommendedGoal(
    weightKg,
    activity || 'sedang'
  );
  const finalGoal = customGoal ?? recommendedGoal;

  // Count-up angka target pada layar hasil (step 9)
  useEffect(() => {
    if (step !== 9) return;
    if (reduceMotion) {
      setDisplayGoal(finalGoal);
      return;
    }
    const startVal = Math.max(800, finalGoal - 700);
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const p = Math.min(1, (now - startTime) / 700);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayGoal(Math.round(startVal + (finalGoal - startVal) * eased));
      if (p < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [step, finalGoal, reduceMotion]);

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(10, s + 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const finishAll = (notifEnabled: boolean) => {
    const profile: Profile = {
      name: name.trim() || 'Teman',
      weightKg,
      activity: activity || 'sedang',
      wakeTime,
      sleepTime,
      cupMl: cupMl || 250,
      goalMl: finalGoal,
      reason: reason || 'energi',
      dropiColor: 'blue',
      dropiAccessory: 'none',
      onboarded: true,
    };
    completeOnboarding(profile, notifEnabled);
  };

  const handleRequestNotification = async () => {
    if (typeof Notification === 'undefined') {
      finishAll(false);
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      finishAll(perm === 'granted');
    } catch {
      finishAll(false);
    }
  };

  const isIntro = step <= 2;
  const questionProgress = step >= 3 ? ((step - 2) / 8) * 100 : 0;

  const canContinue = (() => {
    if (step === 3) return name.trim().length >= 1;
    if (step === 4) return reason !== null;
    if (step === 6) return activity !== null;
    if (step === 8) return cupMl !== null;
    return true;
  })();

  const slideVariants = {
    enter: (dir: number) =>
      reduceMotion
        ? { opacity: 0 }
        : { x: dir > 0 ? 48 : -48, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: (dir: number) =>
      reduceMotion
        ? { opacity: 0 }
        : { x: dir > 0 ? -48 : 48, opacity: 0 },
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white dark:bg-slate-900 px-5 pt-4 pb-7">
      {/* Header navigasi Onboarding */}
      <div className="flex items-center gap-3 min-h-[44px]">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => {
              soundEngine.play('click', data.settings.sound);
              goBack();
            }}
            aria-label="Kembali ke langkah sebelumnya"
            className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-full text-[#777777] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-9" />
        )}

        <div className="flex-1">
          {!isIntro && (
            <ProgressBar
              percent={questionProgress}
              color="water"
              heightClass="h-4"
              ariaLabel="Progres pengaturan awal"
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            soundEngine.play('click', data.settings.sound);
            skipOnboarding();
          }}
          className="min-h-[44px] px-2 text-sm font-extrabold text-[#777777] dark:text-slate-400 hover:text-[#1CB0F6] cursor-pointer whitespace-nowrap"
        >
          Lewati
        </button>
      </div>

      {/* Konten langkah dengan animasi slide + fade */}
      <div className="flex-1 flex flex-col justify-between pt-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex-1 flex flex-col"
            onPanEnd={
              isIntro
                ? (_, info) => {
                    if (info.offset.x < -50 && step < 2) goNext();
                    if (info.offset.x > 50 && step > 0) goBack();
                  }
                : undefined
            }
          >
            {/* SLIDE INTRO 1 */}
            {step === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                <div className="relative flex items-center justify-center">
                  <span aria-hidden="true" className="absolute h-44 w-44 rounded-full bg-[#DDF4FF] dark:bg-sky-900/30" />
                  <MyDropi mood="cheer" size={160} />
                </div>
                <div className="mt-4 w-full max-w-xs">
                  <SpeechBubble
                    text="Halo! Aku Dropi, teman minummu."
                    tailSide="top"
                    className="text-center"
                  />
                </div>
                <h2 className="mt-6 font-display text-2xl font-extrabold text-[#3C3C3C] dark:text-white">
                  Kenalan dulu yuk!
                </h2>
                <p className="mt-2 text-sm font-semibold text-[#777777] dark:text-slate-300 leading-relaxed">
                  Bareng aku, minum air setiap hari jadi kebiasaan ringan yang bikin semangat.
                </p>
              </div>
            )}

            {/* SLIDE INTRO 2 */}
            {step === 1 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                <div className="relative flex items-center justify-center">
                  <span aria-hidden="true" className="absolute h-44 w-44 rounded-full bg-[#DDF4FF] dark:bg-sky-900/30" />
                  <MyDropi mood="happy" size={160} />
                </div>
                <div className="mt-4 w-full max-w-xs">
                  <SpeechBubble
                    text="Air yang cukup bikin fokus, energi, dan kulit lebih sehat."
                    tailSide="top"
                    className="text-center"
                  />
                </div>
                <h2 className="mt-6 font-display text-2xl font-extrabold text-[#3C3C3C] dark:text-white">
                  Tubuh segar, pikiran jernih
                </h2>
                <p className="mt-2 text-sm font-semibold text-[#777777] dark:text-slate-300 leading-relaxed">
                  Target minummu dihitung otomatis sesuai berat badan dan aktivitasmu.
                </p>
              </div>
            )}

            {/* SLIDE INTRO 3 */}
            {step === 2 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                <div className="relative flex items-center justify-center">
                  <span aria-hidden="true" className="absolute h-44 w-44 rounded-full bg-[#DDF4FF] dark:bg-sky-900/30" />
                  <MyDropi mood="drinking" size={160} />
                </div>
                <div className="mt-4 w-full max-w-xs">
                  <SpeechBubble
                    text="Catat tiap tegukmu, jaga streak, dan kumpulkan XP!"
                    tailSide="top"
                    className="text-center"
                  />
                </div>
                <h2 className="mt-6 font-display text-2xl font-extrabold text-[#3C3C3C] dark:text-white">
                  Seru kayak main game
                </h2>
                <p className="mt-2 text-sm font-semibold text-[#777777] dark:text-slate-300 leading-relaxed">
                  Selesaikan misi harian, buka lencana keren, dan pilih mood seru bareng Dropi!
                </p>
              </div>
            )}

            {/* PERTANYAAN 4: NAMA */}
            {step === 3 && (
              <div className="flex-1 flex flex-col pt-2">
                <div className="flex items-center gap-3 mb-6">
                  <MyDropi mood="happy" size={84} />
                  <SpeechBubble text="Biar makin akrab, siapa nama panggilanmu?" tailSide="left" className="flex-1" />
                </div>
                <label
                  htmlFor="onboarding-name"
                  className="font-display text-2xl font-extrabold text-[#3C3C3C] dark:text-white mb-3"
                >
                  Siapa namamu?
                </label>
                <input
                  id="onboarding-name"
                  type="text"
                  maxLength={24}
                  autoFocus
                  placeholder="Contoh: Adha, Rina, Budi..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canContinue) goNext();
                  }}
                  className="w-full rounded-[16px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-[#F7FAFC] dark:bg-slate-800 px-4 py-3.5 text-lg font-bold text-[#3C3C3C] dark:text-white focus:border-[#1CB0F6] focus:outline-none focus:ring-4 focus:ring-[#1CB0F6]/20"
                />
              </div>
            )}

            {/* PERTANYAAN 5: ALASAN */}
            {step === 4 && (
              <div className="flex-1 flex flex-col pt-2">
                <div className="flex items-center gap-3 mb-4">
                  <MyDropi mood="happy" size={76} />
                  <SpeechBubble
                    text={`Salam kenal, ${name || 'Teman'}! Apa motivasi minummu?`}
                    tailSide="left"
                    className="flex-1"
                  />
                </div>
                <h2 className="font-display text-xl font-extrabold text-[#3C3C3C] dark:text-white mb-3">
                  Apa alasan utamamu minum lebih banyak?
                </h2>
                <div className="space-y-2.5">
                  {REASON_OPTIONS.map((opt) => {
                    const selected = reason === opt.id;
                    return (
                      <motion.button
                        key={opt.id}
                        type="button"
                        whileTap={reduceMotion ? {} : { scale: 0.98 }}
                        animate={selected && !reduceMotion ? { scale: [1, 1.03, 1] } : {}}
                        onClick={() => {
                          soundEngine.play('pop', data.settings.sound);
                          setReason(opt.id);
                        }}
                        className={`w-full min-h-[56px] flex items-center justify-between rounded-[16px] border-2 px-4 py-3 text-left transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#1CB0F6] bg-[#DDF4FF] dark:bg-[#0C2D48] text-[#1899D6] dark:text-[#7CE0FF]'
                            : 'border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#3C3C3C] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-750'
                        }`}
                      >
                        <div>
                          <div className="font-extrabold text-base">{opt.label}</div>
                          <div className="text-xs font-semibold opacity-80">{opt.desc}</div>
                        </div>
                        <Zap
                          className={`w-5 h-5 shrink-0 ${
                            selected ? 'text-[#1CB0F6]' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PERTANYAAN 6: BERAT BADAN */}
            {step === 5 && (
              <div className="flex-1 flex flex-col pt-2">
                <div className="flex items-center gap-3 mb-6">
                  <MyDropi mood="happy" size={80} />
                  <SpeechBubble
                    text="Berat badan bantu aku menghitung kebutuhan cairanmu."
                    tailSide="left"
                    className="flex-1"
                  />
                </div>
                <h2 className="font-display text-2xl font-extrabold text-[#3C3C3C] dark:text-white mb-6">
                  Berapa berat badanmu?
                </h2>

                <div className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-[#F7FAFC] dark:bg-slate-800 p-6 text-center">
                  <div className="flex items-center justify-center gap-5">
                    <button
                      type="button"
                      aria-label="Kurangi berat badan 1 kg"
                      onClick={() => {
                        soundEngine.play('click', data.settings.sound);
                        setWeightKg((w) => Math.max(35, w - 1));
                      }}
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full border-2 border-[#E5E5E5] dark:border-slate-600 bg-white dark:bg-slate-700 text-[#3C3C3C] dark:text-white active:scale-95 cursor-pointer"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <div className="font-display text-5xl font-extrabold text-[#1CB0F6] tabular-nums min-w-[120px]">
                      {weightKg} <span className="text-2xl text-[#777777] dark:text-slate-400">kg</span>
                    </div>
                    <button
                      type="button"
                      aria-label="Tambah berat badan 1 kg"
                      onClick={() => {
                        soundEngine.play('click', data.settings.sound);
                        setWeightKg((w) => Math.min(150, w + 1));
                      }}
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full border-2 border-[#E5E5E5] dark:border-slate-600 bg-white dark:bg-slate-700 text-[#3C3C3C] dark:text-white active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <input
                    type="range"
                    min={35}
                    max={150}
                    value={weightKg}
                    aria-label="Geser berat badan dalam kilogram"
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="mt-6 w-full accent-[#1CB0F6] cursor-pointer h-3"
                  />
                  <div className="mt-1 flex justify-between text-xs font-bold text-[#777777] dark:text-slate-400 tabular-nums">
                    <span>35 kg</span>
                    <span>90 kg</span>
                    <span>150 kg</span>
                  </div>
                </div>
              </div>
            )}

            {/* PERTANYAAN 7: TINGKAT AKTIVITAS */}
            {step === 6 && (
              <div className="flex-1 flex flex-col pt-2">
                <div className="flex items-center gap-3 mb-5">
                  <MyDropi mood="cheer" size={80} />
                  <SpeechBubble
                    text="Makin aktif bergerak, makin banyak air yang dibutuhkan!"
                    tailSide="left"
                    className="flex-1"
                  />
                </div>
                <h2 className="font-display text-2xl font-extrabold text-[#3C3C3C] dark:text-white mb-4">
                  Seberapa aktif kamu?
                </h2>
                <div className="space-y-3">
                  {ACTIVITY_OPTIONS.map((opt) => {
                    const selected = activity === opt.id;
                    return (
                      <motion.button
                        key={opt.id}
                        type="button"
                        whileTap={reduceMotion ? {} : { scale: 0.98 }}
                        onClick={() => {
                          soundEngine.play('pop', data.settings.sound);
                          setActivity(opt.id);
                        }}
                        className={`w-full min-h-[68px] flex items-center justify-between rounded-[16px] border-2 px-4 py-3 text-left transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#1CB0F6] bg-[#DDF4FF] dark:bg-[#0C2D48] text-[#1899D6] dark:text-[#7CE0FF]'
                            : 'border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#3C3C3C] dark:text-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Activity className="w-5 h-5 shrink-0 text-[#1CB0F6]" />
                          <div>
                            <div className="font-extrabold text-base">{opt.title}</div>
                            <div className="text-xs font-semibold opacity-80">{opt.desc}</div>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold tabular-nums text-[#777777] dark:text-slate-300">
                          {opt.bonus}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PERTANYAAN 8: JAM BANGUN & TIDUR */}
            {step === 7 && (
              <div className="flex-1 flex flex-col pt-2">
                <div className="flex items-center gap-3 mb-6">
                  <MyDropi mood="sleepy" size={80} />
                  <SpeechBubble
                    text="Aku nggak akan mengganggu saat jam tidurmu kok."
                    tailSide="left"
                    className="flex-1"
                  />
                </div>
                <h2 className="font-display text-2xl font-extrabold text-[#3C3C3C] dark:text-white mb-5">
                  Jam berapa kamu biasa bangun dan tidur?
                </h2>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                  <label className="flex flex-col rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-[#F7FAFC] dark:bg-slate-800 p-3 sm:p-4">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#777777] dark:text-slate-400 mb-2">
                      <Clock className="w-4 h-4 text-[#FFC800] shrink-0" />
                      Jam Bangun
                    </span>
                    <input
                      type="time"
                      value={wakeTime}
                      onChange={(e) => setWakeTime(e.target.value)}
                      className="font-display text-lg sm:text-2xl font-extrabold text-[#3C3C3C] dark:text-white bg-transparent focus:outline-none tabular-nums"
                    />
                  </label>

                  <label className="flex flex-col rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-[#F7FAFC] dark:bg-slate-800 p-3 sm:p-4">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#777777] dark:text-slate-400 mb-2">
                      <Clock className="w-4 h-4 text-[#CE82FF] shrink-0" />
                      Jam Tidur
                    </span>
                    <input
                      type="time"
                      value={sleepTime}
                      onChange={(e) => setSleepTime(e.target.value)}
                      className="font-display text-lg sm:text-2xl font-extrabold text-[#3C3C3C] dark:text-white bg-transparent focus:outline-none tabular-nums"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* PERTANYAAN 9: UKURAN GELAS FAVORIT */}
            {step === 8 && (
              <div className="flex-1 flex flex-col pt-2">
                <div className="flex items-center gap-3 mb-5">
                  <MyDropi mood="drinking" size={80} />
                  <SpeechBubble
                    text="Pilih gelas andalanmu biar mencatat cukup sekali tap!"
                    tailSide="left"
                    className="flex-1"
                  />
                </div>
                <h2 className="font-display text-2xl font-extrabold text-[#3C3C3C] dark:text-white mb-4">
                  Ukuran gelas favoritmu?
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  {CUP_PRESETS.map((preset, idx) => {
                    const selected = cupMl === preset.ml;
                    const cupHeight = 26 + idx * 8;
                    return (
                      <motion.button
                        key={preset.ml}
                        type="button"
                        whileTap={reduceMotion ? {} : { scale: 0.96 }}
                        onClick={() => {
                          soundEngine.play('pop', data.settings.sound);
                          setCupMl(preset.ml);
                        }}
                        className={`flex flex-col items-center justify-center rounded-[20px] border-2 p-4 min-h-[126px] transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#1CB0F6] bg-[#DDF4FF] dark:bg-[#0C2D48]'
                            : 'border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {/* Ilustrasi gelas bertingkat berbasis CSS */}
                        <div className="h-14 flex items-end justify-center mb-2" aria-hidden="true">
                          <div
                            style={{ height: cupHeight, width: 28 + idx * 4 }}
                            className="relative rounded-b-xl rounded-t-sm border-2 border-[#1CB0F6] bg-[#E6F8FF] dark:bg-slate-700 overflow-hidden"
                          >
                            <div className="absolute inset-x-0 bottom-0 h-[62%] bg-[#1CB0F6]/80" />
                          </div>
                        </div>
                        <div className="font-display text-xl font-extrabold text-[#3C3C3C] dark:text-white tabular-nums">
                          {preset.ml} ml
                        </div>
                        <div className="text-xs font-bold text-[#777777] dark:text-slate-400">
                          {preset.label}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* HASIL 10: TARGET HARIAN */}
            {step === 9 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center pt-2">
                <div className="relative flex items-center justify-center">
                  <span aria-hidden="true" className="absolute h-36 w-36 rounded-full bg-[#DDF4FF] dark:bg-sky-900/30" />
                  <MyDropi mood="wow" size={140} />
                </div>
                <p className="mt-3 text-sm font-extrabold text-[#1CB0F6] uppercase tracking-wider">
                  Target harian siap!
                </p>
                <div className="mt-2 font-display text-5xl font-extrabold text-[#3C3C3C] dark:text-white tabular-nums">
                  {displayGoal.toLocaleString('id-ID')} ml
                </div>
                <p className="mt-2 max-w-xs text-sm font-semibold text-[#777777] dark:text-slate-300">
                  Sekitar {Math.round(finalGoal / (cupMl || 250))} gelas ({cupMl || 250} ml) per hari. Kamu bisa sesuaikan target ini:
                </p>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Kurangi target 100 ml"
                    onClick={() => {
                      soundEngine.play('click', data.settings.sound);
                      setCustomGoal(Math.max(1500, finalGoal - 100));
                    }}
                    className="min-h-[44px] px-4 flex items-center gap-1 rounded-[14px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 font-extrabold text-sm text-[#3C3C3C] dark:text-white cursor-pointer"
                  >
                    <Minus className="w-4 h-4" /> 100 ml
                  </button>
                  <button
                    type="button"
                    aria-label="Tambah target 100 ml"
                    onClick={() => {
                      soundEngine.play('click', data.settings.sound);
                      setCustomGoal(Math.min(4000, finalGoal + 100));
                    }}
                    className="min-h-[44px] px-4 flex items-center gap-1 rounded-[14px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 font-extrabold text-sm text-[#3C3C3C] dark:text-white cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> 100 ml
                  </button>
                </div>
              </div>
            )}

            {/* LANGKAH 11: IZIN NOTIFIKASI (OPSIONAL) */}
            {step === 10 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                <div className="relative flex items-center justify-center">
                  <span aria-hidden="true" className="absolute h-36 w-36 rounded-full bg-[#DDF4FF] dark:bg-sky-900/30" />
                  <MyDropi mood="happy" size={140} />
                  <div className="absolute -right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#FFC800] text-[#3C3C3C] shadow-md">
                    <Bell className="w-6 h-6" />
                  </div>
                </div>
                <h2 className="mt-5 font-display text-2xl font-extrabold text-[#3C3C3C] dark:text-white">
                  Mau diingatkan Dropi?
                </h2>
                <p className="mt-2 max-w-xs text-sm font-semibold text-[#777777] dark:text-slate-300 leading-relaxed">
                  Saat aplikasi atau tab ini sedang terbuka di jam aktifmu, aku bisa mengirim pengingat ramah biar kamu nggak lupa minum.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer CTA Onboarding */}
        <div className="pt-5">
          {isIntro && (
            <div className="flex items-center justify-center gap-2 mb-4" aria-hidden="true">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className={`h-2.5 rounded-full transition-all duration-200 ${
                    step === dot
                      ? 'w-7 bg-[#1CB0F6]'
                      : 'w-2.5 bg-[#E5E5E5] dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
          )}

          {step < 9 && (
            <Button3D
              variant="water"
              fullWidth
              size="lg"
              disabled={!canContinue}
              onClick={goNext}
            >
              LANJUT
            </Button3D>
          )}

          {step === 9 && (
            <Button3D variant="mint" fullWidth size="lg" onClick={goNext}>
              <Sparkles className="w-5 h-5" />
              AYO MULAI!
            </Button3D>
          )}

          {step === 10 && (
            <div className="space-y-2.5">
              <Button3D
                variant="water"
                fullWidth
                size="lg"
                onClick={handleRequestNotification}
              >
                Izinkan Pengingat
              </Button3D>
              <Button3D
                variant="ghost"
                fullWidth
                size="md"
                onClick={() => finishAll(false)}
              >
                Nanti saja
              </Button3D>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
