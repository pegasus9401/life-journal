import { cache } from "react";
import { getAuthenticatedClient } from "@/lib/supabase/server";
import type { WorkoutSession } from "./types";

export const getWorkoutDay = cache(async (date: string) => {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return null;
  const { data, error } = await supabase.from("workout_sessions").select("*").eq("owner_id", user.id).eq("workout_date", date).order("created_at");
  if (error) throw new Error(`Тренировките не могат да се заредят: ${error.message}`);
  return (data ?? []) as WorkoutSession[];
});

export const getWorkoutHistory = cache(async (limit = 30) => {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return null;
  const { data, error } = await supabase.from("workout_sessions").select("*").eq("owner_id", user.id).eq("completed", true).order("workout_date", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Историята на тренировките не може да се зареди: ${error.message}`);
  return (data ?? []) as WorkoutSession[];
});
