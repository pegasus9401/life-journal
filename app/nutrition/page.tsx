import { redirect } from "next/navigation";
import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";
import { DynamicNutritionPlanner } from "@/features/nutrition/components/dynamic-nutrition-planner";
import { getDynamicNutritionDay } from "@/features/nutrition/dynamic-queries";
import { getNutritionDay } from "@/features/nutrition/queries";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import { getWorkoutDay } from "@/features/workouts/queries";
import { workoutStatus } from "@/features/workouts/domain/fitness-analytics";
import { bestPromotions, getPromotions } from "@/lib/promotions";

export const metadata = { title: "Хранене · Дневник на живота" };

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ date?: string; add?: string }> }) {
  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : localDateKey();
  const [data, nutrition, workouts, offers] = await Promise.all([getDynamicNutritionDay(date), getNutritionDay(date), getWorkoutDay(date), getPromotions()]);
  if (!data || !nutrition || !workouts) redirect("/login");
  const promotionMap = new Map<string, (typeof offers)[number]>();
  for (const label of data.meals.flatMap((meal) => meal.items.map((item) => item.label))) for (const offer of bestPromotions(label, offers, 2)) promotionMap.set(offer.id, offer);
  const promotions = [...promotionMap.values()].sort((a, b) => a.store.localeCompare(b.store, "bg") || a.price - b.price).slice(0, 12);
  const completed = workouts.filter((workout) => workoutStatus(workout) === "completed");
  const dayContext = completed.some((workout) => workout.workout_type === "cardio") ? "Cardio ден" : workouts.length ? "Тренировъчен ден" : "Почивен ден";
  return <main className="life-app-shell">
    <AppNavigation active="nutrition" captureDate={date} />
    <header className="nutrition-header"><div><p className="life-kicker">Моят режим · {dayContext}</p><h1>Хранене</h1><p>{workouts.length ? `${workouts.map((workout) => workout.title).join(" · ")} · хранителните цели остават под твой контрол` : "Планирай деня, използвай рецепти и повтаряй работещите комбинации."}</p></div></header>
    <nav className="nutrition-section-nav" aria-label="Хранене">
      <Link className="active" href="/nutrition">Дневник</Link><Link href="/recipes">Рецепти</Link><Link href="/products">Продукти</Link><Link href="/profile?tab=goals">Цели</Link>
    </nav>
    <DynamicNutritionPlanner date={date} data={data} goals={nutrition.goals} promotions={promotions} openNew={params.add === "meal"} />
  </main>;
}

