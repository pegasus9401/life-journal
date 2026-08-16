import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupFoodProducts } from "@/lib/food-product-lookup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  const body = await request.json().catch(() => null) as { query?: string; barcode?: string } | null;
  try {
    const products = await lookupFoodProducts(String(body?.query ?? ""), String(body?.barcode ?? ""));
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Търсенето не успя." }, { status: 502 });
  }
}
