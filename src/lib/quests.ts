import { QuestsState, WaterLog } from './types';
import { getLocalDateKey } from './storage';
import { getLogsForDate, getTotalMlForDate } from './hydration';

export interface QuestDefinition {
  id: string;
  title: string;
  target: number;
  unit: string;
  rewardXp: number;
  rewardFreeze?: number;
}

export const DAILY_QUEST_DEFS: QuestDefinition[] = [
  {
    id: 'morning_3',
    title: 'Minum 3 kali sebelum jam 12',
    target: 3,
    unit: 'kali',
    rewardXp: 20,
  },
  {
    id: 'goal_100',
    title: 'Capai 100% target hari ini',
    target: 1,
    unit: 'target',
    rewardXp: 30,
  },
  {
    id: 'afternoon_500',
    title: 'Minum 500 ml setelah jam 14',
    target: 500,
    unit: 'ml',
    rewardXp: 25,
    rewardFreeze: 1,
  },
];

export function computeQuestsForToday(
  existing: QuestsState,
  logs: WaterLog[],
  goalMl: number,
  todayKey: string = getLocalDateKey()
): QuestsState {
  const isNewDay = existing.date !== todayKey;
  const todayLogs = getLogsForDate(logs, todayKey);
  const totalToday = getTotalMlForDate(logs, todayKey);

  const morningCount = todayLogs.filter((l) => {
    const hour = new Date(l.ts).getHours();
    return hour < 12;
  }).length;

  const afternoonMl = todayLogs
    .filter((l) => {
      const hour = new Date(l.ts).getHours();
      return hour >= 14;
    })
    .reduce((sum, l) => sum + l.ml, 0);

  const progressMap: Record<string, number> = {
    morning_3: Math.min(3, morningCount),
    goal_100: totalToday >= goalMl ? 1 : 0,
    afternoon_500: Math.min(500, afternoonMl),
  };

  return {
    date: todayKey,
    items: DAILY_QUEST_DEFS.map((def) => {
      const prev = isNewDay
        ? undefined
        : existing.items.find((item) => item.id === def.id);
      return {
        id: def.id,
        progress: progressMap[def.id] ?? 0,
        claimed: prev ? prev.claimed : false,
      };
    }),
  };
}
