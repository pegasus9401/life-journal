export type WorkoutType = "strength" | "cardio" | "mobility" | "sport" | "other";
export type WorkoutStatus = "planned" | "in_progress" | "completed" | "skipped" | "cancelled";

export type WorkoutExercise = {
  name: string;
  sets: number;
  reps: string | number;
  weight: number;
  rest_seconds?: number;
  muscle_group?: string;
  set_results?: { set: number; reps: number; weight: number }[];
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
  status?: WorkoutStatus;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  skipped_at?: string | null;
  source?: string;
  workout_template_id?: string | null;
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
