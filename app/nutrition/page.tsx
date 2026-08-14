import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import { NutritionExperience } from "@/features/nutrition/components/nutrition-experience";
import { getNutritionDay } from "@/features/nutrition/queries";

export const metadata = { title: "Хранене · Дневник на живота" };

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const today = localDateKey();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : today;
  const data = await getNutritionDay(date);
  if (!data) redirect("/login");
  return <main className="life-app-shell"><AppNavigation active="nutrition" /><NutritionExperience date={date} today={today} entries={data.entries} goals={data.goals} /></main>;
}
