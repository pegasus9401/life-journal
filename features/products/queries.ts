import { cache } from "react";
import { getAuthenticatedClient } from "@/lib/supabase/server";
import type { FoodProduct, ProductPrice, ProductSource } from "./types";

type ProductRow = {
  id: string; name: string; brand: string; barcode: string; package_size: string;
  serving_grams: number; calories_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number;
  source: ProductSource; image_url: string; image_path: string; favorite: boolean; created_at: string; updated_at: string;
  product_prices?: Array<{ id: string; price: number; store: string; recorded_at: string }>;
};

export function productRowToFoodProduct(row: ProductRow): FoodProduct {
  const prices: ProductPrice[] = (row.product_prices ?? []).map((price) => ({ id: price.id, price: Number(price.price), store: price.store, recordedAt: price.recorded_at }));
  prices.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  return {
    id: row.id, name: row.name, brand: row.brand, barcode: row.barcode, packageSize: row.package_size,
    servingGrams: Number(row.serving_grams), calories100g: Number(row.calories_100g), protein100g: Number(row.protein_100g),
    carbs100g: Number(row.carbs_100g), fat100g: Number(row.fat_100g), source: row.source,
    imageUrl: row.image_url, imagePath: row.image_path, favorite: row.favorite, priceHistory: prices,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export const getFoodProducts = cache(async () => {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return null;
  const { data, error } = await supabase.from("products").select("*, product_prices(id, price, store, recorded_at)").eq("owner_id", user.id).order("updated_at", { ascending: false });
  if (error) throw new Error(`Продуктите не могат да се заредят: ${error.message}`);
  return { supabase, products: (data ?? []).map((row) => productRowToFoodProduct(row as ProductRow)) };
});

