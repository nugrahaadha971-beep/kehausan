import type { DropiMood } from '../components/DropiMascot';

interface MoodInput {
  /** terminum / target, 0..1 (boleh lebih dari 1, akan dibatasi) */
  progress: number;
  /** jam sekarang 0-23 */
  hour: number;
  wakeHour: number;
  sleepHour: number;
  /** menit sejak minum terakhir; bila belum minum hari ini, hitung sejak jam bangun */
  minutesSinceLastDrink: number;
  /** true selama sekitar 1.6 detik setelah mencatat minum */
  justDrank: boolean;
}

export function getDropiMood(i: MoodInput): DropiMood {
  if (i.justDrank) return 'drinking';
  if (i.progress >= 1) return 'celebrate';

  // Di luar jam aktif (mendukung jam tidur lewat tengah malam)
  const awake =
    i.wakeHour < i.sleepHour
      ? i.hour >= i.wakeHour && i.hour < i.sleepHour
      : i.hour >= i.wakeHour || i.hour < i.sleepHour;
  if (!awake) return 'sleepy';

  if (i.minutesSinceLastDrink > 120) return 'thirsty';
  return 'happy';
}
