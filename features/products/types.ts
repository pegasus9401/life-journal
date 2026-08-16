export type ProductSource = "Open Food Facts" | "USDA" | "AI от снимка" | "Добавен ръчно";

export type FoodProduct = {
  id: string;
  name: string;
  brand: string;
  barcode: string;
  packageSize: string;
  servingGrams: number;
  calories100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  source: ProductSource;
  imageUrl: string;
  imagePath: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductDraft = Omit<FoodProduct, "createdAt" | "updatedAt">;

export function userProducts(metadata: Record<string, unknown> | undefined): FoodProduct[] {
  const value = metadata?.food_products;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is FoodProduct => Boolean(item && typeof item === "object" && typeof (item as FoodProduct).id === "string" && typeof (item as FoodProduct).name === "string"));
}
