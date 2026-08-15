export const WORKOUT_DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export type WorkoutDayKey = (typeof WORKOUT_DAY_KEYS)[number];

export type WorkoutCalendarTemplate = {
  id: string;
  name: string;
  durationMinutes: number;
  days: WorkoutDayKey[];
  exerciseCount: number;
};

const DEFAULT_FULL_BODY: WorkoutCalendarTemplate = {
  id: "full-body",
  name: "Full Body - Цяло тяло",
  durationMinutes: 60,
  days: ["monday", "wednesday", "friday"],
  exerciseCount: 10,
};

export function normalizeWorkoutCalendarTemplates(raw: unknown): WorkoutCalendarTemplate[] {
  if (!Array.isArray(raw)) return [DEFAULT_FULL_BODY];

  return raw.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    const days = Array.isArray(value.days)
      ? value.days.filter((day): day is WorkoutDayKey => WORKOUT_DAY_KEYS.includes(day as WorkoutDayKey))
      : [];

    return [{
      id: typeof value.id === "string" ? value.id : `workout-${index}`,
      name: typeof value.name === "string" && value.name.trim() ? value.name : "Тренировка",
      durationMinutes: Math.max(0, Number(value.durationMinutes) || 0),
      days,
      exerciseCount: Array.isArray(value.exercises) ? value.exercises.length : 0,
    }];
  });
}
