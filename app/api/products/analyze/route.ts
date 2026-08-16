import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupFoodProducts } from "@/lib/food-product-lookup";

export const runtime = "nodejs";
export const maxDuration = 60;

type Analysis = { name?: string; brand?: string; barcode?: string; packageSize?: string; servingGrams?: number; calories100g?: number; protein100g?: number; carbs100g?: number; fat100g?: number; confidence?: number };

function parseJson(value: string) {
  const clean = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(clean) as Analysis;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || request.headers.get("x-vercel-oidc-token");
  if (!token) return NextResponse.json({ error: "AI Gateway не е активиран." }, { status: 503 });
  const body = await request.json().catch(() => null) as { image?: string } | null;
  if (!body?.image || !/^data:image\/(jpeg|png|webp);base64,/.test(body.image) || body.image.length > 3_000_000) return NextResponse.json({ error: "Снимката е невалидна или прекалено голяма." }, { status: 400 });

  const prompt = `Прочети тази снимка на хранителен продукт, баркод или хранителен етикет. Върни САМО валиден JSON без markdown със следните полета: name, brand, barcode, packageSize, servingGrams, calories100g, protein100g, carbs100g, fat100g, confidence. Всички хранителни стойности трябва да са за 100 г или 100 мл. Ако нещо не се вижда, използвай празен текст или 0. Не измисляй стойности. confidence е число от 0 до 1.`;
  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Vercel-AI-App-Name": "Life Journal Products" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: body.image } }] }], stream: false, max_tokens: 900, temperature: 0 }),
    });
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message ?? `AI Gateway: ${response.status}`);
    const analysis = parseJson(payload.choices?.[0]?.message?.content ?? "{}");
    const barcode = String(analysis.barcode ?? "").replace(/\D/g, "").slice(0, 14);
    if (barcode.length >= 8) {
      const products = await lookupFoodProducts("", barcode).catch(() => []);
      if (products.length) return NextResponse.json({ analysis, products, matchedByBarcode: true });
    }
    return NextResponse.json({ analysis, products: [], matchedByBarcode: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Снимката не можа да бъде анализирана." }, { status: 502 });
  }
}
