import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { CalendarExperience } from "@/features/calendar/components/calendar-experience";
import { QuickAdd } from "@/features/calendar/components/quick-add";
import { addDays, getViewRange, localDateKey, startOfWeek } from "@/features/calendar/domain/date-utils";
import { getCalendarData } from "@/features/calendar/queries";
import { createClient } from "@/lib/supabase/server";
import type { CalendarView } from "@/features/calendar/types";
import { normalizeWorkoutCalendarTemplates } from "@/features/workouts/workout-library";

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
  const [{ data: mealPlans }, { data: { user } }] = await Promise.all([
    supabase
      .from("daily_meal_plans")
      .select("plan_date,menu_name,selections")
      .gte("plan_date", queryRange.start)
      .lte("plan_date", queryRange.end)
      .order("plan_date"),
    supabase.auth.getUser(),
  ]);
  if (!user) redirect("/login");

  const workoutPlans = normalizeWorkoutCalendarTemplates(user.user_metadata?.workout_templates);

  return <main className="life-app-shell">
    <AppNavigation active="calendar" title={new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${selected}T12:00:00Z`))} />
    <CalendarExperience view={view} selected={selected} today={today} items={data.items} mealPlans={(mealPlans ?? []).map(plan => ({ plan_date: plan.plan_date, menu_name: plan.menu_name, selections: (plan.selections as Record<string, number>) || {} }))} workoutPlans={workoutPlans} />
    <QuickAdd defaultDate={selected} />
  </main>;
}
