import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { ModelMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createPegasAgent } from "@/lib/ai/pegas-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestMessage = { role?: string; content?: string };
type RequestBody = { messages?: RequestMessage[]; image?: string | null };

function sofiaDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
}

function friendlyGeminiError(error: unknown) {
  const detail = error instanceof Error ? error.message.toLowerCase() : "";
  if (detail.includes("429") || detail.includes("rate limit") || detail.includes("quota") || detail.includes("resource_exhausted")) {
    return { status: 429, message: "Gemini е временно натоварен или безплатният лимит е достигнат. Изчакай малко и опитай отново." };
  }
  if (detail.includes("api key") || detail.includes("api_key_invalid") || detail.includes("permission_denied")) {
    return { status: 503, message: "Gemini още не е конфигуриран правилно. Провери API ключа в настройките на Vercel." };
  }
  return { status: 502, message: "Pegas не успя да отговори в момента. Опитай отново след малко." };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: "Gemini още не е активиран за PegasOS." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as RequestBody | null;
  const history: ModelMessage[] = (body?.messages ?? [])
    .slice(-20)
    .filter((message): message is Required<RequestMessage> =>
      (message.role === "user" || message.role === "assistant") && typeof message.content === "string",
    )
    .map((message): ModelMessage => ({
      role: message.role as "user" | "assistant",
      content: message.content.slice(0, 8000),
    }));

  if (!history.length || history.at(-1)?.role !== "user") {
    return NextResponse.json({ error: "Напиши какво искаш да направя." }, { status: 400 });
  }

  if (body?.image) {
    const match = body.image.match(/^data:(image\/(?:jpeg|png|webp));base64,/);
    if (!match || body.image.length > 3_000_000) {
      return NextResponse.json({ error: "Снимката е невалидна или прекалено голяма." }, { status: 400 });
    }
    const last = history.at(-1)!;
    last.content = [
      { type: "text", text: String(last.content) },
      { type: "file", data: body.image, mediaType: match[1] },
    ];
  }

  const actions: Array<{ tool: string; result: unknown }> = [];
  try {
    const agent = createPegasAgent({
      supabase,
      user,
      today: sofiaDate(),
      onAction: (action) => actions.push(action),
    });
    const result = await agent.generate({ messages: history });
    return NextResponse.json({ message: result.text || "Готово.", actions });
  } catch (error) {
          console.error("Gemini assistant stream error", error);
          const friendly = friendlyGeminiError(error);
          controller.enqueue(encoder.encode(`${JSON.stringify({ type: "error", error: friendly.message })}\n`));
        } finally {
          ["/today", "/calendar", "/journal", "/nutrition", "/workouts", "/profile"].forEach((path) => revalidatePath(path));
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    console.error("Gemini assistant error", error);
    const friendly = friendlyGeminiError(error);
    return NextResponse.json({ error: friendly.message }, { status: friendly.status });
  }
}

