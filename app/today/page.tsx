import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { QuickAdd } from "@/features/calendar/components/quick-add";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import { getUpcoming } from "@/features/calendar/queries";
import { TodayExperience } from "@/features/today/components/today-experience";
import { getDailyWellness } from "@/features/wellness/queries";
import { WellnessDashboard } from "@/features/wellness/components/wellness-dashboard";

export const metadata = { title: "Днес · Дневник на живота" };

export default async function TodayPage() {
  const today = localDateKey();
  const [data, wellness] = await Promise.all([getUpcoming(today, 8), getDailyWellness(today)]);
  if (!data) redirect("/login");
  const todayItems = data.items.filter((item) => item.date <= today && (item.endDate ?? item.date) >= today);
  return <main className="life-app-shell bevel-shell"><AppNavigation active="today" /><WellnessDashboard date={today} value={wellness} workoutCount={todayItems.filter((item) => item.type === "workout").length} /><TodayExperience today={today} todayItems={todayItems} upcoming={data.items} /><QuickAdd defaultDate={today} /></main>;
}

