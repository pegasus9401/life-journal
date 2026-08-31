import type { SupabaseClient, User } from "@supabase/supabase-js";
import { normalizeWorkoutCalendarTemplates } from "@/features/workouts/workout-library";
import { getNutritionForDate } from "./assistant-tools";

export const PERSONAS = ["friend", "guardian", "data_nerd", "commander"] as const;
export type Persona = (typeof PERSONAS)[number];
export type MemoryCategory = "goal" | "preference" | "training" | "nutrition" | "routine" | "communication";

export const personaLabels: Record<Persona, string> = {
  friend: "Friend", guardian: "Guardian", data_nerd: "Data Nerd", commander: "Commander",
};

export const personaInstructions: Record<Persona, string> = {
  friend: "Бъди топъл, естествен, подкрепящ и позитивен. Говори като близък приятел.",
  guardian: "Бъди спокоен, разумен и балансиран. Посочвай рисковете без драматизиране.",
  data_nerd: "Бъди аналитичен. Използвай точните числа, сравненията и тенденциите от подадения контекст.",
  commander: "Бъди кратък, директен и ориентиран към действие. Давай ясна следваща стъпка.",
};

const tokens = (value: string) => value.toLocaleLowerCase("bg-BG").split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 2);

export async function getPersona(supabase: SupabaseClient, userId: string): Promise<Persona> {
  const { data } = await supabase.from("ai_preferences").select("persona").eq("owner_id", userId).maybeSingle();
  return PERSONAS.includes(data?.persona as Persona) ? data!.persona as Persona : "friend";
}

export async function getRelevantMemories(supabase: SupabaseClient, userId: string, query: string) {
  const { data } = await supabase.from("ai_memories").select("id,category,content,keywords").eq("owner_id", userId).eq("enabled", true).order("updated_at", { ascending: false }).limit(80);
  const queryTokens = new Set(tokens(query));
  return (data ?? []).map((memory) => {
    const haystack = new Set([...tokens(memory.content), ...((memory.keywords as string[] | null) ?? []).flatMap(tokens)]);
    const score = [...queryTokens].reduce((sum, token) => sum + (haystack.has(token) ? 1 : 0), 0);
    return { ...memory, score };
  }).sort((a, b) => b.score - a.score).filter((memory, index) => memory.score > 0 || index < 3).slice(0, 8);
}

export async function buildDailyContext(supabase: SupabaseClient, user: User, today: string, query: string) {
  const startIso = `${today}T00:00:00.000Z`; const endIso = `${today}T23:59:59.999Z`;
  const [events, tasks, nutrition, workouts, profile, goals, memories] = await Promise.all([
    supabase.from("calendar_events").select("id,title,start_date,end_date,starts_at,ends_at,all_day,location").eq("owner_id", user.id).or(`and(all_day.eq.true,start_date.lte.${today},end_date.gte.${today}),and(all_day.eq.false,starts_at.lte.${endIso},ends_at.gte.${startIso})`).limit(20),
    supabase.from("tasks").select("id,title,due_date,due_time,priority,completed").eq("owner_id", user.id).eq("due_date", today).limit(30),
    getNutritionForDate(supabase, user.id, today),
    supabase.from("workout_sessions").select("id,title,workout_type,duration_minutes,completed").eq("owner_id", user.id).eq("workout_date", today).limit(10),
    supabase.from("profiles").select("display_name,fitness_goal,activity_level").eq("owner_id", user.id).maybeSingle(),
    supabase.from("user_goals").select("calorie_goal,protein_goal_g,carbs_goal_g,fat_goal_g,steps_goal").eq("owner_id", user.id).maybeSingle(),
    getRelevantMemories(supabase, user.id, query),
  ]);
  const totals = nutrition.reduce((sum, row) => ({ calories: sum.calories + row.calories, protein: sum.protein + row.protein, carbs: sum.carbs + row.carbs, fat: sum.fat + row.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const templates = normalizeWorkoutCalendarTemplates((user.user_metadata as Record<string, unknown> | undefined)?.workout_templates);
  return { date: today, timezone: "Europe/Sofia", profile: profile.data, goals: goals.data, events: events.data ?? [], tasks: tasks.data ?? [], nutrition: { totals, entries: nutrition.length }, workout: { today: workouts.data ?? [], currentPlan: templates.slice(0, 4) }, memories };
}

export async function ensureConversation(supabase: SupabaseClient, userId: string, conversationId: string | null, persona: Persona, firstMessage: string) {
  if (conversationId) {
    const { data } = await supabase.from("ai_conversations").select("id").eq("id", conversationId).eq("owner_id", userId).maybeSingle();
    if (data) return data.id as string;
  }
  const title = firstMessage.trim().replace(/\s+/g, " ").slice(0, 70) || "Нов разговор";
  const { data, error } = await supabase.from("ai_conversations").insert({ owner_id: userId, persona, title }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

