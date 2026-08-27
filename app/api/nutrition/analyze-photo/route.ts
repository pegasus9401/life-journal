import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Analysis = { name?: string; description?: string; calories?: number; protein?: number; carbs?: number; fat?: number; confidence?: number };

function parseJson(value: string) {
  return JSON.parse(value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()) as Analysis;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || request.headers.get("x-vercel-oidc-token");
  if (!token) return NextResponse.json({ error: "AI анализът не е активиран." }, { status: 503 });
  const body = await request.json().catch(() => null) as { image?: string; description?: string } | null;
  if (!body?.image || !/^data:image\/(jpeg|png|webp);base64,/.test(body.image) || body.image.length > 3_000_000) return NextResponse.json({ error: "Снимката е невалидна или прекалено голяма." }, { status: 400 });
  const note = String(body.description ?? "").trim().slice(0, 500);
  const prompt = `Анализирай снимката на готово ястие. ${note ? `Потребителят добави описание: ${note}.` : ""} Оцени цялата видима порция, а не стойности за 100 г. Върни САМО валиден JSON без markdown: {"name":"кратко име на български","description":"кратък списък на разпознатите храни на български","calories":число,"protein":число в грамове,"carbs":число в грамове,"fat":число в грамове,"confidence":число от 0 до 1}. Дай реалистична приблизителна оценка и не задавай въпроси.`;
  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Vercel-AI-App-Name": "PegasOS Food Capture" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: body.image } }] }], stream: false, max_tokens: 700, temperature: .1 }),
    });
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message ?? `AI Gateway: ${response.status}`);
    return NextResponse.json({ analysis: parseJson(payload.choices?.[0]?.message?.content ?? "{}") });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Храната не можа да бъде анализирана." }, { status: 502 });
  }
}

