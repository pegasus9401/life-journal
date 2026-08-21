import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assistantToolDefinitions, executeAssistantTool } from "@/lib/ai/assistant-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type ChatMessage = { role: "user" | "assistant" | "tool"; content: string | ContentPart[]; tool_call_id?: string; tool_calls?: unknown[] };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

const systemPrompt = `Ти си личният AI асистент в приложението „Дневник на живота“.
Говориш естествено и кратко на български. Днешната дата е ${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date())}, часова зона Europe/Sofia.
Можеш да преглеждаш и управляваш календар, задачи, дневник, хранене и тренировки чрез предоставените инструменти.
Правила:
- При снимка на храна или опаковка разпознай марката, името и видимия баркод. След това използвай find_food_product с баркод, ако се чете надеждно, иначе с име и марка. Не записвай продукт само по визуална приблизителна оценка, когато може да бъде проверен в базата.
- Ако потребителят иска сниманият продукт да остане в личната му база, покажи разпознатите стойности за 100 г и поискай потвърждение. Използвай save_food_product само след ясното потвърждение.
- Когато потребителят посочи пакетиран продукт или марка, но не даде хранителни стойности, първо използвай find_food_product. Не измисляй грамове, калории или макроси. При един ясен резултат използвай неговите стойности; при няколко съществени варианта попитай кой е точният.
- Изпълнявай ясните команди веднага. Не искай потвърждение и не задавай въпроси за незадължителни подробности.
- При липсващи незадължителни полета използвай разумни стойности по подразбиране: днес, 60 минути, нормален приоритет, незавършен статус и празни бележки.
- „Добави/планирай тренировка в 19:00“ означава календарно събитие „Тренировка“ за днес от 19:00 до 20:00. Използвай save_event и действай веднага.
- Питай само ако без отговора не може да се определи самото действие или то е необратимо/рисково. Задай най-много един кратък въпрос.
- За относителни дати като „утре“ пресметни точната дата.
- Преди редактиране или изтриване първо намери точния запис с get_day, освен ако вече имаш неговото ID от разговора.
- Никога не използвай delete_item, ако последното съобщение на потребителя не потвърждава ясно конкретното изтриване. Първо попитай.
- След успешно действие кажи точно какво е направено. Не твърди, че си направил нещо без успешен резултат от инструмент.
- Не давай медицински диагнози и не представяй хранителни или тренировъчни съвети като медицински препоръки.
- При дневник запази гласа на потребителя; не измисляй факти, които не е казал.`;

function quickWorkoutEvent(message: string) {
  const normalized = message.toLocaleLowerCase("bg-BG");
  const isCommand = ["добави", "създай", "запиши", "планирай"].some((verb) => normalized.includes(verb));
  if (!isCommand || !normalized.includes("трениров")) return null;
  const timeMatch = normalized.match(/(?:в|от)\s*(\d{1,2})(?::(\d{2}))?\s*(?:ч(?:аса)?\.?)?/u);
  if (!timeMatch) return null;
  const hour = Number(timeMatch[1]); const minute = Number(timeMatch[2] ?? "0");
  if (hour > 23 || minute > 59) return null;
  const target = new Date();
  if (normalized.includes("утре")) target.setDate(target.getDate() + 1);
  const selectedDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(target);
  const endMinutes = hour * 60 + minute + 60;
  const endHour = Math.floor(endMinutes / 60) % 24; const endMinute = endMinutes % 60;
  const endDateValue = new Date(`${selectedDate}T12:00:00Z`);
  if (endMinutes >= 1440) endDateValue.setUTCDate(endDateValue.getUTCDate() + 1);
  const endDate = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(endDateValue);
  const pad = (value: number) => String(value).padStart(2, "0");
  return { title: "Тренировка", date: selectedDate, end_date: endDate, all_day: false, start_time: `${pad(hour)}:${pad(minute)}`, end_time: `${pad(endHour)}:${pad(endMinute)}` };
}

