import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_NUTRITION_GOALS, type NutritionEntry, type NutritionGoals } from "./types";

export const getNutritionDay = cache(async (date: string) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [entriesResult, goalsResult] = await Promise.all([
    supabase.from("nutrition_entries").select("*").eq("owner_id", user.id).eq("entry_date", date).order("created_at"),
    supabase.from("nutrition_goals").select("calorie_goal, protein_goal, carbs_goal, fat_goal").eq("owner_id", user.id).maybeSingle(),
  ]);
  if (entriesResult.error) throw new Error(`Храненето не може да се зареди: ${entriesResult.error.message}`);
  if (goalsResult.error) throw new Error(`Целите не могат да се заредят: ${goalsResult.error.message}`);

  const goals: NutritionGoals = goalsResult.data ? {
    calories: goalsResult.data.calorie_goal,
    protein: goalsResult.data.protein_goal,
    carbs: goalsResult.data.carbs_goal,
    fat: goalsResult.data.fat_goal,
  } : DEFAULT_NUTRITION_GOALS;

  return { entries: (entriesResult.data ?? []) as NutritionEntry[], goals };
});
