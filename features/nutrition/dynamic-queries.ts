import { cache } from "react";
import { getAuthenticatedClient } from "@/lib/supabase/server";
import { getRecipeLibrary } from "@/features/recipes/queries";
import type { DynamicMeal, DynamicMealItem, DynamicNutritionData, MealTemplate } from "./dynamic-types";

type MealRow = { id: string; meal_date: string; name: string; planned_time: string | null; position: number; legacy_payload: Record<string, unknown> | null; created_at: string };
type ItemRow = { id: string; day_meal_id: string; item_type: "product" | "recipe"; product_id: string | null; recipe_id: string | null; label: string; quantity: number; unit: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; position: number };

function mapMeals(mealRows: MealRow[], itemRows: ItemRow[]) {
  const itemsByMeal = new Map<string, ItemRow[]>();
  for (const item of itemRows) itemsByMeal.set(item.day_meal_id, [...(itemsByMeal.get(item.day_meal_id) ?? []), item]);
  return mealRows.map((meal): DynamicMeal => ({
    id: meal.id, date: meal.meal_date, name: meal.name, plannedTime: meal.planned_time?.slice(0, 5) ?? null, position: meal.position, legacyPayload: meal.legacy_payload, createdAt: meal.created_at,
    items: (itemsByMeal.get(meal.id) ?? []).map((item): DynamicMealItem => ({ id: item.id, itemType: item.item_type, productId: item.product_id, recipeId: item.recipe_id, label: item.label, quantity: Number(item.quantity), unit: item.unit, calories: Number(item.calories), protein: Number(item.protein_g), carbs: Number(item.carbs_g), fat: Number(item.fat_g), position: item.position })),
  }));
}

export const getDynamicNutritionTimelineDay = cache(async (date: string) => {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return null;
  const mealsResult = await supabase.from("day_meals").select("id, meal_date, name, planned_time, position, legacy_payload, created_at").eq("owner_id", user.id).eq("meal_date", date).order("position").order("created_at");
  if (mealsResult.error) throw new Error(`Дневните хранения не могат да се заредят: ${mealsResult.error.message}`);
  const mealRows = (mealsResult.data ?? []) as MealRow[];
  if (!mealRows.length) return [] as DynamicMeal[];
  const { data: items, error } = await supabase.from("meal_items").select("id, day_meal_id, item_type, product_id, recipe_id, label, quantity, unit, calories, protein_g, carbs_g, fat_g, position").eq("owner_id", user.id).in("day_meal_id", mealRows.map((meal) => meal.id)).order("position");
  if (error) throw new Error(`Храните не могат да се заредят: ${error.message}`);
  return mapMeals(mealRows, (items ?? []) as ItemRow[]);
});

export const getDynamicNutritionDay = cache(async (date: string): Promise<DynamicNutritionData | null> => {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return null;
  const mealsPromise = supabase.from("day_meals").select("id, meal_date, name, planned_time, position, legacy_payload, created_at").eq("owner_id", user.id).eq("meal_date", date).order("position").order("created_at");
  const templatesPromise = supabase.from("meal_templates").select("id, name, description, archived").eq("owner_id", user.id).eq("archived", false).order("updated_at", { ascending: false });
  const templateMealsPromise = supabase.from("template_meals").select("id, template_id").eq("owner_id", user.id);
  const [mealsResult, templatesResult, templateMealsResult, library] = await Promise.all([
    mealsPromise,
    templatesPromise,
    templateMealsPromise,
    getRecipeLibrary(),
  ]);
  if (mealsResult.error) throw new Error(`Дневните хранения не могат да се заредят: ${mealsResult.error.message}`);
  if (templatesResult.error || templateMealsResult.error) throw new Error("Хранителните шаблони не могат да се заредят.");
  if (!library) return null;
  const mealRows = (mealsResult.data ?? []) as MealRow[];
  const itemsResult = mealRows.length
    ? await supabase.from("meal_items").select("id, day_meal_id, item_type, product_id, recipe_id, label, quantity, unit, calories, protein_g, carbs_g, fat_g, position").eq("owner_id", user.id).in("day_meal_id", mealRows.map((meal) => meal.id)).order("position")
    : { data: [] as ItemRow[], error: null };
  if (itemsResult.error) throw new Error(`Храните не могат да се заредят: ${itemsResult.error.message}`);
  const meals = mapMeals(mealRows, (itemsResult.data ?? []) as ItemRow[]);
  const templateMealRows = templateMealsResult.data ?? [];
  const templateMealCounts = new Map<string, number>();
  for (const meal of templateMealRows) templateMealCounts.set(meal.template_id, (templateMealCounts.get(meal.template_id) ?? 0) + 1);
  const templates: MealTemplate[] = (templatesResult.data ?? []).map((template) => ({ id: template.id, name: template.name, description: template.description, archived: template.archived, mealCount: templateMealCounts.get(template.id) ?? 0 }));
  return { meals, templates, products: library.products, recipes: library.recipes };
});
