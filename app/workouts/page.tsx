import { redirect } from "next/navigation";

import { AppNavigation } from "@/components/app-navigation";
import { WorkoutExperience } from "@/features/workouts/components/workout-experience";
import { FitnessDashboard } from "@/features/workouts/components/fitness-dashboard";
import { createClient } from "@/lib/supabase/server";
import { getWorkoutRange } from "@/features/workouts/queries";
import { addDays, localDateKey } from "@/features/calendar/domain/date-utils";

export const metadata = { title: "Тренировки · Дневник на живота" };

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const today = localDateKey();
  const sessions = await getWorkoutRange(addDays(today, -364), addDays(today, 60));
  if (!sessions) redirect("/login");
  const history = sessions.filter((session) => session.completed || session.status === "completed");

  return (
    <main className="life-app-shell">
      <AppNavigation active="workouts" captureDate={today} />
      <FitnessDashboard sessions={sessions} today={today} />
      <div id="workout-templates"><WorkoutExperience initialTemplates={user.user_metadata?.workout_templates} initialHistory={history} /></div>
    </main>
  );
}
