export type DailyWellness = {
  entry_date: string;
  sleep_hours: number;
  sleep_quality: number;
  energy: number;
  soreness: number;
  stress: number;
  resting_heart_rate: number | null;
  notes: string | null;
};

export type WellnessScores = { recovery: number; sleep: number; energy: number; strain: number };

export function wellnessScores(value: DailyWellness | null, workoutCount = 0): WellnessScores {
  if (!value) return { recovery: 0, sleep: 0, energy: 0, strain: Math.min(100, workoutCount * 24) };
  const sleep = Math.round(Math.min(100, (value.sleep_hours / 8) * 70 + value.sleep_quality * 6));
  const energy = value.energy * 20;
  const recovery = Math.round(Math.max(0, Math.min(100, sleep * .45 + energy * .3 + (6 - value.soreness) * 5 + (6 - value.stress) * 5)));
  return { recovery, sleep, energy, strain: Math.min(100, workoutCount * 24 + value.soreness * 5) };
}

