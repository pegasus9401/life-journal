import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { MealMenuManager } from "@/features/nutrition/components/meal-menu-manager";
import { getNutritionDay } from "@/features/nutrition/queries";
import { localDateKey } from "@/features/calendar/domain/date-utils";

export const metadata = { title: "Хранене · Дневник на живота" };

export default async function NutritionPage() {
  const data = await getNutritionDay(localDateKey());
  if (!data) redirect("/login");
  return <main className="life-app-shell">
    <AppNavigation active="nutrition" />
    <header className="nutrition-header"><div><p className="life-kicker">Моят режим</p><h1>Хранене</h1><p>Дневното меню, продуктите и точните количества на едно място.</p></div></header>
    <MealMenuManager />
  </main>;
}
