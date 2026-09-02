import { cache } from "react";
import { getAuthenticatedClient } from "@/lib/supabase/server";
import { DEFAULT_NUTRITION_GOALS, type NutritionEntry, type NutritionGoals } from "./types";

export const getNutritionDay = cache(async (date: string) => {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return null;

  const [entriesResult, goalsResult] = await Promise.all([
    supabase.from("nutrition_entries").select("*").eq("owner_id", user.id).eq("entry_date", date).order("created_at"),
    supabase.from("user_goals").select("calorie_goal, protein_goal_g, carbs_goal_g, fat_goal_g").eq("owner_id", user.id).maybeSingle(),
  ]);
  if (entriesResult.error) throw new Error(`Храненето не може да се зареди: ${entriesResult.error.message}`);
  if (goalsResult.error) throw new Error(`Целите не могат да се заредят: ${goalsResult.error.message}`);

  const goals: NutritionGoals = goalsResult.data ? {
    calories: goalsResult.data.calorie_goal,
    protein: goalsResult.data.protein_goal_g,
    carbs: goalsResult.data.carbs_goal_g,
    fat: goalsResult.data.fat_goal_g,
  } : DEFAULT_NUTRITION_GOALS;

  return { entries: (entriesResult.data ?? []) as NutritionEntry[], goals };
});

export const getNutritionEntriesDay = cache(async (date: string) => {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return null;
  const { data, error } = await supabase.from("nutrition_entries").select("*").eq("owner_id", user.id).eq("entry_date", date).order("created_at");
  if (error) throw new Error(`Храненето не може да се зареди: ${error.message}`);
  return (data ?? []) as NutritionEntry[];
});
