import { redirect } from "next/navigation";
import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";
import { DynamicNutritionPlanner } from "@/features/nutrition/components/dynamic-nutrition-planner";
import { getDynamicNutritionDay } from "@/features/nutrition/dynamic-queries";
import { getNutritionDay } from "@/features/nutrition/queries";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import { getWorkoutDay } from "@/features/workouts/queries";
import { workoutStatus } from "@/features/workouts/domain/fitness-analytics";

export const metadata = { title: "Хранене · Дневник на живота" };

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ date?: string; add?: string }> }) {
  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : localDateKey();
  const [data, nutrition, workouts] = await Promise.all([getDynamicNutritionDay(date), getNutritionDay(date), getWorkoutDay(date)]);
  if (!data || !nutrition || !workouts) redirect("/login");
  const completed = workouts.filter((workout) => workoutStatus(workout) === "completed");
  const dayContext = completed.some((workout) => workout.workout_type === "cardio") ? "Cardio ден" : workouts.length ? "Тренировъчен ден" : "Почивен ден";
  return <main className="life-app-shell">
    <AppNavigation active="nutrition" />
    <header className="nutrition-header"><div><p className="life-kicker">Моят режим · {dayContext}</p><h1>Хранене</h1><p>{workouts.length ? `${workouts.map((workout) => workout.title).join(" · ")} · хранителните цели остават под твой контрол` : "Планирай деня, използвай рецепти и повтаряй работещите комбинации."}</p></div></header>
    <nav className="nutrition-section-nav" aria-label="Хранене">
      <Link className="active" href="/nutrition">Дневник</Link><Link href="/recipes">Рецепти</Link><Link href="/products">Продукти</Link><Link href="/settings/goals">Цели</Link>
    </nav>
    <DynamicNutritionPlanner date={date} data={data} goals={nutrition.goals} openNew={params.add === "meal"} />
  </main>;
}


