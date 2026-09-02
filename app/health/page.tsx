import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import { getDynamicNutritionTimelineDay } from "@/features/nutrition/dynamic-queries";
import { mealCompleted, mealTotals } from "@/features/nutrition/dynamic-types";
import { getNutritionEntriesDay } from "@/features/nutrition/queries";
import { getProfileSettings } from "@/features/profile/queries";
import { getDailyWellness } from "@/features/wellness/queries";
import { WellnessDashboard } from "@/features/wellness/components/wellness-dashboard";
import { getWorkoutDay } from "@/features/workouts/queries";
import { workoutStatus } from "@/features/workouts/domain/fitness-analytics";

export const metadata = { title: "Здраве · PEGASOS" };

export default async function HealthPage() {
  const date = localDateKey();
  const [wellness, nutritionEntries, dynamicMeals, workouts, profile] = await Promise.all([
    getDailyWellness(date),
    getNutritionEntriesDay(date),
    getDynamicNutritionTimelineDay(date),
    getWorkoutDay(date),
    getProfileSettings(),
  ]);
  if (!nutritionEntries || !dynamicMeals || !workouts || !profile) redirect("/login");

  const legacyTotals = nutritionEntries.reduce((sum, entry) => ({
    calories: sum.calories + Number(entry.calories),
    protein: sum.protein + Number(entry.protein_g),
  }), { calories: 0, protein: 0 });
  const dynamicTotals = dynamicMeals.filter(mealCompleted).reduce((sum, meal) => {
    const value = mealTotals(meal);
    return { calories: sum.calories + value.calories, protein: sum.protein + value.protein };
  }, { calories: 0, protein: 0 });
  const totals = dynamicMeals.length ? dynamicTotals : legacyTotals;
  const activeWorkouts = workouts.filter((workout) => workoutStatus(workout) !== "cancelled");

  return <main className="life-app-shell p2-shell">
    <AppNavigation active="health" captureDate={date} />
    <WellnessDashboard
      date={date}
      value={wellness}
      displayName={profile.profile?.display_name ?? null}
      workoutCount={activeWorkouts.length}
      workoutMinutes={activeWorkouts.reduce((sum, workout) => sum + Number(workout.duration_minutes || 0), 0)}
      calories={totals.calories}
      calorieGoal={profile.goals.calorie_goal}
      protein={totals.protein}
      proteinGoal={profile.goals.protein_goal_g}
      currentWeight={profile.profile?.current_weight_kg ?? null}
      targetWeight={profile.profile?.target_weight_kg ?? null}
    />
  </main>;
}
