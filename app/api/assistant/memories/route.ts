import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const memorySchema = z.object({ id: z.uuid().optional(), category: z.enum(["goal", "preference", "training", "nutrition", "routine", "communication"]), content: z.string().trim().min(1).max(1000), keywords: z.array(z.string().trim().min(1).max(80)).max(20).default([]), enabled: z.boolean().default(true) });

export async function GET() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  const { data, error } = await supabase.from("ai_memories").select("id,category,content,keywords,enabled,created_at,updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Паметта не може да се зареди." }, { status: 500 });
  return NextResponse.json({ memories: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  const parsed = memorySchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Провери съдържанието на memory записа." }, { status: 400 });
  const row = { owner_id: user.id, category: parsed.data.category, content: parsed.data.content, keywords: parsed.data.keywords, enabled: parsed.data.enabled };
  const query = parsed.data.id ? supabase.from("ai_memories").update(row).eq("id", parsed.data.id).eq("owner_id", user.id) : supabase.from("ai_memories").insert(row);
  const { data, error } = await query.select("id,category,content,keywords,enabled,created_at,updated_at").single(); if (error) return NextResponse.json({ error: "Memory записът не беше запазен." }, { status: 500 });
  return NextResponse.json({ memory: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id"); if (!id || !z.uuid().safeParse(id).success) return NextResponse.json({ error: "Невалиден запис." }, { status: 400 });
  const { error } = await supabase.from("ai_memories").delete().eq("id", id).eq("owner_id", user.id); if (error) return NextResponse.json({ error: "Memory записът не беше изтрит." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
