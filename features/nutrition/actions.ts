"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nutritionEntrySchema, nutritionGoalsSchema } from "./schema";

export type NutritionActionState = { status: "idle" | "success" | "error"; message: string };
const fail = (message: string): NutritionActionState => ({ status: "error", message });
const success = (message: string): NutritionActionState => ({ status: "success", message });

async function userClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveNutritionEntry(_state: NutritionActionState, formData: FormData): Promise<NutritionActionState> {
  const parsed = nutritionEntrySchema.safeParse({
    id: formData.get("id"), entryDate: formData.get("entryDate"), mealType: formData.get("mealType"),
    name: formData.get("name"), quantity: formData.get("quantity"), calories: formData.get("calories"),
    protein: formData.get("protein"), carbs: formData.get("carbs"), fat: formData.get("fat"), notes: formData.get("notes"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Провери въведените данни.");
  const { supabase, user } = await userClient();
  if (!user) return fail("Сесията изтече.");
  const value = parsed.data;
  const data = { owner_id: user.id, entry_date: value.entryDate, meal_type: value.mealType, name: value.name, quantity: value.quantity, calories: value.calories, protein_g: value.protein, carbs_g: value.carbs, fat_g: value.fat, notes: value.notes };
  const query = value.id ? supabase.from("nutrition_entries").update(data).eq("id", value.id).eq("owner_id", user.id) : supabase.from("nutrition_entries").insert(data);
  const { error } = await query;
  if (error) return fail("Храненето не можа да бъде запазено.");
  revalidatePath("/nutrition"); revalidatePath("/today"); revalidatePath("/health");
  return success(value.id ? "Промените са запазени." : "Храненето е добавено.");
}

export async function saveNutritionGoals(_state: NutritionActionState, formData: FormData): Promise<NutritionActionState> {
  const parsed = nutritionGoalsSchema.safeParse({ calories: formData.get("calories"), protein: formData.get("protein"), carbs: formData.get("carbs"), fat: formData.get("fat") });
  if (!parsed.success) return fail("Провери дневните цели.");
  const { supabase, user } = await userClient();
  if (!user) return fail("Сесията изтече.");
  const value = parsed.data;
  const [{ error }, { error: legacyError }] = await Promise.all([
    supabase.from("user_goals").upsert({ owner_id: user.id, calorie_goal: value.calories, protein_goal_g: value.protein, carbs_goal_g: value.carbs, fat_goal_g: value.fat, source: "manual" }, { onConflict: "owner_id" }),
    supabase.from("nutrition_goals").upsert({ owner_id: user.id, calorie_goal: value.calories, protein_goal: value.protein, carbs_goal: value.carbs, fat_goal: value.fat }, { onConflict: "owner_id" }),
  ]);
  if (error || legacyError) return fail("Целите не можаха да бъдат запазени.");
  revalidatePath("/nutrition"); revalidatePath("/profile"); revalidatePath("/today"); revalidatePath("/health");
  return success("Дневните цели са запазени.");
}

export async function deleteNutritionEntry(id: string) {
  const { supabase, user } = await userClient();
  if (!user) return { ok: false };
  const { error } = await supabase.from("nutrition_entries").delete().eq("id", id).eq("owner_id", user.id);
  revalidatePath("/nutrition"); revalidatePath("/today"); revalidatePath("/health");
  return { ok: !error };
}
