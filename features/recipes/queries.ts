import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { productRowToFoodProduct } from "@/features/products/queries";
import type { Recipe, RecipeIngredient } from "./types";

type RecipeRow = { id: string; name: string; description: string; instructions: string; servings: number; favorite: boolean; created_at: string; updated_at: string };
type IngredientRow = { id: string; recipe_id: string; product_id: string; quantity: number; unit: string; grams: number; position: number };

export const getRecipeLibrary = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [recipesResult, ingredientsResult, productsResult] = await Promise.all([
    supabase.from("recipes").select("*").eq("owner_id", user.id).order("favorite", { ascending: false }).order("updated_at", { ascending: false }),
    supabase.from("recipe_ingredients").select("id, recipe_id, product_id, quantity, unit, grams, position").eq("owner_id", user.id).order("position"),
    supabase.from("products").select("*, product_prices(id, price, store, recorded_at)").eq("owner_id", user.id).order("name"),
  ]);
  if (recipesResult.error) throw new Error(`Рецептите не могат да се заредят: ${recipesResult.error.message}`);
  if (ingredientsResult.error) throw new Error(`Съставките не могат да се заредят: ${ingredientsResult.error.message}`);
  if (productsResult.error) throw new Error(`Продуктите не могат да се заредят: ${productsResult.error.message}`);

  const ingredientRows = (ingredientsResult.data ?? []) as IngredientRow[];
  const recipes: Recipe[] = ((recipesResult.data ?? []) as RecipeRow[]).map((row) => ({
    id: row.id, name: row.name, description: row.description, instructions: row.instructions,
    servings: Number(row.servings), favorite: row.favorite, createdAt: row.created_at, updatedAt: row.updated_at,
    ingredients: ingredientRows.filter((item) => item.recipe_id === row.id).map((item): RecipeIngredient => ({
      id: item.id, productId: item.product_id, quantity: Number(item.quantity), unit: item.unit, grams: Number(item.grams), position: item.position,
    })),
  }));
  return { recipes, products: (productsResult.data ?? []).map((row) => productRowToFoodProduct(row as Parameters<typeof productRowToFoodProduct>[0])) };
});

