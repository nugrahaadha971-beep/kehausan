import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Bell,
  Download,
  Lock,
  Moon,
  RotateCcw,
  Shield,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  Vibrate,
} from 'lucide-react';
import {
  DROPI_ACCESSORIES,
  DROPI_COLORS,
  DropiColor,
  DropiTheme,
  getDropiTheme,
  normalizeDropiAccessory,
  normalizeDropiColor,
} from '../components/DropiMascot';
import { MyDropi } from '../components/MyDropi';
import { Button3D } from '../components/Button3D';
import { ProgressBar } from '../components/ProgressBar';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { useTetes } from '../state/TetesContext';
import {
  CUP_PRESETS,
  DROPI_ACCESSORY_UNLOCK_LEVELS,
  DROPI_COLOR_UNLOCK_LEVELS,
  getXpProgressInLevel,
} from '../lib/hydration';
import { exportStateAsJson } from '../lib/storage';
import { soundEngine } from '../lib/sound';

export const Profile: React.FC = () => {
  const { data, updateProfile, updateSettings, resetAllData } = useTetes();
  const reduceMotion = useReducedMotion();
  const levelInfo = getXpProgressInLevel(data.progress.xp);
  const currentColor = normalizeDropiColor(data.profile.dropiColor);
  const currentAccessory = normalizeDropiAccessory(data.profile.dropiAccessory);
  const dropiTheme = getDropiTheme(currentColor);

  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);
  const [isNotifBusy, setIsNotifBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let removeListener: (() => void) | undefined;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push((OneSignal) => {
      if (!active) return;

      const subscription = OneSignal.User?.PushSubscription;
      if (subscription && typeof subscription.optedIn === 'boolean') {
        updateSettings({ notifications: subscription.optedIn });
      }

      const handleSubscriptionChange = (event: { current?: { optedIn?: boolean } }) => {
        if (!active) return;
        const nextOptedIn = Boolean(
          event?.current?.optedIn ?? OneSignal.User?.PushSubscription?.optedIn
        );
        updateSettings({ notifications: nextOptedIn });
      };

      subscription?.addEventListener?.('change', handleSubscriptionChange);
      removeListener = () => {
        subscription?.removeEventListener?.('change', handleSubscriptionChange);
      };
    });

    return () => {
      active = false;
      removeListener?.();
    };
  }, [updateSettings]);

  const handleToggleNotifications = async () => {
    if (isNotifBusy) return;

    if (data.settings.notifications) {
      updateSettings({ notifications: false });
      setNotifFeedback(null);
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          await OneSignal.User?.PushSubscription?.optOut?.();
        } catch {
          // Abaikan jika SDK gagal optOut
        }
      });
      return;
    }

    if (typeof Notification === 'undefined') {
      setNotifFeedback('Browser ini tidak mendukung Notification API.');
      return;
    }

    if (Notification.permission === 'denied') {
      setNotifFeedback(
        'Izin notifikasi diblokir di pengaturan browser. Aktifkan izin di ikon gembok/alamat URL.'
      );
      return;
    }

    setIsNotifBusy(true);
    setNotifFeedback(null);

    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        setIsNotifBusy(false);
        setNotifFeedback(
          'Layanan push notification belum merespons. Periksa koneksi internet atau pemblokir iklan.'
        );
      }
    }, 6000);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
        let optedIn = Boolean(OneSignal.User?.PushSubscription?.optedIn);
        if (!optedIn && OneSignal.Notifications.permission) {
          await OneSignal.User?.PushSubscription?.optIn?.();
          optedIn = Boolean(OneSignal.User?.PushSubscription?.optedIn);
        }

        if (!settled) {
          settled = true;
          window.clearTimeout(timeoutId);
        }

        updateSettings({ notifications: optedIn });
        if (optedIn) {
          setNotifFeedback('Pengingat Push Notification berhasil diaktifkan!');
        } else if (Notification.permission === 'denied') {
          setNotifFeedback(
            'Izin notifikasi diblokir di pengaturan browser. Aktifkan izin di ikon gembok/alamat URL.'
          );
        } else {
          setNotifFeedback('Izin notifikasi belum diberikan.');
        }
      } catch {
        if (!settled) {
          settled = true;
          window.clearTimeout(timeoutId);
        }
        setNotifFeedback('Gagal meminta izin notifikasi.');
      } finally {
        setIsNotifBusy(false);
      }
    });
  };

  return (
    <div className="pb-24 px-4 pt-5 space-y-5">
      {/* Kartu Avatar Dropi + Level XP */}
      <section className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-5 text-center">
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <span
              aria-hidden="true"
              style={{ backgroundColor: dropiTheme.ring }}
              className="absolute h-28 w-28 rounded-full transition-colors duration-300"
            />
            <motion.div
              key={`${currentColor}-${currentAccessory}`}
              initial={reduceMotion ? false : { scale: 0.84 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 16 }}
            >
              <MyDropi mood="happy" size={110} />
            </motion.div>
          </div>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-[#3C3C3C] dark:text-white">
            {data.profile.name || 'Teman'}
          </h1>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs font-extrabold text-[#777777] dark:text-slate-400 tabular-nums">
            <span>Level {levelInfo.level}</span>
            <span>·</span>
            <span>{data.progress.xp} XP</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-[#1CB0F6]">
              <Shield className="w-3.5 h-3.5" /> {data.progress.freezes} Pelindung
            </span>
          </div>
        </div>

        <div className="mt-4 text-left">
          <div className="flex justify-between text-xs font-extrabold text-[#777777] dark:text-slate-400 mb-1.5 tabular-nums">
            <span>Progres ke Level {levelInfo.level + 1}</span>
            <span>
              {levelInfo.current} / {levelInfo.needed} XP
            </span>
          </div>
          <ProgressBar
            percent={levelInfo.percent}
            color="berry"
            heightClass="h-3.5"
            ariaLabel="Progres level XP"
          />
        </div>

        {/* Pilihan Warna Dropi */}
        <div className="mt-5 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-[#3C3C3C] dark:text-slate-200">
              Warna Maskot Dropi
            </span>
            <span className="text-[11px] font-bold text-[#777777] dark:text-slate-400">
              Terbuka sesuai level
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {(Object.entries(DROPI_COLORS) as [DropiColor, DropiTheme][]).map(
              ([colorId, theme]) => {
                const unlockLevel = DROPI_COLOR_UNLOCK_LEVELS[colorId];
                const unlocked = levelInfo.level >= unlockLevel;
                const selected = currentColor === colorId;
                return (
                  <button
                    key={colorId}
                    type="button"
                    disabled={!unlocked}
                    title={
                      unlocked
                        ? theme.label
                        : `${theme.label} (Terbuka di Level ${unlockLevel})`
                    }
                    aria-label={`Pilih warna ${theme.label}`}
                    onClick={() => {
                      soundEngine.play('pop', data.settings.sound);
                      updateProfile({ dropiColor: colorId });
                    }}
                    style={{ backgroundColor: theme.base }}
                    className={`relative min-h-[44px] rounded-[14px] flex items-center justify-center transition-transform cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      selected
                        ? 'ring-4 ring-[#1CB0F6]/50 scale-105 border-2 border-white'
                        : 'border-2 border-black/10'
                    }`}
                  >
                    {!unlocked && (
                      <span className="flex flex-col items-center text-[10px] font-extrabold text-white drop-shadow">
                        <Lock className="w-3.5 h-3.5" />
                        Lv.{unlockLevel}
                      </span>
                    )}
                    {unlocked && selected && (
                      <Sparkles className="w-4 h-4 text-white drop-shadow" />
                    )}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Pilihan Aksesori Dropi */}
        <div className="mt-5 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-[#3C3C3C] dark:text-slate-200">
              Aksesori Dropi
            </span>
            <span className="text-[11px] font-bold text-[#777777] dark:text-slate-400">
              Topi · Kacamata · Mahkota
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DROPI_ACCESSORIES.map((acc) => {
              const unlockLevel = DROPI_ACCESSORY_UNLOCK_LEVELS[acc.id];
              const unlocked = levelInfo.level >= unlockLevel;
              const selected = currentAccessory === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    soundEngine.play('pop', data.settings.sound);
                    updateProfile({ dropiAccessory: acc.id });
                  }}
                  className={`min-h-[44px] rounded-[14px] border-2 px-2.5 py-2 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    selected
                      ? 'border-[#1CB0F6] bg-[#DDF4FF] dark:bg-[#0C2D48] text-[#1899D6] dark:text-[#7CE0FF]'
                      : 'border-[#E5E5E5] dark:border-slate-700 text-[#3C3C3C] dark:text-slate-200'
                  }`}
                >
                  {!unlocked && <Lock className="w-3.5 h-3.5 shrink-0" />}
                  <span>{acc.label}</span>
                  {!unlocked && <span className="text-[10px] opacity-80">Lv.{unlockLevel}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* PWA Add to Home Screen */}
      <PWAInstallButton />

      {/* Pengaturan Profil & Target */}
      <section className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
        <h2 className="font-display text-lg font-extrabold text-[#3C3C3C] dark:text-white">
          Profil & Target Harian
        </h2>

        <div>
          <label
            htmlFor="profile-name"
            className="block text-xs font-extrabold text-[#777777] dark:text-slate-400 mb-1"
          >
            Nama Panggilan
          </label>
          <input
            id="profile-name"
            type="text"
            maxLength={24}
            value={data.profile.name}
            onChange={(e) => updateProfile({ name: e.target.value })}
            className="w-full rounded-[14px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-[#F7FAFC] dark:bg-slate-900 px-3.5 py-2.5 text-sm font-bold text-[#3C3C3C] dark:text-white focus:border-[#1CB0F6] focus:outline-none"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-extrabold text-[#777777] dark:text-slate-400 mb-1 tabular-nums">
            <span>Target Harian</span>
            <span className="text-[#1CB0F6]">
              {data.profile.goalMl.toLocaleString('id-ID')} ml
            </span>
          </div>
          <input
            type="range"
            min={1500}
            max={4000}
            step={50}
            value={data.profile.goalMl}
            aria-label="Ubah target harian mililiter"
            onChange={(e) => updateProfile({ goalMl: Number(e.target.value) })}
            className="w-full accent-[#1CB0F6] cursor-pointer h-3"
          />
        </div>

        <div>
          <span className="block text-xs font-extrabold text-[#777777] dark:text-slate-400 mb-1.5">
            Ukuran Gelas Favorit
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CUP_PRESETS.map((p) => {
              const active = data.profile.cupMl === p.ml;
              return (
                <button
                  key={p.ml}
                  type="button"
                  onClick={() => {
                    soundEngine.play('click', data.settings.sound);
                    updateProfile({ cupMl: p.ml });
                  }}
                  className={`min-h-[44px] rounded-[12px] border-2 text-xs font-extrabold tabular-nums cursor-pointer ${
                    active
                      ? 'border-[#1CB0F6] bg-[#DDF4FF] dark:bg-[#0C2D48] text-[#1899D6] dark:text-[#7CE0FF]'
                      : 'border-[#E5E5E5] dark:border-slate-700 text-[#3C3C3C] dark:text-slate-200'
                  }`}
                >
                  {p.ml} ml
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-extrabold text-[#777777] dark:text-slate-400 mb-1">
              Jam Bangun
            </span>
            <input
              type="time"
              value={data.profile.wakeTime}
              onChange={(e) => updateProfile({ wakeTime: e.target.value })}
              className="w-full rounded-[14px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-[#F7FAFC] dark:bg-slate-900 px-3 py-2 text-sm font-bold text-[#3C3C3C] dark:text-white tabular-nums"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-extrabold text-[#777777] dark:text-slate-400 mb-1">
              Jam Tidur
            </span>
            <input
              type="time"
              value={data.profile.sleepTime}
              onChange={(e) => updateProfile({ sleepTime: e.target.value })}
              className="w-full rounded-[14px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-[#F7FAFC] dark:bg-slate-900 px-3 py-2 text-sm font-bold text-[#3C3C3C] dark:text-white tabular-nums"
            />
          </label>
        </div>
      </section>

      {/* Pengingat & Preferensi */}
      <section className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
        <h2 className="font-display text-lg font-extrabold text-[#3C3C3C] dark:text-white">
          Pengingat & Tampilan
        </h2>

        <div>
          <span className="block text-xs font-extrabold text-[#777777] dark:text-slate-400 mb-1.5">
            Interval Pengingat (di jam aktif)
          </span>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {([60, 90, 120] as const).map((mins) => {
              const active = data.settings.reminderMinutes === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    soundEngine.play('click', data.settings.sound);
                    updateSettings({ reminderMinutes: mins });
                  }}
                  className={`min-h-[44px] rounded-[12px] border-2 px-1 text-[11px] sm:text-xs font-extrabold tabular-nums cursor-pointer whitespace-nowrap ${
                    active
                      ? 'border-[#1CB0F6] bg-[#DDF4FF] dark:bg-[#0C2D48] text-[#1899D6] dark:text-[#7CE0FF]'
                      : 'border-[#E5E5E5] dark:border-slate-700 text-[#3C3C3C] dark:text-slate-200'
                  }`}
                >
                  {mins} menit
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggle Pengingat Browser + Catatan Jujur */}
        <div className="rounded-[16px] bg-[#F7FAFC] dark:bg-slate-900 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-[#1CB0F6] shrink-0" />
              <div>
                <div className="text-sm font-extrabold text-[#3C3C3C] dark:text-white">
                  Notifikasi Browser
                </div>
                <div className="text-[11px] font-bold text-[#777777] dark:text-slate-400">
                  {data.settings.notifications ? 'Aktif' : 'Nonaktif'}
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={data.settings.notifications}
              aria-label="Aktifkan notifikasi browser"
              disabled={isNotifBusy}
              onClick={handleToggleNotifications}
              className={`min-h-[32px] w-14 rounded-full p-1 transition-colors cursor-pointer disabled:opacity-60 ${
                data.settings.notifications
                  ? 'bg-[#58CC02]'
                  : 'bg-[#E5E5E5] dark:bg-slate-700'
              }`}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  data.settings.notifications ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#777777] dark:text-slate-400">
            Aktifkan untuk menerima pengingat minum otomatis lewat Push Notification meskipun aplikasi ditutup.
          </p>
          {notifFeedback && (
            <p className="mt-1.5 text-xs font-extrabold text-[#1CB0F6]">
              {notifFeedback}
            </p>
          )}
        </div>

        {/* Toggle Suara, Getar, Mode Gelap */}
        <div className="divide-y divide-[#F0F0F0] dark:divide-slate-700">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              {data.settings.sound ? (
                <Volume2 className="w-5 h-5 text-[#1CB0F6]" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-400" />
              )}
              <span className="text-sm font-extrabold text-[#3C3C3C] dark:text-white">
                Efek Suara
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={data.settings.sound}
              aria-label="Aktifkan efek suara"
              onClick={() => updateSettings({ sound: !data.settings.sound })}
              className={`min-h-[32px] w-14 rounded-full p-1 transition-colors cursor-pointer ${
                data.settings.sound
                  ? 'bg-[#58CC02]'
                  : 'bg-[#E5E5E5] dark:bg-slate-700'
              }`}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  data.settings.sound ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <Vibrate className="w-5 h-5 text-[#CE82FF]" />
              <span className="text-sm font-extrabold text-[#3C3C3C] dark:text-white">
                Getar (Haptic)
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={data.settings.haptics}
              aria-label="Aktifkan getar haptic"
              onClick={() => updateSettings({ haptics: !data.settings.haptics })}
              className={`min-h-[32px] w-14 rounded-full p-1 transition-colors cursor-pointer ${
                data.settings.haptics
                  ? 'bg-[#58CC02]'
                  : 'bg-[#E5E5E5] dark:bg-slate-700'
              }`}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  data.settings.haptics ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2.5">
              {data.settings.dark ? (
                <Moon className="w-5 h-5 text-[#FFC800]" />
              ) : (
                <Sun className="w-5 h-5 text-[#FF9600]" />
              )}
              <span className="text-sm font-extrabold text-[#3C3C3C] dark:text-white">
                Mode Gelap
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={data.settings.dark}
              aria-label="Aktifkan mode gelap"
              onClick={() => updateSettings({ dark: !data.settings.dark })}
              className={`min-h-[32px] w-14 rounded-full p-1 transition-colors cursor-pointer ${
                data.settings.dark
                  ? 'bg-[#58CC02]'
                  : 'bg-[#E5E5E5] dark:bg-slate-700'
              }`}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  data.settings.dark ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Kelola Data (Ekspor & Reset 2 langkah) */}
      <section className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
        <h2 className="font-display text-lg font-extrabold text-[#3C3C3C] dark:text-white">
          Data Lokal
        </h2>

        <Button3D
          variant="white"
          fullWidth
          size="md"
          onClick={() => exportStateAsJson(data)}
        >
          <Download className="w-4 h-4" />
          Ekspor Data (JSON)
        </Button3D>

        {resetStep === 0 && (
          <Button3D
            variant="ghost"
            fullWidth
            size="md"
            className="!text-[#FF4B4B]"
            onClick={() => setResetStep(1)}
          >
            <RotateCcw className="w-4 h-4" />
            Reset Semua Data
          </Button3D>
        )}

        {resetStep === 1 && (
          <div className="rounded-[16px] border-2 border-[#FF4B4B]/40 bg-red-50 dark:bg-red-950/30 p-3.5 space-y-2.5">
            <p className="text-xs font-extrabold text-[#C92A2A] dark:text-red-300">
              Langkah 1/2: Semua catatan minum, streak, XP, dan lencana akan dihapus permanen. Lanjutkan?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button3D variant="white" size="sm" onClick={() => setResetStep(0)}>
                Batal
              </Button3D>
              <Button3D variant="coral" size="sm" onClick={() => setResetStep(2)}>
                Ya, Lanjutkan
              </Button3D>
            </div>
          </div>
        )}

        {resetStep === 2 && (
          <div className="rounded-[16px] border-2 border-[#FF4B4B] bg-red-50 dark:bg-red-950/40 p-3.5 space-y-2.5">
            <p className="text-xs font-extrabold text-[#C92A2A] dark:text-red-200">
              Langkah 2/2 (Terakhir): Yakin ingin menghapus seluruh data Tetes sekarang?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button3D variant="white" size="sm" onClick={() => setResetStep(0)}>
                Batal
              </Button3D>
              <Button3D
                variant="coral"
                size="sm"
                onClick={() => {
                  setResetStep(0);
                  resetAllData();
                }}
              >
                Hapus Permanen
              </Button3D>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
