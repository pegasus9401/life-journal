import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { MealMenuManager } from "@/features/nutrition/components/meal-menu-manager";
import { DynamicNutritionPlanner } from "@/features/nutrition/components/dynamic-nutrition-planner";
import { getDynamicNutritionDay } from "@/features/nutrition/dynamic-queries";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import styles from "@/features/nutrition/components/dynamic-nutrition.module.css";

export const metadata = { title: "Хранене · Дневник на живота" };

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : localDateKey();
  const data = await getDynamicNutritionDay(date);
  if (!data) redirect("/login");
  return <main className="life-app-shell">
    <AppNavigation active="nutrition" />
    <header className="nutrition-header"><div><p className="life-kicker">Моят режим</p><h1>Хранене</h1><p>Динамични хранения, продукти, рецепти и независими дневни шаблони.</p></div></header>
    <DynamicNutritionPlanner date={date} data={data} />
    <details className={styles.legacyManager}><summary>Legacy менюта и режими</summary><MealMenuManager /></details>
  </main>;
}

