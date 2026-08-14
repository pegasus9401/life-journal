import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { WorkoutSession } from "./types";

export const getWorkoutDay = cache(async (date: string) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("workout_sessions").select("*").eq("owner_id", user.id).eq("workout_date", date).order("created_at");
  if (error) throw new Error(`Тренировките не могат да се заредят: ${error.message}`);
  return (data ?? []) as WorkoutSession[];
});
