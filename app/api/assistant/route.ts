import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assistantToolDefinitions, executeAssistantTool } from "@/lib/ai/assistant-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: unknown[] };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

const systemPrompt = `Ти си личният AI асистент в приложението „Дневник на живота“.
Говориш естествено и кратко на български. Днешната дата е ${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date())}, часова зона Europe/Sofia.
Можеш да преглеждаш и управляваш календар, задачи, дневник, хранене и тренировки чрез предоставените инструменти.
Правила:
- Когато липсва важна информация, задай един кратък уточняващ въпрос.
- За относителни дати като „утре“ пресметни точната дата.
- Преди редактиране или изтриване първо намери точния запис с get_day, освен ако вече имаш неговото ID от разговора.
- Никога не използвай delete_item, ако последното съобщение на потребителя не потвърждава ясно конкретното изтриване. Първо попитай.
- След успешно действие кажи точно какво е направено. Не твърди, че си направил нещо без успешен резултат от инструмент.
- Не давай медицински диагнози и не представяй хранителни или тренировъчни съвети като медицински препоръки.
- При дневник запази гласа на потребителя; не измисляй факти, които не е казал.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || request.headers.get("x-vercel-oidc-token");
  if (!token) return NextResponse.json({ error: "AI Gateway все още не е активиран за проекта." }, { status: 503 });

  const body = await request.json().catch(() => null) as { messages?: Array<{ role?: string; content?: string }> } | null;
  const history: ChatMessage[] = (body?.messages ?? []).slice(-20).filter((message) => (message.role === "user" || message.role === "assistant") && typeof message.content === "string").map((message) => ({ role: message.role as "user" | "assistant", content: message.content!.slice(0, 8000) }));
  if (!history.length || history.at(-1)?.role !== "user") return NextResponse.json({ error: "Напиши какво искаш да направя." }, { status: 400 });

  const messages: ChatMessage[] = [{ role: "assistant", content: systemPrompt }, ...history];
  const actions: Array<{ tool: string; result: unknown }> = [];

  try {
    for (let step = 0; step < 6; step += 1) {
      const gatewayResponse = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Vercel-AI-App-Name": "Life Journal" },
        body: JSON.stringify({ model: "openai/gpt-5.4", messages: [{ role: "system", content: systemPrompt }, ...messages.slice(1)], tools: assistantToolDefinitions, tool_choice: "auto", stream: false, max_tokens: 1800 }),
      });
      const result = await gatewayResponse.json() as { choices?: Array<{ message?: { role: "assistant"; content?: string | null; tool_calls?: ToolCall[] } }>; error?: { message?: string } };
      if (!gatewayResponse.ok) throw new Error(result.error?.message ?? `AI Gateway: ${gatewayResponse.status}`);
      const assistantMessage = result.choices?.[0]?.message;
      if (!assistantMessage) throw new Error("AI асистентът не върна отговор.");
      const calls = assistantMessage.tool_calls ?? [];
      if (!calls.length) return NextResponse.json({ message: assistantMessage.content || "Готово.", actions });

      messages.push({ role: "assistant", content: assistantMessage.content ?? "", tool_calls: calls });
      for (const call of calls) {
        let toolResult: unknown;
        try {
          const args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
          toolResult = await executeAssistantTool(call.function.name, args, { supabase, user });
          actions.push({ tool: call.function.name, result: toolResult });
        } catch (error) {
          toolResult = { error: error instanceof Error ? error.message : "Действието не успя." };
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(toolResult) });
      }
    }
    return NextResponse.json({ message: "Изпълних действията, но задачата стана твърде дълга. Кажи ми да продължа.", actions });
  } catch (error) {
    console.error("Assistant error", error);
    if (error instanceof Error && error.message.toLowerCase().includes("credit card")) {
      return NextResponse.json({ error: "За да заработи AI асистентът, Vercel изисква да добавиш карта в AI Gateway — включително за безплатните AI кредити." }, { status: 402 });
    }
    return NextResponse.json({ error: "AI асистентът временно не е достъпен. Опитай отново след малко." }, { status: 502 });
  } finally {
    ["/today", "/calendar", "/journal", "/nutrition", "/workouts"].forEach((path) => revalidatePath(path));
  }
}
