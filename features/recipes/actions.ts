"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RecipeDraft } from "./types";

const numberInRange = (value: unknown, min: number, max: number) => Math.min(max, Math.max(min, Number(value) || min));

export async function saveRecipe(input: RecipeDraft) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Сесията изтече.", recipe: null };
  const id = /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(input.id) ? input.id : crypto.randomUUID();
  const recipe = {
    id, owner_id: user.id, name: String(input.name ?? "").trim().slice(0, 160),
    description: String(input.description ?? "").trim().slice(0, 1000), instructions: String(input.instructions ?? "").trim().slice(0, 10000),
    servings: numberInRange(input.servings, 0.01, 1000), favorite: Boolean(input.favorite),
  };
  if (!recipe.name) return { ok: false, message: "Въведи име на рецептата.", recipe: null };
  const ingredients = input.ingredients.map((item, position) => ({
    id: /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(item.id) ? item.id : crypto.randomUUID(),
    owner_id: user.id, recipe_id: id, product_id: String(item.productId),
    quantity: numberInRange(item.quantity, 0.01, 100000), unit: String(item.unit || "g").trim().slice(0, 30) || "g",
    grams: numberInRange(item.grams, 0.01, 100000), position,
  })).filter((item) => item.product_id);
  if (!ingredients.length) return { ok: false, message: "Добави поне една съставка.", recipe: null };
  if (new Set(ingredients.map((item) => item.product_id)).size !== ingredients.length) return { ok: false, message: "Всеки продукт може да участва само веднъж в рецептата.", recipe: null };

  const { data: ownedProducts, error: productsError } = await supabase.from("products").select("id").eq("owner_id", user.id).in("id", ingredients.map((item) => item.product_id));
  if (productsError || (ownedProducts?.length ?? 0) !== ingredients.length) return { ok: false, message: "Една от съставките вече не съществува.", recipe: null };
  const { error: recipeError } = await supabase.from("recipes").upsert(recipe, { onConflict: "id" });
  if (recipeError) return { ok: false, message: `Рецептата не можа да бъде запазена: ${recipeError.message}`, recipe: null };
  const { error: clearError } = await supabase.from("recipe_ingredients").delete().eq("owner_id", user.id).eq("recipe_id", id);
  if (clearError) return { ok: false, message: "Рецептата е запазена, но съставките не можаха да бъдат обновени.", recipe: null };
  const { error: ingredientsError } = await supabase.from("recipe_ingredients").insert(ingredients);
  if (ingredientsError) return { ok: false, message: `Съставките не можаха да бъдат запазени: ${ingredientsError.message}`, recipe: null };
  revalidatePath("/recipes"); revalidatePath("/nutrition");
  return { ok: true, message: "Рецептата е запазена.", recipe: { ...input, id, ingredients: ingredients.map((item) => ({ id: item.id, productId: item.product_id, quantity: item.quantity, unit: item.unit, grams: item.grams, position: item.position })) } };
}

export async function deleteRecipe(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Сесията изтече." };
  const { error } = await supabase.from("recipes").delete().eq("owner_id", user.id).eq("id", id);
  if (error) return { ok: false, message: "Рецептата не можа да бъде изтрита." };
  revalidatePath("/recipes"); revalidatePath("/nutrition");
  return { ok: true, message: "Рецептата е изтрита." };
}


