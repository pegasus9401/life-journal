import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { NutritionDashboard } from "@/features/nutrition/components/nutrition-dashboard";
import { getDynamicNutritionDay } from "@/features/nutrition/dynamic-queries";
import { getNutritionDay } from "@/features/nutrition/queries";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import { getWorkoutDay } from "@/features/workouts/queries";
import { workoutStatus } from "@/features/workouts/domain/fitness-analytics";
import { bestPromotions, getPromotions } from "@/lib/promotions";

export const metadata = { title: "Хранене · PEGASOS" };

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ date?: string; add?: string }> }) {
  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : localDateKey();
  const [data, nutrition, workouts, offers] = await Promise.all([
    getDynamicNutritionDay(date),
    getNutritionDay(date),
    getWorkoutDay(date),
    getPromotions(),
  ]);
  if (!data || !nutrition || !workouts) redirect("/login");

  const promotionMap = new Map<string, (typeof offers)[number]>();
  for (const label of data.meals.flatMap((meal) => meal.items.map((item) => item.label))) {
    for (const offer of bestPromotions(label, offers, 2)) promotionMap.set(offer.id, offer);
  }
  const promotions = [...promotionMap.values()].sort((a, b) => a.store.localeCompare(b.store, "bg") || a.price - b.price).slice(0, 12);
  const completed = workouts.filter((workout) => workoutStatus(workout) === "completed");
  const dayContext = completed.some((workout) => workout.workout_type === "cardio")
    ? "Cardio ден"
    : workouts.length ? "Тренировъчен ден" : "Почивен ден";

  return <main className="life-app-shell p2-shell">
    <AppNavigation active="nutrition" captureDate={date}/>
    <NutritionDashboard
      date={date}
      data={data}
      goals={nutrition.goals}
      promotions={promotions}
      dayContext={dayContext}
      workoutLabel={workouts.map((workout) => workout.title).join(" · ")}
      openNew={params.add === "meal"}
    />
  </main>;
}
