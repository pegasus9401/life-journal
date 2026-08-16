import { redirect } from "next/navigation";

import { AppNavigation } from "@/components/app-navigation";
import { WorkoutExperience } from "@/features/workouts/components/workout-experience";
import { createClient } from "@/lib/supabase/server";
import { getWorkoutHistory } from "@/features/workouts/queries";

export const metadata = { title: "Тренировки · Дневник на живота" };

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const history = await getWorkoutHistory();

  return (
    <main className="life-app-shell">
      <AppNavigation active="workouts" />
      <WorkoutExperience initialTemplates={user.user_metadata?.workout_templates} initialHistory={history ?? []} />
    </main>
  );
}
