import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import { getUpcoming } from "@/features/calendar/queries";
import { getNutritionEntriesDay } from "@/features/nutrition/queries";
import { getDynamicNutritionTimelineDay } from "@/features/nutrition/dynamic-queries";
import { mealTotals } from "@/features/nutrition/dynamic-types";
import { getProfileSettings } from "@/features/profile/queries";
import { TodayDayView } from "@/features/today/components/today-day-view";
import type { TodayDashboardData } from "@/features/today/types";
import { buildTimeline } from "@/features/today/domain/timeline";
import { getJournalDay } from "@/features/travel/journal/queries";
import { getDailyWellness } from "@/features/wellness/queries";
import { wellnessScores } from "@/features/wellness/types";

export const metadata = { title: "Днес · PEGASOS" };

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const today = localDateKey();
  const requested = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : today;
  const selected = requested > today ? today : requested;
  const [calendar, nutritionEntries, dynamicMeals, journal, profile, wellness] = await Promise.all([
    getUpcoming(selected, 0), getNutritionEntriesDay(selected), getDynamicNutritionTimelineDay(selected), getJournalDay(selected), getProfileSettings(), getDailyWellness(selected),
  ]);
  if (!calendar || !nutritionEntries || !dynamicMeals || !journal || !profile) redirect("/login");

  const dayItems = calendar.items.filter((item) => item.date <= selected && (item.endDate ?? item.date) >= selected);
  const workouts = calendar.workoutSessions;
  const legacyTotals = nutritionEntries.reduce((sum, entry) => ({
    calories: sum.calories + Number(entry.calories), protein: sum.protein + Number(entry.protein_g),
    carbs: sum.carbs + Number(entry.carbs_g), fat: sum.fat + Number(entry.fat_g),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const dynamicTotals = dynamicMeals.reduce((sum, meal) => { const value = mealTotals(meal); return { calories: sum.calories + value.calories, protein: sum.protein + value.protein, carbs: sum.carbs + value.carbs, fat: sum.fat + value.fat }; }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const totals = dynamicMeals.length ? dynamicTotals : legacyTotals;
  const goals = profile.goals;
  const data: TodayDashboardData = {
    date: selected, isToday: selected === today, displayName: profile.profile?.display_name ?? null, wellness: wellnessScores(wellness, workouts.length),
    nutrition: { ...totals, calorieGoal: goals.calorie_goal, proteinGoal: goals.protein_goal_g, carbsGoal: goals.carbs_goal_g, fatGoal: goals.fat_goal_g, nextMeal: null },
    workouts, plannerItems: dayItems, currentWeight: selected === today ? profile.profile?.current_weight_kg ?? null : null,
    timeline: buildTimeline({ date: selected, today, calendar: dayItems, nutrition: nutritionEntries, meals: dynamicMeals, workouts, journal, wellness }),
  };

  return <main className="life-app-shell p2-shell"><AppNavigation active="today" captureDate={selected}/><TodayDayView data={data} today={today}/></main>;
}
