import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { QuickAdd } from "@/features/calendar/components/quick-add";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import { getUpcoming } from "@/features/calendar/queries";
import { TodayExperience } from "@/features/today/components/today-experience";

export const metadata = { title: "Днес · Дневник на живота" };

export default async function TodayPage() {
  const today = localDateKey();
  const data = await getUpcoming(today, 8);
  if (!data) redirect("/login");
  return <main className="life-app-shell"><AppNavigation active="today" /><TodayExperience today={today} todayItems={data.items.filter((item) => item.date <= today && (item.endDate ?? item.date) >= today)} upcoming={data.items} /><QuickAdd defaultDate={today} /></main>;
}
