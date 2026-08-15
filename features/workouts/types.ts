export type WorkoutType = "strength" | "cardio" | "mobility" | "sport" | "other";

export type WorkoutExercise = {
  name: string;
  sets: number;
  reps: string | number;
  weight: number;
  rest_seconds?: number;
  muscle_group?: string;
};

export type WorkoutSession = {
  id: string;
  owner_id: string;
  workout_date: string;
  title: string;
  workout_type: WorkoutType;
  duration_minutes: number;
  calories_burned: number;
  notes: string | null;
  exercises: WorkoutExercise[];
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  strength: "Силова",
  cardio: "Кардио",
  mobility: "Мобилност",
  sport: "Спорт",
  other: "Друга",
};
