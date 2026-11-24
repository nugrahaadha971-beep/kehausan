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
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplet,
  Flame,
  GlassWater,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { MyDropi } from '../components/MyDropi';
import { SpeechBubble } from '../components/SpeechBubble';
import { useTetes } from '../state/TetesContext';
import { getLocalDateKey } from '../lib/storage';
import {
  analyzeDrySpellWindow,
  getLogEffectiveMl,
  getLogsForDate,
  getTotalMlForDate,
  getWeeklyDrinkDistribution,
} from '../lib/hydration';
import { DrinkType } from '../lib/types';
import { soundEngine } from '../lib/sound';

const SHORT_DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const FULL_DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
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

const DRINK_BAR_COLORS: Record<DrinkType, { bar: string; dot: string; text: string }> = {
  water: {
    bar: 'bg-[#1CB0F6]',
    dot: 'bg-[#1CB0F6]',
    text: 'text-[#0284C7] dark:text-[#4CC5FF]',
  },
  electrolyte: {
    bar: 'bg-[#10B981]',
    dot: 'bg-[#10B981]',
    text: 'text-[#059669] dark:text-[#34D399]',
  },
  coffee_tea: {
    bar: 'bg-[#F59E0B]',
    dot: 'bg-[#F59E0B]',
    text: 'text-[#D97706] dark:text-[#FBBF24]',
  },
  sweet: {
    bar: 'bg-[#EC4899]',
    dot: 'bg-[#EC4899]',
    text: 'text-[#DB2777] dark:text-[#F472B6]',
  },
};

