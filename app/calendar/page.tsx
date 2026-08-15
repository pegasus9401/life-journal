import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { CalendarExperience } from "@/features/calendar/components/calendar-experience";
import { QuickAdd } from "@/features/calendar/components/quick-add";
import { addDays, getViewRange, localDateKey, startOfWeek } from "@/features/calendar/domain/date-utils";
import { getCalendarData } from "@/features/calendar/queries";
import { createClient } from "@/lib/supabase/server";
import type { CalendarView } from "@/features/calendar/types";

export const metadata = { title: "Календар · Дневник на живота" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string }> }) {
  const params = await searchParams;
  const today = localDateKey();
  const view: CalendarView = params.view === "week" || params.view === "day" ? params.view : "month";
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : today;
  const range = getViewRange(view, selected);
  const queryRange = view === "month" ? { start: startOfWeek(range.start), end: addDays(startOfWeek(range.start), 41) } : range;
  const data = await getCalendarData(queryRange.start, queryRange.end);
  if (!data) redirect("/login");

  const supabase = await createClient();
  const { data: mealPlans } = await supabase
    .from("daily_meal_plans")
    .select("plan_date,menu_name,selections")
    .gte("plan_date", queryRange.start)
    .lte("plan_date", queryRange.end)
    .order("plan_date");

  return <main className="life-app-shell">
    <AppNavigation active="calendar" />
    <CalendarExperience view={view} selected={selected} today={today} items={data.items} mealPlans={(mealPlans ?? []).map(plan => ({ plan_date: plan.plan_date, menu_name: plan.menu_name, selections: (plan.selections as Record<string, number>) || {} }))} />
    <QuickAdd defaultDate={selected} />
  </main>;
}
