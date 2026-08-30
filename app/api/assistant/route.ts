import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { ModelMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createPegasAgent } from "@/lib/ai/pegas-agent";
import { buildDailyContext, ensureConversation, getPersona } from "@/lib/ai/intelligence";
import { syncConversationMemories } from "@/lib/ai/memory-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestMessage = { role?: string; content?: string };
type RequestBody = { messages?: RequestMessage[]; image?: string | null; conversationId?: string | null };
const sofiaDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());

function friendlyError(error: unknown) {
  const detail = error instanceof Error ? error.message.toLowerCase() : "";
  if (detail.includes("429") || detail.includes("quota") || detail.includes("resource_exhausted")) return "Gemini е временно натоварен или лимитът е достигнат. Опитай след малко.";
  if (detail.includes("api key") || detail.includes("permission_denied")) return "Gemini още не е конфигуриран правилно.";
  return "Pegas не успя да отговори в момента. Опитай отново.";
}

export async function GET(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  const conversationId = new URL(request.url).searchParams.get("conversationId");
  const [conversations, preferences, memories, messages] = await Promise.all([
    supabase.from("ai_conversations").select("id,title,persona,created_at,updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("ai_preferences").select("persona").eq("owner_id", user.id).maybeSingle(),
    supabase.from("ai_memories").select("id,category,content,keywords,enabled,created_at,updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    conversationId ? supabase.from("ai_messages").select("id,role,content,metadata,created_at").eq("owner_id", user.id).eq("conversation_id", conversationId).order("created_at").limit(100) : Promise.resolve({ data: [], error: null }),
  ]);
  const error = conversations.error ?? preferences.error ?? memories.error ?? messages.error;
  if (error) return NextResponse.json({ error: "Intelligence базата още не е активирана." }, { status: 503 });
  return NextResponse.json({ conversations: conversations.data ?? [], persona: preferences.data?.persona ?? "friend", memories: memories.data ?? [], messages: messages.data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return NextResponse.json({ error: "Gemini още не е активиран за PegasOS." }, { status: 503 });
  const body = await request.json().catch(() => null) as RequestBody | null;
  const history: ModelMessage[] = (body?.messages ?? []).slice(-30).filter((message): message is Required<RequestMessage> => (message.role === "user" || message.role === "assistant") && typeof message.content === "string").map((message) => ({ role: message.role as "user" | "assistant", content: message.content.slice(0, 8000) }));
  if (!history.length || history.at(-1)?.role !== "user") return NextResponse.json({ error: "Напиши какво искаш да направя." }, { status: 400 });
  if (body?.image) {
    const match = body.image.match(/^data:(image\/(?:jpeg|png|webp));base64,/); if (!match || body.image.length > 3_000_000) return NextResponse.json({ error: "Снимката е невалидна или прекалено голяма." }, { status: 400 });
    history.at(-1)!.content = [{ type: "text", text: String(history.at(-1)!.content) }, { type: "file", data: body.image, mediaType: match[1] }];
  }
  const latestText = String(history.at(-1)!.content instanceof Array ? (history.at(-1)!.content as Array<{ type: string; text?: string }>).find((part) => part.type === "text")?.text ?? "" : history.at(-1)!.content);
  try {
    const today = sofiaDate(); const persona = await getPersona(supabase, user.id); const conversationId = await ensureConversation(supabase, user.id, body?.conversationId ?? null, persona, latestText);
    const dailyContext = await buildDailyContext(supabase, user, today, latestText);
    await supabase.from("ai_messages").insert({ owner_id: user.id, conversation_id: conversationId, role: "user", content: latestText });
    const actions: Array<{ tool: string; result: unknown }> = [];
    const agent = createPegasAgent({ supabase, user, today, persona, dailyContext, conversationId, onAction: (action) => actions.push(action) });
    const result = await agent.stream({ messages: history });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let complete = "";
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify({ type: "meta", conversationId, persona })}\n`));
          for await (const chunk of result.textStream) { complete += chunk; controller.enqueue(encoder.encode(`${JSON.stringify({ type: "text", text: chunk })}\n`)); }
          const assistantText = complete.trim() || "Готово.";
          await supabase.from("ai_messages").insert({ owner_id: user.id, conversation_id: conversationId, role: "assistant", content: assistantText, metadata: { actions } });
          await supabase.from("ai_conversations").update({ persona }).eq("id", conversationId).eq("owner_id", user.id);
          try { await syncConversationMemories(supabase, user.id, latestText, assistantText); }
          catch (error) { console.error("Pegas memory sync error", error); }
          controller.enqueue(encoder.encode(`${JSON.stringify({ type: "done", actions })}\n`));
          ["/today", "/calendar", "/nutrition", "/workouts"].forEach((path) => revalidatePath(path));
        } catch (error) { controller.enqueue(encoder.encode(`${JSON.stringify({ type: "error", error: friendlyError(error) })}\n`)); }
        finally { controller.close(); }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
  } catch (error) { console.error("Gemini assistant error", error); return NextResponse.json({ error: friendlyError(error) }, { status: 502 }); }
}
