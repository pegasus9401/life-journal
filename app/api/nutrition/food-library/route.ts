import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  const { data, error } = await supabase.from("products").select("id, name, brand, serving_grams, calories_100g, protein_100g, carbs_100g, fat_100g, favorite, source").eq("owner_id", user.id).order("favorite", { ascending: false }).order("name").limit(250);
  if (error) return NextResponse.json({ error: "Храните не могат да бъдат заредени." }, { status: 500 });
  return NextResponse.json({ foods: (data ?? []).map((row) => ({ id: row.id, name: row.name, brand: row.brand ?? "", servingGrams: Number(row.serving_grams) || 100, calories100g: Number(row.calories_100g) || 0, protein100g: Number(row.protein_100g) || 0, carbs100g: Number(row.carbs_100g) || 0, fat100g: Number(row.fat_100g) || 0, favorite: Boolean(row.favorite), source: row.source ?? "" })) });
}

