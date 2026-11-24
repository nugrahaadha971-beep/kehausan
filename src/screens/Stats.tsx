import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calendar as CalendarIcon, Droplet, Flame, TrendingUp, Trophy } from 'lucide-react';
import { MyDropi } from '../components/MyDropi';
import { SpeechBubble } from '../components/SpeechBubble';
import { useTetes } from '../state/TetesContext';
import { getLocalDateKey } from '../lib/storage';
import { getTotalMlForDate } from '../lib/hydration';
import { soundEngine } from '../lib/sound';

const SHORT_DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const Stats: React.FC = () => {
  const { data } = useTetes();
  const [range, setRange] = useState<'week' | 'month'>('week');

  const now = useMemo(() => new Date(), []);
  const goalMl = data.profile.goalMl;

  // Data grafik Recharts (7 hari atau 30 hari terakhir)
  const chartData = useMemo(() => {
    const count = range === 'week' ? 7 : 30;
    const items: { label: string; dateKey: string; ml: number; reached: boolean }[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = getLocalDateKey(dt);
      const ml = getTotalMlForDate(data.logs, key);
      const label =
        range === 'week'
          ? SHORT_DAYS_ID[dt.getDay()]
          : `${dt.getDate()}`;
      items.push({
        label,
        dateKey: key,
        ml,
        reached: ml >= goalMl,
      });
    }
    return items;
  }, [range, data.logs, goalMl, now]);

  // Ringkasan bulan ini & rata-rata
  const summary = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysSoFar = now.getDate();

    let monthTotal = 0;
    let bestMl = 0;
    let bestDayLabel = '-';

    const dayMap = new Map<string, number>();
    for (const l of data.logs) {
      const dt = new Date(l.ts);
      const k = getLocalDateKey(dt);
      dayMap.set(k, (dayMap.get(k) || 0) + l.ml);
      if (dt.getFullYear() === year && dt.getMonth() === month) {
        monthTotal += l.ml;
      }
    }

    dayMap.forEach((total, k) => {
      if (total > bestMl) {
        bestMl = total;
        const [y, m, d] = k.split('-').map(Number);
        bestDayLabel = `${d} ${MONTHS_ID[(m || 1) - 1]?.slice(0, 3)} ${y}`;
      }
    });

    const activeDayCount = Math.max(1, dayMap.size || daysSoFar);
    const totalAll = Array.from(dayMap.values()).reduce((a, b) => a + b, 0);
    const dailyAvg = dayMap.size > 0 ? Math.round(totalAll / activeDayCount) : 0;

    return {
      dailyAvg,
      bestMl,
      bestDayLabel,
      monthTotal,
      longestStreak: data.progress.longestStreak,
    };
  }, [data.logs, data.progress.longestStreak, now]);

  // Kalender bulan berjalan
  const calendarDays = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Senin = 0 .. Minggu = 6
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const todayKey = getLocalDateKey(now);

    const cells: (null | {
      day: number;
      dateKey: string;
      ml: number;
      pct: number;
      reached: boolean;
      isToday: boolean;
    })[] = [];

    for (let i = 0; i < startOffset; i++) cells.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const key = getLocalDateKey(dt);
      const ml = getTotalMlForDate(data.logs, key);
      const pct = goalMl > 0 ? Math.min(100, Math.round((ml / goalMl) * 100)) : 0;
      cells.push({
        day: d,
        dateKey: key,
        ml,
        pct,
        reached: ml >= goalMl,
        isToday: key === todayKey,
      });
    }

    return cells;
  }, [data.logs, goalMl, now]);

  // Wawasan otomatis dari Dropi
  const insightText = useMemo(() => {
    if (data.logs.length === 0) {
      return 'Mulai catat tegukan pertamamu hari ini agar aku bisa membaca pola minummu!';
    }
    let morning = 0;
    let afternoon = 0;
    let evening = 0;
    for (const l of data.logs) {
      const h = new Date(l.ts).getHours();
      if (h < 12) morning += l.ml;
      else if (h < 18) afternoon += l.ml;
      else evening += l.ml;
    }

    if (morning >= afternoon && morning >= evening) {
      return 'Kamu paling rajin minum di pagi hari. Kebiasaan pagi yang luar biasa!';
    }
    if (afternoon >= morning && afternoon >= evening) {
      return 'Kamu paling rajin minum di sore hari. Coba tambah segelas lagi di pagi hari ya!';
    }
    return 'Kamu sering mengejar minum di malam hari. Coba cicil lebih awal supaya tidur makin nyenyak!';
  }, [data.logs]);

  return (
    <div className="pb-24 px-4 pt-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-extrabold text-[#3C3C3C] dark:text-white">
          Statistik Hidrasi
        </h1>

        {/* Segmented Toggle Minggu | Bulan */}
        <div
          role="tablist"
          aria-label="Rentang waktu statistik"
          className="inline-flex rounded-[14px] bg-[#EEF5FA] dark:bg-slate-800 p-1 border border-[#E5E5E5] dark:border-slate-700"
        >
          {(['week', 'month'] as const).map((tab) => {
            const active = range === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  soundEngine.play('click', data.settings.sound);
                  setRange(tab);
                }}
                className={`min-h-[36px] px-3.5 rounded-[10px] text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-slate-700 text-[#1CB0F6] dark:text-[#4CC5FF] shadow-sm'
                    : 'text-[#777777] dark:text-slate-400'
                }`}
              >
                {tab === 'week' ? 'Minggu' : 'Bulan'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grafik Batang Recharts */}
      <div className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-extrabold text-[#3C3C3C] dark:text-slate-100">
            {range === 'week' ? '7 Hari Terakhir' : '30 Hari Terakhir'}
          </span>
          <span className="text-xs font-bold text-[#777777] dark:text-slate-400 tabular-nums">
            Target: {goalMl.toLocaleString('id-ID')} ml
          </span>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 4, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fontWeight: 700, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                interval={range === 'month' ? 4 : 0}
              />
              <YAxis
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(28, 176, 246, 0.08)' }}
                contentStyle={{
                  borderRadius: '14px',
                  border: '2px solid #E5E5E5',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
                formatter={(value: unknown) => [
                  `${Number(value || 0).toLocaleString('id-ID')} ml`,
                  'Total',
                ]}
              />
              <ReferenceLine
                y={goalMl}
                stroke="#FF9600"
                strokeDasharray="4 4"
                strokeWidth={2}
              />
              <Bar
                dataKey="ml"
                radius={[8, 8, 4, 4]}
                animationDuration={650}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.dateKey}
                    fill={entry.reached ? '#58CC02' : '#7AD4FF'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex items-center justify-center gap-4 text-[11px] font-bold text-[#777777] dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#58CC02]" />
            Capai target
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#7AD4FF]" />
            Di bawah target
          </span>
        </div>
      </div>

      {/* 4 Kartu Ringkasan */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#777777] dark:text-slate-400">
            <TrendingUp className="w-4 h-4 text-[#1CB0F6]" />
            Rata-rata Harian
          </div>
          <div className="mt-1 font-display text-xl font-extrabold text-[#3C3C3C] dark:text-white tabular-nums">
            {summary.dailyAvg.toLocaleString('id-ID')} ml
          </div>
        </div>

        <div className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#777777] dark:text-slate-400">
            <Trophy className="w-4 h-4 text-[#FFC800]" />
            Hari Terbaik
          </div>
          <div className="mt-1 font-display text-xl font-extrabold text-[#3C3C3C] dark:text-white tabular-nums">
            {summary.bestMl.toLocaleString('id-ID')} ml
          </div>
          <div className="text-[11px] font-bold text-[#777777] dark:text-slate-400">
            {summary.bestDayLabel}
          </div>
        </div>

        <div className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#777777] dark:text-slate-400">
            <Droplet className="w-4 h-4 text-[#58CC02]" />
            Total Bulan Ini
          </div>
          <div className="mt-1 font-display text-xl font-extrabold text-[#3C3C3C] dark:text-white tabular-nums">
            {(summary.monthTotal / 1000).toFixed(1)} L
          </div>
        </div>

        <div className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#777777] dark:text-slate-400">
            <Flame className="w-4 h-4 text-[#FF9600]" />
            Streak Terpanjang
          </div>
          <div className="mt-1 font-display text-xl font-extrabold text-[#3C3C3C] dark:text-white tabular-nums">
            {summary.longestStreak} hari
          </div>
        </div>
      </div>

      {/* Kalender Bulanan */}
      <div className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#1CB0F6]" />
            <h2 className="font-display text-base font-extrabold text-[#3C3C3C] dark:text-white">
              {MONTHS_ID[now.getMonth()]} {now.getFullYear()}
            </h2>
          </div>
          <span className="text-[11px] font-bold text-[#777777] dark:text-slate-400">
            Cincin Progres
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-[#777777] dark:text-slate-400 mb-2">
          <span>Sen</span>
          <span>Sel</span>
          <span>Rab</span>
          <span>Kam</span>
          <span>Jum</span>
          <span>Sab</span>
          <span>Min</span>
        </div>

        <div className="grid grid-cols-7 gap-y-2 gap-x-1">
          {calendarDays.map((cell, idx) => {
            if (!cell) return <div key={`empty-${idx}`} />;
            const ringColor = cell.reached ? '#58CC02' : '#1CB0F6';
            const ringBg =
              cell.pct > 0
                ? `conic-gradient(${ringColor} ${cell.pct * 3.6}deg, rgba(148, 163, 184, 0.25) 0deg)`
                : 'rgba(148, 163, 184, 0.25)';

            return (
              <div
                key={cell.dateKey}
                title={`${cell.dateKey}: ${cell.ml} ml (${cell.pct}%)`}
                className="flex flex-col items-center justify-center"
              >
                <div
                  style={{ background: ringBg }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full p-[3px]"
                >
                  <div
                    className={`flex h-full w-full items-center justify-center rounded-full ${
                      cell.isToday
                        ? 'bg-[#DDF4FF] dark:bg-[#0C2D48]'
                        : 'bg-white dark:bg-slate-800'
                    }`}
                  >
                    {cell.reached ? (
                      <Droplet className="w-3.5 h-3.5 fill-[#1CB0F6] text-[#1CB0F6]" />
                    ) : (
                      <span className="text-[11px] font-extrabold text-[#3C3C3C] dark:text-slate-200 tabular-nums">
                        {cell.day}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wawasan Dropi */}
      <div className="flex items-center gap-3 rounded-[20px] border-2 border-[#BCE8FF] dark:border-slate-700 bg-[#F2FAFF] dark:bg-slate-800/80 p-3.5">
        <div className="shrink-0">
          <MyDropi mood="happy" size={64} />
        </div>
        <SpeechBubble text={insightText} tailSide="left" className="flex-1" />
      </div>
    </div>
  );
};
