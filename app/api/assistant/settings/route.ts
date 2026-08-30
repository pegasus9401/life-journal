import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PERSONAS } from "@/lib/ai/intelligence";

const personaSchema = z.object({ persona: z.enum(PERSONAS) });

export async function GET() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  const { data, error } = await supabase.from("ai_preferences").select("persona").eq("owner_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Настройката не може да се зареди." }, { status: 500 });
  return NextResponse.json({ persona: PERSONAS.includes(data?.persona) ? data?.persona : "friend" });
}

export async function POST(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  const parsed = personaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Невалидна persona." }, { status: 400 });
  const { error } = await supabase.from("ai_preferences").upsert({ owner_id: user.id, persona: parsed.data.persona }, { onConflict: "owner_id" });
  if (error) return NextResponse.json({ error: "Настройката не беше запазена." }, { status: 500 });
  return NextResponse.json({ persona: parsed.data.persona });
}
