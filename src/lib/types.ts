export type ActivityLevel = 'santai' | 'sedang' | 'aktif';

export type HydrationReason =
  | 'energi'
  | 'kulit'
  | 'fokus'
  | 'olahraga'
  | 'kesehatan';

export type DropiColorId =
  | 'blue'
  | 'teal'
  | 'green'
  | 'purple'
  | 'yellow'
  | 'pink';

export type DropiAccessoryId = 'none' | 'hat' | 'glasses' | 'crown';

export type DropiMood =
  | 'happy'
  | 'cheer'
  | 'celebrate'
  | 'thirsty'
  | 'sleepy'
  | 'sad'
  | 'wow'
  | 'drinking';

export type TabId = 'home' | 'stats' | 'achievements' | 'profile';

export type ScreenMode = 'splash' | 'onboarding' | 'app' | 'celebration' | 'streak';

export type AchievementTier = 'none' | 'bronze' | 'silver' | 'gold';

export interface Profile {
  name: string;
  weightKg: number;
  activity: ActivityLevel;
  wakeTime: string; // HH:mm
  sleepTime: string; // HH:mm
  cupMl: number;
  goalMl: number;
  reason: HydrationReason;
  dropiColor: DropiColorId;
  dropiAccessory: DropiAccessoryId;
  onboarded: boolean;
}

export interface WaterLog {
  id: string;
  ts: string; // ISO string
  ml: number;
}

export interface ProgressState {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  freezes: number;
  lastGoalDate: string | null; // YYYY-MM-DD local
  lastFreezeUsedDate?: string | null;
  prevStreakBeforeToday?: number;
  prevGoalDateBeforeToday?: string | null;
}

export interface AchievementRecord {
  unlockedAt: string; // ISO
  tier: Exclude<AchievementTier, 'none'>;
}

export interface QuestProgressItem {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface QuestsState {
  date: string; // YYYY-MM-DD local
  items: QuestProgressItem[];
}

export interface SettingsState {
  sound: boolean;
  haptics: boolean;
  dark: boolean;
  reminderMinutes: 60 | 90 | 120;
  notifications: boolean;
}

export interface TetesData {
  version: number;
  profile: Profile;
  logs: WaterLog[];
  progress: ProgressState;
  achievements: Record<string, AchievementRecord | undefined>;
  quests: QuestsState;
  settings: SettingsState;
}
