"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type WellnessState = { status: "idle" | "success" | "error"; message: string };
const schema = z.object({
  date: z.string().date(), sleepHours: z.coerce.number().min(0).max(24), sleepQuality: z.coerce.number().int().min(1).max(5),
  energy: z.coerce.number().int().min(1).max(5), soreness: z.coerce.number().int().min(1).max(5), stress: z.coerce.number().int().min(1).max(5),
  restingHeartRate: z.preprocess((v) => v === "" ? null : v, z.coerce.number().int().min(25).max(220).nullable()), notes: z.string().max(500).optional(),
});

export async function saveDailyWellness(_state: WellnessState, formData: FormData): Promise<WellnessState> {
  const parsed = schema.safeParse({ date: formData.get("date"), sleepHours: formData.get("sleepHours"), sleepQuality: formData.get("sleepQuality"), energy: formData.get("energy"), soreness: formData.get("soreness"), stress: formData.get("stress"), restingHeartRate: formData.get("restingHeartRate"), notes: formData.get("notes") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Провери въведените данни." };
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Сесията изтече." };
  const v = parsed.data;
  const { error } = await supabase.from("daily_wellness").upsert({ owner_id: user.id, entry_date: v.date, sleep_hours: v.sleepHours, sleep_quality: v.sleepQuality, energy: v.energy, soreness: v.soreness, stress: v.stress, resting_heart_rate: v.restingHeartRate, notes: v.notes || null }, { onConflict: "owner_id,entry_date" });
  if (error) return { status: "error", message: "Дневният check-in не можа да бъде запазен." };
  revalidatePath("/today"); return { status: "success", message: "Днешното състояние е обновено." };
}

