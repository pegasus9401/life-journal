import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import { WorkoutExperience } from "@/features/workouts/components/workout-experience";
import { getWorkoutDay } from "@/features/workouts/queries";

export const metadata = { title: "Тренировки · Дневник на живота" };

export default async function WorkoutsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const today = localDateKey();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : today;
  const sessions = await getWorkoutDay(date);
  if (!sessions) redirect("/login");
  return <main className="life-app-shell"><AppNavigation active="workouts" /><WorkoutExperience date={date} today={today} sessions={sessions} /></main>;
}
