"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { longTermGoalsSchema, profileSchema, userGoalsSchema } from "./schema";

export type ProfileActionState = { status: "idle" | "success" | "error"; message: string };
const result = (status: ProfileActionState["status"], message: string): ProfileActionState => ({ status, message });

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveProfile(_state: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"), birthDate: formData.get("birthDate"), sex: formData.get("sex"),
    heightCm: formData.get("heightCm"), currentWeightKg: formData.get("currentWeightKg"),
    startingWeightKg: formData.get("startingWeightKg"), targetWeightKg: formData.get("targetWeightKg"),
    activityLevel: formData.get("activityLevel"), fitnessGoal: formData.get("fitnessGoal"), timezone: formData.get("timezone"),
  });
  if (!parsed.success) return result("error", parsed.error.issues[0]?.message ?? "Провери данните в профила.");
  const { supabase, user } = await authenticatedClient();
  if (!user) return result("error", "Сесията изтече.");
  const value = parsed.data;
  const { error } = await supabase.from("profiles").upsert({
    owner_id: user.id, display_name: value.displayName, birth_date: value.birthDate, sex: value.sex,
    height_cm: value.heightCm ?? null, current_weight_kg: value.currentWeightKg ?? null,
    starting_weight_kg: value.startingWeightKg ?? null, target_weight_kg: value.targetWeightKg ?? null,
    activity_level: value.activityLevel, fitness_goal: value.fitnessGoal, timezone: value.timezone,
  }, { onConflict: "owner_id" });
  if (error) return result("error", "Профилът не можа да бъде запазен.");
  revalidatePath("/profile"); revalidatePath("/today");
  return result("success", "Профилът е запазен.");
}

export async function saveUserGoals(_state: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const parsed = userGoalsSchema.safeParse({
    calories: formData.get("calories"), protein: formData.get("protein"), carbs: formData.get("carbs"), fat: formData.get("fat"),
    water: formData.get("water"), steps: formData.get("steps"), source: formData.get("source"),
  });
  if (!parsed.success) return result("error", parsed.error.issues[0]?.message ?? "Провери дневните цели.");
  const { supabase, user } = await authenticatedClient();
  if (!user) return result("error", "Сесията изтече.");
  const value = parsed.data;
  const { error } = await supabase.from("user_goals").upsert({
    owner_id: user.id, calorie_goal: value.calories, protein_goal_g: value.protein, carbs_goal_g: value.carbs,
    fat_goal_g: value.fat, water_goal_ml: value.water, steps_goal: value.steps, source: value.source,
  }, { onConflict: "owner_id" });
  if (error) return result("error", "Целите не можаха да бъдат запазени.");
  revalidatePath("/settings/goals"); revalidatePath("/today"); revalidatePath("/nutrition");
  return result("success", "Дневните цели са запазени.");
}

export async function saveLongTermGoals(_state: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const parsed = longTermGoalsSchema.safeParse({
    targetWeightKg: formData.get("targetWeightKg"), fitnessGoal: formData.get("fitnessGoal"),
    birthDate: formData.get("birthDate"), sex: formData.get("sex"), heightCm: formData.get("heightCm"),
    currentWeightKg: formData.get("currentWeightKg"), activityLevel: formData.get("activityLevel"),
  });
  if (!parsed.success) return result("error", parsed.error.issues[0]?.message ?? "Провери дългосрочните цели.");
  const { supabase, user } = await authenticatedClient();
  if (!user) return result("error", "Сесията изтече.");
  const { error } = await supabase.from("profiles").upsert({
    owner_id: user.id, target_weight_kg: parsed.data.targetWeightKg ?? null, fitness_goal: parsed.data.fitnessGoal,
    birth_date: parsed.data.birthDate, sex: parsed.data.sex, height_cm: parsed.data.heightCm ?? null,
    current_weight_kg: parsed.data.currentWeightKg ?? null, activity_level: parsed.data.activityLevel,
  }, { onConflict: "owner_id" });
  if (error) return result("error", "Дългосрочните цели не можаха да бъдат запазени.");
  revalidatePath("/settings/goals"); revalidatePath("/profile"); revalidatePath("/today");
  return result("success", "Целта и данните за изчислението са запазени.");
}

