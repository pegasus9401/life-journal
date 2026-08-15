import { redirect } from "next/navigation";

import { AppNavigation } from "@/components/app-navigation";
import { WorkoutExperience } from "@/features/workouts/components/workout-experience";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Тренировки · Дневник на живота" };

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="life-app-shell">
      <AppNavigation active="workouts" />
      <WorkoutExperience initialTemplates={user.user_metadata?.workout_templates} />
    </main>
  );
}
