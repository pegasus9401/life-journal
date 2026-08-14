"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { workoutSchema } from "./schema";

export type WorkoutActionState = { status: "idle" | "success" | "error"; message: string };
const response = (status: WorkoutActionState["status"], message: string): WorkoutActionState => ({ status, message });

async function userClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveWorkout(_state: WorkoutActionState, formData: FormData): Promise<WorkoutActionState> {
  const parsed = workoutSchema.safeParse({
    id: formData.get("id"), workoutDate: formData.get("workoutDate"), title: formData.get("title"), workoutType: formData.get("workoutType"),
    durationMinutes: formData.get("durationMinutes"), caloriesBurned: formData.get("caloriesBurned"), notes: formData.get("notes"),
    exercises: formData.get("exercises"), completed: formData.get("completed") === "on",
  });
  if (!parsed.success) return response("error", parsed.error.issues[0]?.message ?? "Провери тренировката.");
  const { supabase, user } = await userClient();
  if (!user) return response("error", "Сесията изтече.");
  const value = parsed.data;
  const data = { owner_id: user.id, workout_date: value.workoutDate, title: value.title, workout_type: value.workoutType, duration_minutes: value.durationMinutes, calories_burned: value.caloriesBurned, notes: value.notes, exercises: value.exercises, completed: value.completed };
  const query = value.id ? supabase.from("workout_sessions").update(data).eq("id", value.id).eq("owner_id", user.id) : supabase.from("workout_sessions").insert(data);
  const { error } = await query;
  if (error) return response("error", "Тренировката не можа да бъде запазена.");
  revalidatePath("/workouts"); revalidatePath("/today");
  return response("success", value.id ? "Промените са запазени." : "Тренировката е добавена.");
}

export async function deleteWorkout(id: string) {
  const { supabase, user } = await userClient();
  if (!user) return { ok: false };
  const { error } = await supabase.from("workout_sessions").delete().eq("id", id).eq("owner_id", user.id);
  revalidatePath("/workouts"); revalidatePath("/today");
  return { ok: !error };
}

export async function toggleWorkout(id: string, completed: boolean) {
  const { supabase, user } = await userClient();
  if (!user) return { ok: false };
  const { error } = await supabase.from("workout_sessions").update({ completed }).eq("id", id).eq("owner_id", user.id);
  revalidatePath("/workouts"); revalidatePath("/today");
  return { ok: !error };
}
