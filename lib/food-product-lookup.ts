export type ExternalFoodProduct = {
  id: string; name: string; brand: string; barcode: string; packageSize: string; servingGrams: number;
  calories100g: number; protein100g: number; carbs100g: number; fat100g: number; imageUrl: string; source: "Open Food Facts";
};

const number = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

export async function lookupFoodProducts(query: string, barcode: string) {
  const cleanBarcode = barcode.replace(/\D/g, "").slice(0, 14);
  const cleanQuery = query.trim().slice(0, 160);
  if (!cleanBarcode && !cleanQuery) return [];
  const fields = "code,product_name,product_name_bg,brands,quantity,serving_quantity,nutriments,image_front_small_url,image_front_url";
  const url = cleanBarcode ? new URL(`https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`) : new URL("https://world.openfoodfacts.org/cgi/search.pl");
  if (cleanBarcode) url.searchParams.set("fields", fields);
  else {
    url.searchParams.set("search_terms", cleanQuery); url.searchParams.set("search_simple", "1"); url.searchParams.set("action", "process");
    url.searchParams.set("json", "1"); url.searchParams.set("page_size", "8"); url.searchParams.set("sort_by", "popularity_key"); url.searchParams.set("fields", fields);
  }
  const response = await fetch(url, { headers: { "User-Agent": "LifeJournal/1.0 (https://github.com/pegasus9401/life-journal)" }, signal: AbortSignal.timeout(9000), cache: "no-store" });
  if (!response.ok) throw new Error(`Open Food Facts не отговори (${response.status}).`);
  const payload = await response.json() as { product?: Record<string, unknown>; products?: Array<Record<string, unknown>> };
  return (payload.product ? [payload.product] : payload.products ?? []).flatMap((raw): ExternalFoodProduct[] => {
    const nutrients = (raw.nutriments ?? {}) as Record<string, unknown>;
    const name = String(raw.product_name_bg || raw.product_name || "").trim();
    if (!name) return [];
    const code = String(raw.code ?? "");
    return [{
      id: `off-${code || crypto.randomUUID()}`, name, brand: String(raw.brands ?? ""), barcode: code,
      packageSize: String(raw.quantity ?? ""), servingGrams: number(raw.serving_quantity) || 100,
      calories100g: Math.round(number(nutrients["energy-kcal_100g"])), protein100g: Math.round(number(nutrients.proteins_100g) * 10) / 10,
      carbs100g: Math.round(number(nutrients.carbohydrates_100g) * 10) / 10, fat100g: Math.round(number(nutrients.fat_100g) * 10) / 10,
      imageUrl: String(raw.image_front_small_url || raw.image_front_url || ""), source: "Open Food Facts",
    }];
  });
}
