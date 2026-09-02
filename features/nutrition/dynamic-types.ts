import type { FoodProduct } from "@/features/products/types";
import type { Recipe } from "@/features/recipes/types";

export type DynamicMealItem = {
  id: string; itemType: "product" | "recipe"; productId: string | null; recipeId: string | null;
  label: string; quantity: number; unit: string; calories: number; protein: number; carbs: number; fat: number; position: number;
};
export type DynamicMeal = { id: string; date: string; name: string; plannedTime: string | null; position: number; legacyPayload: Record<string, unknown> | null; createdAt: string; items: DynamicMealItem[] };
export type DynamicMealDraftItem = { id: string; itemType: "product" | "recipe"; referenceId: string; quantity: number };
export type DynamicMealDraft = { id: string; date: string; name: string; plannedTime: string; items: DynamicMealDraftItem[] };
export type MealTemplate = { id: string; name: string; description: string; archived: boolean; mealCount: number };
export type DynamicNutritionData = { meals: DynamicMeal[]; templates: MealTemplate[]; products: FoodProduct[]; recipes: Recipe[] };
export type MealSource = "food_photo" | "assistant" | "manual" | "dynamic";

export function mealSource(meal: Pick<DynamicMeal, "items" | "legacyPayload">): MealSource {
  const source = meal.legacyPayload?.source;
  if (source === "food_photo" || source === "assistant" || source === "manual") return source;
  return meal.items.length ? "dynamic" : "manual";
}

export function mealCompleted(meal: Pick<DynamicMeal, "plannedTime" | "legacyPayload">) {
  return typeof meal.legacyPayload?.completed_at === "string" || !meal.plannedTime;
}

export function mealDescription(meal: Pick<DynamicMeal, "legacyPayload">) {
  return typeof meal.legacyPayload?.description === "string" ? meal.legacyPayload.description : "";
}

export function mealTotals(meal: Pick<DynamicMeal, "items"> & Partial<Pick<DynamicMeal, "legacyPayload">>) {
  const legacy = meal.legacyPayload?.nutrition as Partial<Record<"calories" | "protein" | "carbs" | "fat", unknown>> | undefined;
  if (legacy) return {
    calories: Number(legacy.calories) || 0,
    protein: Number(legacy.protein) || 0,
    carbs: Number(legacy.carbs) || 0,
    fat: Number(legacy.fat) || 0,
  };
  return meal.items.reduce((sum, item) => ({
    calories: sum.calories + item.calories,
    protein: sum.protein + item.protein,
    carbs: sum.carbs + item.carbs,
    fat: sum.fat + item.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}
