import {
  ActivityLevel,
  DropiAccessoryId,
  DropiColorId,
  HydrationReason,
  WaterLog,
} from './types';
import { getLocalDateKey } from './storage';

export function calculateRecommendedGoal(
  weightKg: number,
  activity: ActivityLevel
): number {
  const safeWeight = Math.max(30, Math.min(180, weightKg || 60));
  const activityBonus =
    activity === 'santai' ? 0 : activity === 'sedang' ? 300 : 600;
  const raw = safeWeight * 35 + activityBonus;
  const rounded = Math.round(raw / 50) * 50;
  return Math.max(1500, Math.min(4000, rounded));
}

export function calculateLevel(xp: number): number {
  return Math.floor(Math.max(0, xp) / 100) + 1;
}

export function getXpProgressInLevel(xp: number): {
  level: number;
  current: number;
  needed: number;
  percent: number;
} {
  const safeXp = Math.max(0, xp);
  const level = calculateLevel(safeXp);
  const current = safeXp % 100;
  return {
    level,
    current,
    needed: 100,
    percent: current,
  };
}

export function getLogsForDate(logs: WaterLog[], dateKey: string): WaterLog[] {
  return logs.filter((log) => getLocalDateKey(new Date(log.ts)) === dateKey);
}

export function getTotalMlForDate(logs: WaterLog[], dateKey: string): number {
  return getLogsForDate(logs, dateKey).reduce((sum, l) => sum + l.ml, 0);
}

export function getTotalMlAllTime(logs: WaterLog[]): number {
  return logs.reduce((sum, l) => sum + l.ml, 0);
}

export function getMinutesSinceLastLog(
  logs: WaterLog[],
  now: Date = new Date()
): number | null {
  if (logs.length === 0) return null;
  const sorted = [...logs].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );
  const diffMs = now.getTime() - new Date(sorted[0].ts).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

export function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const REASON_OPTIONS: {
  id: HydrationReason;
  label: string;
  desc: string;
}[] = [
  { id: 'energi', label: 'Lebih berenergi', desc: 'Anti lemas sepanjang hari' },
  { id: 'kulit', label: 'Kulit sehat & cerah', desc: 'Terhidrasi dari dalam' },
  { id: 'fokus', label: 'Fokus belajar & kerja', desc: 'Otak segar, kerja lancar' },
  { id: 'olahraga', label: 'Dukung olahraga', desc: 'Pemulihan cairan tubuh' },
  { id: 'kesehatan', label: 'Kesehatan umum', desc: 'Bangun kebiasaan baik' },
];

export const CUP_PRESETS = [
  { ml: 150, label: 'Cangkir Kecil' },
  { ml: 250, label: 'Gelas Standar' },
  { ml: 350, label: 'Gelas Besar' },
  { ml: 500, label: 'Botol Tumbler' },
];

export const DROPI_COLOR_UNLOCK_LEVELS: Record<DropiColorId, number> = {
  blue: 1,
  teal: 2,
  green: 3,
  purple: 5,
  yellow: 7,
  pink: 10,
};

export const DROPI_ACCESSORY_UNLOCK_LEVELS: Record<DropiAccessoryId, number> = {
  none: 1,
  hat: 2,
  glasses: 4,
  crown: 6,
};
