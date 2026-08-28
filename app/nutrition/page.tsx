import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { MealMenuManager } from "@/features/nutrition/components/meal-menu-manager";
import { DynamicNutritionPlanner } from "@/features/nutrition/components/dynamic-nutrition-planner";
import { getDynamicNutritionDay } from "@/features/nutrition/dynamic-queries";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import styles from "@/features/nutrition/components/dynamic-nutrition.module.css";
import { getWorkoutDay } from "@/features/workouts/queries";
import { workoutStatus } from "@/features/workouts/domain/fitness-analytics";

export const metadata = { title: "Хранене · Дневник на живота" };

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ date?: string; add?: string }> }) {
  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : localDateKey();
  const [data, workouts] = await Promise.all([getDynamicNutritionDay(date), getWorkoutDay(date)]);
  if (!data || !workouts) redirect("/login");
  const completed = workouts.filter((workout) => workoutStatus(workout) === "completed");
  const dayContext = completed.some((workout) => workout.workout_type === "cardio") ? "Cardio ден" : workouts.length ? "Тренировъчен ден" : "Почивен ден";
  return <main className="life-app-shell">
    <AppNavigation active="nutrition" />
    <header className="nutrition-header"><div><p className="life-kicker">Моят режим · {dayContext}</p><h1>Хранене</h1><p>{workouts.length ? `${workouts.map((workout) => workout.title).join(" · ")} · целите не се променят автоматично` : "Динамични хранения, продукти, рецепти и независими дневни шаблони."}</p></div></header>
    <DynamicNutritionPlanner date={date} data={data} openNew={params.add === "meal"} />
    <details className={styles.legacyManager}><summary>Legacy менюта и режими</summary><MealMenuManager /></details>
  </main>;
}
