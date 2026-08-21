import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_USER_GOALS, type Profile, type UserGoals } from "./types";

export const getProfileSettings = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileResult, goalsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("owner_id", user.id).maybeSingle(),
    supabase.from("user_goals").select("calorie_goal, protein_goal_g, carbs_goal_g, fat_goal_g, water_goal_ml, steps_goal, source").eq("owner_id", user.id).maybeSingle(),
  ]);
  if (profileResult.error) throw new Error(`Профилът не може да се зареди: ${profileResult.error.message}`);
  if (goalsResult.error) throw new Error(`Целите не могат да се заредят: ${goalsResult.error.message}`);

  return {
    email: user.email ?? "",
    profile: profileResult.data as Profile | null,
    goals: (goalsResult.data as UserGoals | null) ?? DEFAULT_USER_GOALS,
  };
});


