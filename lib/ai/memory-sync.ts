import { google } from "@ai-sdk/google";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText, Output } from "ai";
import { z } from "zod";
import { PEGAS_GEMINI_MODEL } from "@/lib/ai/pegas-agent";

const categories = ["goal", "preference", "training", "nutrition", "routine", "communication"] as const;

const memoryChangesSchema = z.object({
  changes: z.array(z.object({
    existingId: z.string().uuid().nullable(),
    action: z.enum(["upsert", "disable"]),
    category: z.enum(categories),
    content: z.string().trim().min(1).max(1000),
    keywords: z.array(z.string().trim().min(1).max(80)).max(12),
  })).max(6),
});

type StoredMemory = { id: string; category: string; content: string; keywords: string[] | null; enabled: boolean };

const normalize = (value: string) => value.toLocaleLowerCase("bg-BG").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export async function syncConversationMemories(
  supabase: SupabaseClient,
  userId: string,
  userText: string,
  assistantText: string,
) {
  const { data, error } = await supabase
    .from("ai_memories")
    .select("id,category,content,keywords,enabled")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false })
    .limit(80);
  if (error) throw error;

  const existing = (data ?? []) as StoredMemory[];
  const existingById = new Map(existing.map((memory) => [memory.id, memory]));
  const existingByContent = new Map(existing.map((memory) => [normalize(memory.content), memory]));
  const result = await generateText({
    model: google(PEGAS_GEMINI_MODEL),
    output: Output.object({ schema: memoryChangesSchema, name: "pegas_memory_changes" }),
    maxOutputTokens: 900,
    temperature: 0,
    system: `Ти управляваш дългосрочната памет на личен LifeOS асистент.
Извличай само факти, които потребителят лично е заявил и вероятно ще бъдат полезни в бъдещи разговори: устойчиви цели, предпочитания, ограничения, тренировъчни и хранителни навици, повтарящи се рутини и предпочитан стил на комуникация.
Не записвай въпроси, поздрави, временни настроения, еднократни събития/задачи, чувствителни тайни, предположения или твърдения, направени само от асистента.
Използвай upsert с existingId, когато новото твърдение уточнява, коригира или заменя съществуващ запис. Не създавай дубликати.
Използвай disable само когато потребителят изрично отрича или отменя запазен факт.
Пиши content кратко, самостоятелно и на български. Ако няма нищо подходящо, върни празен масив changes.`,
    prompt: `Съществуваща памет:\n${JSON.stringify(existing)}\n\nПоследно съобщение на потребителя:\n${userText}\n\nОтговор на асистента (само за контекст, не е източник на факти):\n${assistantText}`,
  });

  for (const change of result.output.changes) {
    const matched = change.existingId ? existingById.get(change.existingId) : existingByContent.get(normalize(change.content));
    if (change.action === "disable") {
      if (matched) await supabase.from("ai_memories").update({ enabled: false }).eq("id", matched.id).eq("owner_id", userId);
      continue;
    }

    const row = { category: change.category, content: change.content, keywords: change.keywords, enabled: true };
    if (matched) await supabase.from("ai_memories").update(row).eq("id", matched.id).eq("owner_id", userId);
    else await supabase.from("ai_memories").insert({ ...row, owner_id: userId });
  }
}
