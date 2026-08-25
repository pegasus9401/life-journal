import type { CalendarItem } from "@/features/calendar/types";
import type { WorkoutSession } from "@/features/workouts/types";
import type { WellnessScores } from "@/features/wellness/types";

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
};
