"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { userProducts, type FoodProduct, type ProductDraft, type ProductSource } from "./types";

const sources: ProductSource[] = ["Open Food Facts", "USDA", "AI от снимка", "Добавен ръчно"];
const cleanNumber = (value: unknown, max = 100000) => Math.min(max, Math.max(0, Number(value) || 0));

function cleanProduct(input: ProductDraft, existing?: FoodProduct): FoodProduct {
  const now = new Date().toISOString();
  return {
    id: String(input.id || crypto.randomUUID()).slice(0, 80),
    name: String(input.name ?? "").trim().slice(0, 160),
    brand: String(input.brand ?? "").trim().slice(0, 120),
    barcode: String(input.barcode ?? "").replace(/\D/g, "").slice(0, 14),
    packageSize: String(input.packageSize ?? "").trim().slice(0, 80),
    servingGrams: cleanNumber(input.servingGrams, 100000),
    calories100g: cleanNumber(input.calories100g),
    protein100g: cleanNumber(input.protein100g, 1000),
    carbs100g: cleanNumber(input.carbs100g, 1000),
    fat100g: cleanNumber(input.fat100g, 1000),
    source: sources.includes(input.source) ? input.source : "Добавен ръчно",
    imageUrl: String(input.imageUrl ?? "").slice(0, 1000),
    imagePath: String(input.imagePath ?? "").slice(0, 500),
    favorite: Boolean(input.favorite),
    priceHistory: (Array.isArray(input.priceHistory) ? input.priceHistory : []).slice(0, 30).map((entry) => ({
      id: String(entry.id || crypto.randomUUID()).slice(0, 80),
      price: cleanNumber(entry.price, 100000),
      store: String(entry.store ?? "").trim().slice(0, 120),
      recordedAt: /^\d{4}-\d{2}-\d{2}$/.test(String(entry.recordedAt)) ? String(entry.recordedAt) : now.slice(0, 10),
    })).filter((entry) => entry.price > 0),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function saveFoodProduct(input: ProductDraft) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Сесията изтече.", product: null };
  const products = userProducts(user.user_metadata as Record<string, unknown>);
  const existing = products.find((item) => item.id === input.id);
  const product = cleanProduct(input, existing);
  if (!product.name) return { ok: false, message: "Въведи име на продукта.", product: null };
  const withoutCurrent = products.filter((item) => item.id !== product.id && (!product.barcode || item.barcode !== product.barcode));
  const next = [product, ...withoutCurrent].slice(0, 500);
  const { error } = await supabase.auth.updateUser({ data: { food_products: next } });
  if (error) return { ok: false, message: error.message, product: null };
  revalidatePath("/products"); revalidatePath("/nutrition");
  return { ok: true, message: "Продуктът е запазен.", product };
}

export async function deleteFoodProduct(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Сесията изтече." };
  const next = userProducts(user.user_metadata as Record<string, unknown>).filter((item) => item.id !== id);
  const { error } = await supabase.auth.updateUser({ data: { food_products: next } });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/products");
  return { ok: true, message: "Продуктът е изтрит." };
}