export const Stats: React.FC = () => {
  const { data, dailyTargetMl, todayKey } = useTetes();
  const [range, setRange] = useState<'week' | 'month'>('week');

  const now = useMemo(() => new Date(), []);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  const goalMl = data.profile.goalMl;

  // Bulan yang sedang ditampilkan pada kalender heatmap
  const viewedMonthDate = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1),
    [now, calendarMonthOffset]
  );

  // Data grafik Recharts (7 hari atau 30 hari terakhir)
  const chartData = useMemo(() => {
    const count = range === 'week' ? 7 : 30;
    const items: { label: string; dateKey: string; ml: number; reached: boolean }[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = getLocalDateKey(dt);
      const ml = getTotalMlForDate(data.logs, key);
      const targetForDay = key === todayKey ? dailyTargetMl : goalMl;
      const label =
        range === 'week'
          ? SHORT_DAYS_ID[dt.getDay()]
          : `${dt.getDate()}`;
      items.push({
        label,
        dateKey: key,
        ml,
        reached: targetForDay > 0 && ml >= targetForDay,
      });
    }
    return items;
  }, [range, data.logs, goalMl, dailyTargetMl, todayKey, now]);

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
      const eff = getLogEffectiveMl(l);
      dayMap.set(k, (dayMap.get(k) || 0) + eff);
      if (dt.getFullYear() === year && dt.getMonth() === month) {
        monthTotal += eff;
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

  // Kalender Heatmap Hidrasi Bulanan
  const calendarDays = useMemo(() => {
    const year = viewedMonthDate.getFullYear();
    const month = viewedMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Senin = 0 .. Minggu = 6
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const cells: (null | {
      day: number;
      dateKey: string;
      ml: number;
      logCount: number;
      targetMl: number;
      pct: number;
      reached: boolean;
      isToday: boolean;
      isFuture: boolean;
    })[] = [];

    for (let i = 0; i < startOffset; i++) cells.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const key = getLocalDateKey(dt);
      const dayLogs = getLogsForDate(data.logs, key);
      const ml = dayLogs.reduce((acc, item) => acc + getLogEffectiveMl(item), 0);
      const targetMl = key === todayKey ? dailyTargetMl : goalMl;
      const pct = targetMl > 0 ? Math.round((ml / targetMl) * 100) : 0;
      const isFuture = key > todayKey;

      cells.push({
        day: d,
        dateKey: key,
        ml,
        logCount: dayLogs.length,
        targetMl,
        pct,
        reached: targetMl > 0 && ml >= targetMl,
        isToday: key === todayKey,
        isFuture,
      });
    }

    return cells;
  }, [data.logs, goalMl, dailyTargetMl, todayKey, viewedMonthDate]);

  // Detail tanggal terpilih pada kalender
  const selectedDayDetail = useMemo(() => {
    if (!selectedDateKey) return null;
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d);
    const dayLogs = getLogsForDate(data.logs, selectedDateKey);
    const effectiveMl = dayLogs.reduce((acc, item) => acc + getLogEffectiveMl(item), 0);
    const targetMl = selectedDateKey === todayKey ? dailyTargetMl : goalMl;
    const pct = targetMl > 0 ? Math.round((effectiveMl / targetMl) * 100) : 0;
    const reached = targetMl > 0 && effectiveMl >= targetMl;
    const dateLabel = `${FULL_DAYS_ID[dt.getDay()]}, ${d} ${MONTHS_ID[m - 1]} ${y}`;

    return {
      dateKey: selectedDateKey,
      dateLabel,
      effectiveMl,
      logCount: dayLogs.length,
      targetMl,
      pct,
      reached,
    };
  }, [selectedDateKey, data.logs, todayKey, dailyTargetMl, goalMl]);

  // Insight Jam Rawan Dehidrasi (7 hari terakhir, 07.00 - 21.00)
  const drySpellInsight = useMemo(
    () => analyzeDrySpellWindow(data.logs, now),
    [data.logs, now]
  );

  // Distribusi Jenis Minuman 7 Hari Terakhir
  const weeklyDistribution = useMemo(
    () => getWeeklyDrinkDistribution(data.logs, now),
    [data.logs, now]
  );

  // Wawasan umum Dropi
  const insightText = useMemo(() => {
    if (data.logs.length === 0) {
      return 'Mulai catat tegukan pertamamu hari ini agar aku bisa membaca pola minummu!';
    }
    let morning = 0;
    let afternoon = 0;
    let evening = 0;
    for (const l of data.logs) {
      const h = new Date(l.ts).getHours();
      const eff = getLogEffectiveMl(l);
      if (h < 12) morning += eff;
      else if (h < 18) afternoon += eff;
      else evening += eff;
    }

    if (morning >= afternoon && morning >= evening) {
      return 'Kamu paling rajin minum di pagi hari. Kebiasaan pagi yang luar biasa!';
    }
    if (afternoon >= morning && afternoon >= evening) {
      return 'Kamu paling rajin minum di sore hari. Coba tambah segelas lagi di pagi hari ya!';
    }
    return 'Kamu sering mengejar minum di malam hari. Coba cicil lebih awal supaya tidur makin nyenyak!';
  }, [data.logs]);

  const handleChangeMonth = (delta: number) => {
    soundEngine.play('click', data.settings.sound);
    const nextOffset = calendarMonthOffset + delta;
    setCalendarMonthOffset(nextOffset);
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + nextOffset, 1);
    if (nextOffset === 0) {
      setSelectedDateKey(todayKey);
    } else {
      setSelectedDateKey(getLocalDateKey(targetMonth));
    }
  };

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

      {/* Kalender Heatmap Hidrasi Bulanan */}
      <div className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-4 mb-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarIcon className="w-4 h-4 text-[#1CB0F6] shrink-0" />
            <h2 className="font-display text-base font-extrabold text-[#3C3C3C] dark:text-white truncate">
              {MONTHS_ID[viewedMonthDate.getMonth()]} {viewedMonthDate.getFullYear()}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label="Bulan sebelumnya"
              onClick={() => handleChangeMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5E5E5] dark:border-slate-600 bg-[#F8FAFC] dark:bg-slate-700 text-[#3C3C3C] dark:text-slate-200 hover:bg-[#EEF5FA] dark:hover:bg-slate-600 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Bulan berikutnya"
              disabled={calendarMonthOffset >= 0}
              onClick={() => handleChangeMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5E5E5] dark:border-slate-600 bg-[#F8FAFC] dark:bg-slate-700 text-[#3C3C3C] dark:text-slate-200 hover:bg-[#EEF5FA] dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-extrabold text-[#777777] dark:text-slate-400 mb-2">
          <span>Sen</span>
          <span>Sel</span>
          <span>Rab</span>
          <span>Kam</span>
          <span>Jum</span>
          <span>Sab</span>
          <span>Min</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((cell, idx) => {
            if (!cell) return <div key={`empty-${idx}`} />;

            const isSelected = selectedDateKey === cell.dateKey;
            let toneClass =
              'bg-[#F1F5F9] dark:bg-slate-700/60 text-[#64748B] dark:text-slate-400';

            if (cell.pct >= 100) {
              toneClass =
                'bg-[#1CB0F6] text-white shadow-[0_2px_0_0_#148DC7]';
            } else if (cell.pct >= 50) {
              toneClass =
                'bg-[#7AD4FF] dark:bg-[#0284C7] text-[#083B5E] dark:text-white';
            } else if (cell.pct >= 1) {
              toneClass =
                'bg-[#DFF4FF] dark:bg-[#0E3A5C] text-[#0369A1] dark:text-[#7DD3FC]';
            }

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => {
                  soundEngine.play('click', data.settings.sound);
                  setSelectedDateKey(cell.dateKey);
                }}
                aria-label={`${cell.day} ${MONTHS_ID[viewedMonthDate.getMonth()]}: ${cell.ml} ml (${cell.pct}%)`}
                aria-pressed={isSelected}
                className={`relative flex h-10 w-full items-center justify-center rounded-xl text-xs font-extrabold tabular-nums transition-transform active:scale-95 cursor-pointer ${toneClass} ${
                  isSelected
                    ? 'ring-2 ring-[#FF9600] ring-offset-2 ring-offset-white dark:ring-offset-slate-800'
                    : cell.isToday
                      ? 'ring-2 ring-[#1CB0F6]/60'
                      : ''
                } ${cell.isFuture ? 'opacity-50' : ''}`}
              >
                <span>{cell.day}</span>
                {cell.pct >= 100 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#58CC02] text-white shadow-sm"
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda Heatmap */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-[#777777] dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-[#F1F5F9] dark:bg-slate-700 border border-[#E2E8F0] dark:border-slate-600" />
            0%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-[#DFF4FF] dark:bg-[#0E3A5C]" />
            1–49%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-[#7AD4FF] dark:bg-[#0284C7]" />
            50–99%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex h-3 w-3 items-center justify-center rounded bg-[#1CB0F6] text-white">
              <Sparkles className="w-2 h-2" />
            </span>
            ≥100%
          </span>
        </div>

        {/* Detail Ringkasan Tanggal Terpilih */}
        {selectedDayDetail && (
          <div className="mt-3 rounded-[16px] border border-[#CBEBFF] dark:border-slate-700 bg-[#F4FAFF] dark:bg-slate-900/60 p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-extrabold text-[#3C3C3C] dark:text-white">
                {selectedDayDetail.dateLabel}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  selectedDayDetail.reached
                    ? 'bg-[#E6FAEA] text-[#3E9900] dark:bg-emerald-950/60 dark:text-emerald-300'
                    : selectedDayDetail.effectiveMl > 0
                      ? 'bg-[#DFF4FF] text-[#0284C7] dark:bg-sky-950/60 dark:text-sky-300'
                      : 'bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {selectedDayDetail.reached
                  ? 'Target Tercapai'
                  : selectedDayDetail.effectiveMl > 0
                    ? `${selectedDayDetail.pct}% dari Target`
                    : 'Belum Minum'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-[#64748B] dark:text-slate-300 tabular-nums">
              <span>
                Total efektif:{' '}
                <strong className="text-[#1CB0F6] dark:text-[#4CC5FF]">
                  {selectedDayDetail.effectiveMl.toLocaleString('id-ID')} ml
                </strong>
              </span>
              <span>
                Catatan:{' '}
                <strong className="text-[#3C3C3C] dark:text-white">
                  {selectedDayDetail.logCount} gelas/entri
                </strong>
              </span>
              <span>
                Target:{' '}
                <strong className="text-[#3C3C3C] dark:text-white">
                  {selectedDayDetail.targetMl.toLocaleString('id-ID')} ml
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Distribusi Jenis Minuman Mingguan */}
      <div className="rounded-[20px] border-2 border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GlassWater className="w-4 h-4 text-[#1CB0F6]" />
            <h2 className="font-display text-base font-extrabold text-[#3C3C3C] dark:text-white">
              Distribusi Minuman (7 Hari)
            </h2>
          </div>
          <span className="text-xs font-bold text-[#777777] dark:text-slate-400 tabular-nums">
            {weeklyDistribution.totalRawMl.toLocaleString('id-ID')} ml
          </span>
        </div>

        {weeklyDistribution.totalRawMl === 0 ? (
          <p className="text-xs font-bold text-[#777777] dark:text-slate-400">
            Belum ada catatan minuman dalam 7 hari terakhir. Catat minum pertamamu untuk melihat komposisi minuman!
          </p>
        ) : (
          <>
            {/* Segmented Progress Bar */}
            <div
              className="flex h-4 w-full overflow-hidden rounded-full bg-[#EEF5FA] dark:bg-slate-700 p-0.5 gap-0.5"
              role="img"
              aria-label="Proporsi jenis minuman 7 hari terakhir"
            >
              {weeklyDistribution.items.map((item) => {
                if (item.rawMl <= 0) return null;
                const widthPct = (item.rawMl / weeklyDistribution.totalRawMl) * 100;
                return (
                  <div
                    key={item.id}
                    style={{ width: `${Math.max(4, widthPct)}%` }}
                    title={`${item.label}: ${item.percent}% (${item.rawMl.toLocaleString('id-ID')} ml)`}
                    className={`h-full first:rounded-l-full last:rounded-r-full transition-all ${DRINK_BAR_COLORS[item.id].bar}`}
                  />
                );
              })}
            </div>

            {/* Legenda & Angka Rinci */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {weeklyDistribution.items.map((item) => {
                const style = DRINK_BAR_COLORS[item.id];
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-[#EEF2F6] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-900/50 px-2.5 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${style.dot}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-[#3C3C3C] dark:text-slate-100 truncate">
                          {item.label}
                        </div>
                        <div className="text-[10px] font-bold text-[#777777] dark:text-slate-400 tabular-nums">
                          {item.rawMl.toLocaleString('id-ID')} ml
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-extrabold tabular-nums shrink-0 ${style.text}`}>
                      {item.percent}%
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Insight Jam Rawan Dehidrasi (Wawasan Pola Minum) */}
      <div className="rounded-[20px] border-2 border-[#FFE3B3] dark:border-amber-900/50 bg-[#FFF9ED] dark:bg-amber-950/25 p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FF9600] text-white shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-extrabold text-[#9A4E00] dark:text-amber-300">
                Wawasan Pola Minum
              </h2>
              {drySpellInsight && (
                <span className="rounded-full bg-[#FFE9C2] dark:bg-amber-900/60 px-2 py-0.5 text-[10px] font-extrabold text-[#9A4E00] dark:text-amber-200 tabular-nums shrink-0">
                  {drySpellInsight.label}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs font-bold leading-relaxed text-[#7A4408] dark:text-amber-100/90">
              {drySpellInsight
                ? drySpellInsight.message
                : 'Catat minumanmu selama beberapa hari agar Dropi dapat mendeteksi jam rawan dehidrasi antara pukul 07.00 – 21.00.'}
            </p>
          </div>
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

