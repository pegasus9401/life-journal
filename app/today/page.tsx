import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { QuickAdd } from "@/features/calendar/components/quick-add";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import { getUpcoming } from "@/features/calendar/queries";
import { getNutritionDay } from "@/features/nutrition/queries";
import { getProfileSettings } from "@/features/profile/queries";
import { TodayDashboard } from "@/features/today/components/today-dashboard";
import type { TodayDashboardData } from "@/features/today/types";
import { getDailyWellness } from "@/features/wellness/queries";
import { wellnessScores } from "@/features/wellness/types";
import { getWorkoutDay } from "@/features/workouts/queries";

export const metadata = { title: "Днес · PEGASOS" };

export default async function TodayPage() {
  const today = localDateKey();
  const [calendar, nutrition, workouts, profile, wellness] = await Promise.all([
    getUpcoming(today, 8), getNutritionDay(today), getWorkoutDay(today), getProfileSettings(), getDailyWellness(today),
  ]);
  if (!calendar || !nutrition || !workouts || !profile) redirect("/login");

  const todayItems = calendar.items.filter((item) => item.date <= today && (item.endDate ?? item.date) >= today);
  const totals = nutrition.entries.reduce((sum, entry) => ({
    calories: sum.calories + Number(entry.calories), protein: sum.protein + Number(entry.protein_g),
    carbs: sum.carbs + Number(entry.carbs_g), fat: sum.fat + Number(entry.fat_g),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const goals = profile.goals;
  const data: TodayDashboardData = {
    date: today, displayName: profile.profile?.display_name ?? null, wellness: wellnessScores(wellness, workouts.length),
    nutrition: { ...totals, calorieGoal: goals.calorie_goal, proteinGoal: goals.protein_goal_g, carbsGoal: goals.carbs_goal_g, fatGoal: goals.fat_goal_g, nextMeal: null },
    workouts, plannerItems: todayItems, currentWeight: profile.profile?.current_weight_kg ?? null,
  };

  return <main className="life-app-shell p2-shell"><AppNavigation active="today"/><TodayDashboard data={data}/><QuickAdd defaultDate={today}/></main>;
}
