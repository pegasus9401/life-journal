import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { DailyWellness } from "./types";

export const getDailyWellness = cache(async (date: string) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("daily_wellness").select("entry_date,sleep_hours,sleep_quality,energy,soreness,stress,resting_heart_rate,notes").eq("owner_id", user.id).eq("entry_date", date).maybeSingle();
  if (error && error.code !== "42P01") throw new Error(`Дневното състояние не може да се зареди: ${error.message}`);
  return (data as DailyWellness | null) ?? null;
});

