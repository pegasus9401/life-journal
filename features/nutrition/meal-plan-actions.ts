"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mealMenus, type MenuName } from "./meal-data";

export async function saveDailyMealPlan(input: { date: string; menu: MenuName; selections: Record<string, number> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Трябва да си влязъл в профила." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !mealMenus[input.menu]) return { ok: false, message: "Невалиден хранителен план." };
  const cleanSelections: Record<string, number> = {};
  for (const [meal, options] of Object.entries(mealMenus[input.menu])) {
    const selected = Number(input.selections[meal] ?? 0);
    cleanSelections[meal] = Number.isInteger(selected) && selected >= 0 && selected < options.length ? selected : 0;
  }
  const { error } = await supabase.from("daily_meal_plans").upsert({ owner_id: user.id, plan_date: input.date, menu_name: input.menu, selections: cleanSelections, updated_at: new Date().toISOString() }, { onConflict: "owner_id,plan_date" });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/calendar"); revalidatePath("/nutrition"); revalidatePath("/shopping-list");
  return { ok: true, message: "Хранителният ден е запазен." };
}
