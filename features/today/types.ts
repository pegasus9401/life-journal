import type { CalendarItem } from "@/features/calendar/types";
import type { WorkoutSession } from "@/features/workouts/types";
import type { WellnessScores } from "@/features/wellness/types";

export type TimelineCategory = "food" | "workout" | "journal" | "tasks" | "events" | "health";
export type TimelineStatus = "planned" | "in_progress" | "completed" | "missed" | "skipped";
export type TimelineCompletion = { kind: "task" | "workout" | "meal"; sourceId: string };
export type TimelineItem = {
  id: string; category: TimelineCategory; title: string; detail?: string; meta?: string;
  time?: string; sortAt: string; status: TimelineStatus; href: string; icon: string;
  completion?: TimelineCompletion;
};

export type TodayNutrition = {
  calories: number; protein: number; carbs: number; fat: number;
  calorieGoal: number; proteinGoal: number; carbsGoal: number; fatGoal: number;
  nextMeal: string | null;
};

export type TodayDashboardData = {
  date: string;
  displayName: string | null;
  wellness: WellnessScores;
  nutrition: TodayNutrition;
  workouts: WorkoutSession[];
  plannerItems: CalendarItem[];
  currentWeight: number | null;
  timeline: TimelineItem[];
  isToday: boolean;
};
