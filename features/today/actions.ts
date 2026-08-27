"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TimelineCompletion } from "./types";

export async function setTimelineCompleted(completion: TimelineCompletion, completed: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Сесията изтече." };

  let error: { message: string } | null = null;
  if (completion.kind === "task") {
    ({ error } = await supabase.from("tasks").update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq("id", completion.sourceId).eq("owner_id", user.id));
  } else if (completion.kind === "workout") {
    ({ error } = await supabase.from("workout_sessions").update({ completed }).eq("id", completion.sourceId).eq("owner_id", user.id));
  } else {
    const { data: meal, error: readError } = await supabase.from("day_meals").select("legacy_payload").eq("id", completion.sourceId).eq("owner_id", user.id).single();
    if (readError) error = readError;
    else {
      const payload = meal?.legacy_payload && typeof meal.legacy_payload === "object" ? meal.legacy_payload as Record<string, unknown> : {};
      const nextPayload = { ...payload, completed_at: completed ? new Date().toISOString() : null };
      ({ error } = await supabase.from("day_meals").update({ legacy_payload: nextPayload }).eq("id", completion.sourceId).eq("owner_id", user.id));
    }
  }

  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/nutrition");
  revalidatePath("/workouts");
  return { ok: !error, message: error ? "Записът не можа да бъде обновен." : completed ? "Отбелязано като готово." : "Върнато в планирани." };
}