function assistantModels(message: string, hasImage: boolean) {
  const normalized = message.toLocaleLowerCase("bg-BG");
  const complexSignals = ["анализирай", "сравни", "направи план", "изготви план", "обобщи", "препоръчай", "оптимизирай", "прегледай седмицата", "прегледай месеца"];
  const multipleActions = (normalized.match(/(?:добави|създай|запиши|планирай|редактирай|изтрий)/gu) ?? []).length > 1;
  const complex = hasImage || normalized.length > 900 || multipleActions || complexSignals.some((signal) => normalized.includes(signal));
  return complex
    ? ["google/gemini-2.5-flash", "alibaba/qwen3.5-flash"]
    : ["google/gemini-2.5-flash-lite", "alibaba/qwen3.5-flash"];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  const body = await request.json().catch(() => null) as { messages?: Array<{ role?: string; content?: string }>; image?: string | null } | null;
  const history: ChatMessage[] = (body?.messages ?? []).slice(-20).filter((message) => (message.role === "user" || message.role === "assistant") && typeof message.content === "string").map((message) => ({ role: message.role as "user" | "assistant", content: message.content!.slice(0, 8000) }));
  if (!history.length || history.at(-1)?.role !== "user") return NextResponse.json({ error: "Напиши какво искаш да направя." }, { status: 400 });
  if (body?.image) {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(body.image) || body.image.length > 3_000_000) return NextResponse.json({ error: "Снимката е невалидна или прекалено голяма." }, { status: 400 });
    const last = history.at(-1)!;
    last.content = [{ type: "text", text: String(last.content) }, { type: "image_url", image_url: { url: body.image } }];
  }

  const latestText = typeof history.at(-1)?.content === "string" ? history.at(-1)!.content as string : "";
  const quickWorkout = !body?.image ? quickWorkoutEvent(latestText) : null;
  if (quickWorkout) {
    try {
      const result = await executeAssistantTool("save_event", quickWorkout, { supabase, user });
      revalidatePath("/today"); revalidatePath("/calendar"); revalidatePath("/workouts");
      return NextResponse.json({ message: `Добавих тренировка на ${quickWorkout.date} от ${quickWorkout.start_time} до ${quickWorkout.end_time}.`, actions: [{ tool: "save_event", result }] });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Действието не успя.";
      return NextResponse.json({ error: `Не успях да добавя тренировката: ${detail}` }, { status: 500 });
    }
  }

  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || request.headers.get("x-vercel-oidc-token");
  if (!token) return NextResponse.json({ error: "AI Gateway все още не е активиран за проекта." }, { status: 503 });

  const messages: ChatMessage[] = [{ role: "assistant", content: systemPrompt }, ...history];
  const actions: Array<{ tool: string; result: unknown }> = [];

  try {
    for (let step = 0; step < 6; step += 1) {
      type GatewayResult = { choices?: Array<{ message?: { role: "assistant"; content?: string | null; tool_calls?: ToolCall[] } }>; error?: { message?: string } };
      let result: GatewayResult | null = null;
      let lastError = "AI Gateway не отговори.";
      const models = assistantModels(latestText, Boolean(body?.image));
      for (const model of models) {
        const gatewayResponse = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Vercel-AI-App-Name": "Life Journal", "X-Vercel-AI-User": user.id },
          body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...messages.slice(1)], tools: assistantToolDefinitions, tool_choice: "auto", stream: false, max_tokens: 1800 }),
        });
        const candidate = await gatewayResponse.json() as GatewayResult;
        if (gatewayResponse.ok) { result = candidate; break; }
        lastError = candidate.error?.message ?? `AI Gateway: ${gatewayResponse.status}`;
        if (gatewayResponse.status !== 403 && gatewayResponse.status !== 429) break;
      }
      if (!result) throw new Error(lastError);
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
    const detail = error instanceof Error ? error.message.slice(0, 500) : "Неизвестна грешка от AI Gateway.";
    return NextResponse.json({ error: `AI Gateway отказа заявката: ${detail}` }, { status: 502 });
  } finally {
    ["/today", "/calendar", "/journal", "/nutrition", "/products", "/workouts"].forEach((path) => revalidatePath(path));
  }
}
