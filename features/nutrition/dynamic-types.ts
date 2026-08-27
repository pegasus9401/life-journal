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

export function mealTotals(meal: Pick<DynamicMeal, "items">) {
  return meal.items.reduce((sum, item) => ({ calories: sum.calories + item.calories, protein: sum.protein + item.protein, carbs: sum.carbs + item.carbs, fat: sum.fat + item.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}



