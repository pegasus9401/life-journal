"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMenuLibrary, orderedMealEntries, type MealMenuSettings } from "./menu-library";

export async function saveDailyMealPlan(input: { date: string; menu: string; selections: Record<string, number> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Трябва да си влязъл в профила." };

  const menus = getMenuLibrary(user.user_metadata as MealMenuSettings, false);
  const selectedMenu = menus[input.menu];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !selectedMenu) return { ok: false, message: "Невалиден или архивиран хранителен план." };

  const cleanSelections: Record<string, number> = {};
  for (const [meal, options] of orderedMealEntries(selectedMenu)) {
    const selected = Number(input.selections[meal] ?? 0);
    cleanSelections[meal] = Number.isInteger(selected) && selected >= 0 && selected < options.length ? selected : 0;
  }

  const { error } = await supabase.from("daily_meal_plans").upsert({ owner_id: user.id, plan_date: input.date, menu_name: input.menu, selections: cleanSelections, updated_at: new Date().toISOString() }, { onConflict: "owner_id,plan_date" });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/calendar"); revalidatePath("/nutrition"); revalidatePath("/shopping-list");
  return { ok: true, message: "Хранителният ден е запазен." };
}

export async function removeDailyMealPlan(date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Трябва да си влязъл в профила." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Невалидна дата." };

  const { error } = await supabase.from("daily_meal_plans").delete().eq("owner_id", user.id).eq("plan_date", date);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/calendar"); revalidatePath("/nutrition"); revalidatePath("/shopping-list");
  return { ok: true, message: "Менюто е премахнато от този ден." };
}
