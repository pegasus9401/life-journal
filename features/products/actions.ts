"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { userProducts, type FoodProduct, type ProductDraft, type ProductSource } from "./types";

const sources: ProductSource[] = ["Open Food Facts", "USDA", "AI от снимка", "Добавен ръчно"];
const cleanNumber = (value: unknown, max = 100000) => Math.min(max, Math.max(0, Number(value) || 0));

function cleanProduct(input: ProductDraft, existing?: Pick<FoodProduct, "createdAt">): FoodProduct {
  const now = new Date().toISOString();
  return {
    id: String(input.id || crypto.randomUUID()).slice(0, 80), name: String(input.name ?? "").trim().slice(0, 160),
    brand: String(input.brand ?? "").trim().slice(0, 120), barcode: String(input.barcode ?? "").replace(/\D/g, "").slice(0, 14),
    packageSize: String(input.packageSize ?? "").trim().slice(0, 80), servingGrams: cleanNumber(input.servingGrams, 100000),
    calories100g: cleanNumber(input.calories100g), protein100g: cleanNumber(input.protein100g, 1000),
    carbs100g: cleanNumber(input.carbs100g, 1000), fat100g: cleanNumber(input.fat100g, 1000),
    source: sources.includes(input.source) ? input.source : "Добавен ръчно", imageUrl: String(input.imageUrl ?? "").slice(0, 1000),
    imagePath: String(input.imagePath ?? "").slice(0, 500), favorite: Boolean(input.favorite),
    priceHistory: (Array.isArray(input.priceHistory) ? input.priceHistory : []).slice(0, 30).map((entry) => ({
      id: String(entry.id || crypto.randomUUID()).slice(0, 80), price: cleanNumber(entry.price, 100000),
      store: String(entry.store ?? "").trim().slice(0, 120), recordedAt: /^\d{4}-\d{2}-\d{2}$/.test(String(entry.recordedAt)) ? String(entry.recordedAt) : now.slice(0, 10),
    })).filter((entry) => entry.price > 0), createdAt: existing?.createdAt ?? now, updatedAt: now,
  };
}

export async function saveFoodProduct(input: ProductDraft) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Сесията изтече.", product: null };
  const legacyProducts = userProducts(user.user_metadata as Record<string, unknown>);
  const { data: existingRow } = await supabase.from("products").select("created_at").eq("owner_id", user.id).eq("id", String(input.id)).maybeSingle();
  const legacyExisting = legacyProducts.find((item) => item.id === input.id);
  const product = cleanProduct(input, legacyExisting ?? (existingRow ? { createdAt: existingRow.created_at } : undefined));
  if (!product.name) return { ok: false, message: "Въведи име на продукта.", product: null };

  const { error: productError } = await supabase.from("products").upsert({
    id: product.id, owner_id: user.id, name: product.name, brand: product.brand, barcode: product.barcode,
    package_size: product.packageSize, serving_grams: product.servingGrams, calories_100g: product.calories100g,
    protein_100g: product.protein100g, carbs_100g: product.carbs100g, fat_100g: product.fat100g,
    source: product.source, image_url: product.imageUrl, image_path: product.imagePath, favorite: product.favorite,
    created_at: product.createdAt, updated_at: product.updatedAt,
  }, { onConflict: "owner_id,id" });
  if (productError) return { ok: false, message: `Продуктът не можа да бъде запазен: ${productError.message}`, product: null };
  if (product.barcode) await supabase.from("products").delete().eq("owner_id", user.id).eq("barcode", product.barcode).neq("id", product.id);

  const { error: clearPricesError } = await supabase.from("product_prices").delete().eq("owner_id", user.id).eq("product_id", product.id);
  if (clearPricesError) return { ok: false, message: "Продуктът е запазен, но цените не можаха да бъдат обновени.", product };
  if (product.priceHistory.length) {
    const { error: pricesError } = await supabase.from("product_prices").insert(product.priceHistory.map((price) => ({
      id: price.id, owner_id: user.id, product_id: product.id, price: price.price, store: price.store, recorded_at: price.recordedAt,
    })));
    if (pricesError) return { ok: false, message: "Продуктът е запазен, но историята на цените не можа да бъде обновена.", product };
  }

  const withoutCurrent = legacyProducts.filter((item) => item.id !== product.id && (!product.barcode || item.barcode !== product.barcode));
  const { error: legacyError } = await supabase.auth.updateUser({ data: { food_products: [product, ...withoutCurrent].slice(0, 500) } });
  revalidatePath("/products"); revalidatePath("/nutrition");
  return { ok: true, message: legacyError ? "Продуктът е запазен. Legacy копието ще се синхронизира при следващо редактиране." : "Продуктът е запазен.", product };
}

export async function deleteFoodProduct(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Сесията изтече." };
  const { error: productError } = await supabase.from("products").delete().eq("owner_id", user.id).eq("id", id);
  if (productError) return { ok: false, message: "Продуктът не можа да бъде изтрит." };
  const legacy = userProducts(user.user_metadata as Record<string, unknown>).filter((item) => item.id !== id);
  const { error: legacyError } = await supabase.auth.updateUser({ data: { food_products: legacy } });
  revalidatePath("/products"); revalidatePath("/nutrition");
  return { ok: true, message: legacyError ? "Продуктът е изтрит. Legacy копието ще бъде почистено по-късно." : "Продуктът е изтрит." };
}


