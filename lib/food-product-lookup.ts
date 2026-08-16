export type ExternalFoodProduct = {
  id: string; name: string; brand: string; barcode: string; packageSize: string; servingGrams: number;
  calories100g: number; protein100g: number; carbs100g: number; fat100g: number; imageUrl: string; source: "Open Food Facts" | "USDA";
};

const number = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const normalize = (value: string) => value.toLocaleLowerCase("bg-BG").trim().replace(/\s+/g, " ");
const genericFoods: ExternalFoodProduct[] = [
  { id: "generic-banana", name: "Банан", brand: "Натурален продукт", barcode: "", packageSize: "100 г", servingGrams: 100, calories100g: 89, protein100g: 1.1, carbs100g: 22.8, fat100g: .3, imageUrl: "", source: "USDA" },
  { id: "generic-apple", name: "Ябълка", brand: "Натурален продукт", barcode: "", packageSize: "100 г", servingGrams: 100, calories100g: 52, protein100g: .3, carbs100g: 13.8, fat100g: .2, imageUrl: "", source: "USDA" },
  { id: "generic-potato", name: "Картофи", brand: "Натурален продукт", barcode: "", packageSize: "100 г", servingGrams: 100, calories100g: 77, protein100g: 2, carbs100g: 17.5, fat100g: .1, imageUrl: "", source: "USDA" },
  { id: "generic-rice", name: "Ориз, сварен", brand: "Натурален продукт", barcode: "", packageSize: "100 г", servingGrams: 100, calories100g: 130, protein100g: 2.7, carbs100g: 28.2, fat100g: .3, imageUrl: "", source: "USDA" },
  { id: "generic-chicken", name: "Пилешки гърди, печени", brand: "Натурален продукт", barcode: "", packageSize: "100 г", servingGrams: 100, calories100g: 165, protein100g: 31, carbs100g: 0, fat100g: 3.6, imageUrl: "", source: "USDA" },
  { id: "generic-egg", name: "Яйце", brand: "Натурален продукт", barcode: "", packageSize: "100 г", servingGrams: 100, calories100g: 143, protein100g: 12.6, carbs100g: .7, fat100g: 9.5, imageUrl: "", source: "USDA" },
  { id: "generic-oats", name: "Овесени ядки", brand: "Натурален продукт", barcode: "", packageSize: "100 г", servingGrams: 100, calories100g: 379, protein100g: 13.2, carbs100g: 67.7, fat100g: 6.5, imageUrl: "", source: "USDA" },
];
const genericAliases: Record<string, string> = {
  "банан": "generic-banana", "банани": "generic-banana",
  "ябълка": "generic-apple", "ябълки": "generic-apple",
  "картоф": "generic-potato", "картофи": "generic-potato",
  "ориз": "generic-rice", "сварен ориз": "generic-rice",
  "пилешки гърди": "generic-chicken", "пилешко филе": "generic-chicken",
  "яйце": "generic-egg", "яйца": "generic-egg",
  "овес": "generic-oats", "овесени ядки": "generic-oats",
};

export async function lookupFoodProducts(query: string, barcode: string) {
  const cleanBarcode = barcode.replace(/\D/g, "").slice(0, 14);
  const cleanQuery = query.trim().slice(0, 160);
  if (!cleanBarcode && !cleanQuery) return [];
  const normalizedQuery = normalize(cleanQuery);
  const aliasId = genericAliases[normalizedQuery];
  const genericMatches = cleanBarcode ? [] : genericFoods.filter((food) => food.id === aliasId || normalize(food.name) === normalizedQuery);
  if (genericMatches.length) return genericMatches;
  const fields = "code,product_name,product_name_bg,brands,quantity,serving_quantity,nutriments,image_front_small_url,image_front_url";
  const url = cleanBarcode ? new URL(`https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`) : new URL("https://world.openfoodfacts.org/cgi/search.pl");
  if (cleanBarcode) url.searchParams.set("fields", fields);
  else {
    url.searchParams.set("search_terms", cleanQuery); url.searchParams.set("search_simple", "1"); url.searchParams.set("action", "process");
    url.searchParams.set("json", "1"); url.searchParams.set("page_size", "8"); url.searchParams.set("sort_by", "popularity_key"); url.searchParams.set("fields", fields);
  }
  const response = await fetch(url, { headers: { "User-Agent": "LifeJournal/1.0 (https://github.com/pegasus9401/life-journal)" }, signal: AbortSignal.timeout(9000), cache: "no-store" }).catch(() => null);
  if (!response?.ok) return [];
  const payload = await response.json() as { product?: Record<string, unknown>; products?: Array<Record<string, unknown>> };
  const packaged = (payload.product ? [payload.product] : payload.products ?? []).flatMap((raw): ExternalFoodProduct[] => {
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
  return [...genericMatches, ...packaged.filter((product) => !genericMatches.some((generic) => normalize(generic.name) === normalize(product.name)))];
}
