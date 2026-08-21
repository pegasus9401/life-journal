"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DynamicMealDraft, DynamicMealDraftItem } from "./dynamic-types";

const uuid = (value: string) => /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(value) ? value : crypto.randomUUID();
const amount = (value: unknown, max = 100000) => Math.min(max, Math.max(.01, Number(value) || .01));

async function resolveItems(supabase: Awaited<ReturnType<typeof createClient>>, ownerId: string, items: DynamicMealDraftItem[]) {
  const productIds = [...new Set(items.filter((item) => item.itemType === "product").map((item) => item.referenceId))];
  const recipeIds = [...new Set(items.filter((item) => item.itemType === "recipe").map((item) => item.referenceId))];
  const [productsResult, recipesResult, ingredientsResult] = await Promise.all([
    productIds.length ? supabase.from("products").select("id, name, calories_100g, protein_100g, carbs_100g, fat_100g").eq("owner_id", ownerId).in("id", productIds) : Promise.resolve({ data: [], error: null }),
    recipeIds.length ? supabase.from("recipes").select("id, name, servings").eq("owner_id", ownerId).in("id", recipeIds) : Promise.resolve({ data: [], error: null }),
    recipeIds.length ? supabase.from("recipe_ingredients").select("recipe_id, product_id, grams").eq("owner_id", ownerId).in("recipe_id", recipeIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (productsResult.error || recipesResult.error || ingredientsResult.error) throw new Error("Избраните храни не могат да бъдат заредени.");
  const ingredientProductIds = [...new Set((ingredientsResult.data ?? []).map((item) => item.product_id))];
  const { data: ingredientProducts, error: ingredientProductsError } = ingredientProductIds.length ? await supabase.from("products").select("id, calories_100g, protein_100g, carbs_100g, fat_100g").eq("owner_id", ownerId).in("id", ingredientProductIds) : { data: [], error: null };
  if (ingredientProductsError) throw new Error("Продуктите в рецептите не могат да бъдат заредени.");
  const directProducts = new Map((productsResult.data ?? []).map((row) => [row.id, row]));
  const recipeMap = new Map((recipesResult.data ?? []).map((row) => [row.id, row]));
  const ingredientProductMap = new Map((ingredientProducts ?? []).map((row) => [row.id, row]));

  return items.map((item, position) => {
    const quantity = amount(item.quantity);
    if (item.itemType === "product") {
      const product = directProducts.get(item.referenceId); if (!product) throw new Error("Избран продукт вече не съществува.");
      const factor = quantity / 100;
      return { id: uuid(item.id), item_type: "product", product_id: product.id, recipe_id: null, label: product.name, quantity, unit: "g", calories: Number(product.calories_100g) * factor, protein_g: Number(product.protein_100g) * factor, carbs_g: Number(product.carbs_100g) * factor, fat_g: Number(product.fat_100g) * factor, position };
    }
    const recipe = recipeMap.get(item.referenceId); if (!recipe) throw new Error("Избрана рецепта вече не съществува.");
    const recipeIngredients = (ingredientsResult.data ?? []).filter((ingredient) => ingredient.recipe_id === recipe.id);
    const totals = recipeIngredients.reduce((sum, ingredient) => { const product = ingredientProductMap.get(ingredient.product_id); const factor = Number(ingredient.grams) / 100; if (product) { sum.calories += Number(product.calories_100g) * factor; sum.protein += Number(product.protein_100g) * factor; sum.carbs += Number(product.carbs_100g) * factor; sum.fat += Number(product.fat_100g) * factor; } return sum; }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    const factor = quantity / Math.max(.01, Number(recipe.servings));
    return { id: uuid(item.id), item_type: "recipe", product_id: null, recipe_id: recipe.id, label: recipe.name, quantity, unit: "порция", calories: totals.calories * factor, protein_g: totals.protein * factor, carbs_g: totals.carbs * factor, fat_g: totals.fat * factor, position };
  });
}

export async function saveDynamicMeal(input: DynamicMealDraft) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Сесията изтече.", mealId: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, message: "Невалидна дата.", mealId: null };
  const name = String(input.name).trim().slice(0, 100); if (!name) return { ok: false, message: "Въведи име на храненето.", mealId: null };
  if (!input.items.length) return { ok: false, message: "Добави поне една храна.", mealId: null };
  try {
    const id = uuid(input.id); const resolved = await resolveItems(supabase, user.id, input.items);
    const { error: mealError } = await supabase.from("day_meals").upsert({ id, owner_id: user.id, meal_date: input.date, name, planned_time: /^\d{2}:\d{2}$/.test(input.plannedTime) ? input.plannedTime : null, position: 0, legacy_payload: null }, { onConflict: "id" });
    if (mealError) throw mealError;
    const { error: clearError } = await supabase.from("meal_items").delete().eq("owner_id", user.id).eq("day_meal_id", id); if (clearError) throw clearError;
    const { error: itemError } = await supabase.from("meal_items").insert(resolved.map((item) => ({ ...item, owner_id: user.id, day_meal_id: id }))); if (itemError) throw itemError;
    revalidatePath("/nutrition"); revalidatePath("/calendar"); revalidatePath("/today");
    return { ok: true, message: "Храненето е запазено.", mealId: id };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Храненето не можа да бъде запазено.", mealId: null }; }
}

export async function deleteDynamicMeal(id: string) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return { ok: false, message: "Сесията изтече." };
  const { error } = await supabase.from("day_meals").delete().eq("owner_id", user.id).eq("id", id); revalidatePath("/nutrition"); revalidatePath("/calendar");
  return { ok: !error, message: error ? "Храненето не можа да бъде изтрито." : "Храненето е изтрито." };
}

export async function saveDayAsTemplate(date: string, rawName: string) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return { ok: false, message: "Сесията изтече." };
  const name = rawName.trim().slice(0, 100); if (!name) return { ok: false, message: "Въведи име на шаблона." };
  const { data: meals, error: mealsError } = await supabase.from("day_meals").select("id, name, planned_time, position").eq("owner_id", user.id).eq("meal_date", date).is("legacy_payload", null).order("position");
  if (mealsError || !meals?.length) return { ok: false, message: "Денят няма динамични хранения за шаблон." };
  const { data: items, error: itemsError } = await supabase.from("meal_items").select("*").eq("owner_id", user.id).in("day_meal_id", meals.map((meal) => meal.id)); if (itemsError) return { ok: false, message: "Храните не могат да бъдат копирани." };
  const { data: template, error: templateError } = await supabase.from("meal_templates").upsert({ owner_id: user.id, name }, { onConflict: "owner_id,name" }).select("id").single(); if (templateError) return { ok: false, message: templateError.message };
  await supabase.from("template_meals").delete().eq("owner_id", user.id).eq("template_id", template.id);
  for (const meal of meals) {
    const { data: templateMeal, error } = await supabase.from("template_meals").insert({ owner_id: user.id, template_id: template.id, name: meal.name, planned_time: meal.planned_time, position: meal.position }).select("id").single(); if (error) return { ok: false, message: "Шаблонът не можа да бъде създаден." };
    const mealItems = (items ?? []).filter((item) => item.day_meal_id === meal.id).map(({ id: _id, day_meal_id: _meal, created_at: _created, ...item }) => ({ ...item, template_meal_id: templateMeal.id }));
    if (mealItems.length) { const { error: itemError } = await supabase.from("template_meal_items").insert(mealItems); if (itemError) return { ok: false, message: "Съставките на шаблона не можаха да бъдат копирани." }; }
  }
  revalidatePath("/nutrition"); return { ok: true, message: "Шаблонът е запазен." };
}

export async function applyMealTemplate(templateId: string, date: string) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return { ok: false, message: "Сесията изтече." };
  const { data: meals, error } = await supabase.from("template_meals").select("id, name, planned_time, position").eq("owner_id", user.id).eq("template_id", templateId).order("position"); if (error || !meals?.length) return { ok: false, message: "Шаблонът е празен или липсва." };
  const { data: items, error: itemsError } = await supabase.from("template_meal_items").select("*").eq("owner_id", user.id).in("template_meal_id", meals.map((meal) => meal.id)); if (itemsError) return { ok: false, message: "Шаблонът не може да бъде зареден." };
  const { error: clearError } = await supabase.from("day_meals").delete().eq("owner_id", user.id).eq("meal_date", date); if (clearError) return { ok: false, message: "Старият ден не можа да бъде заменен." };
  for (const meal of meals) {
    const { data: dayMeal, error: mealError } = await supabase.from("day_meals").insert({ owner_id: user.id, meal_date: date, name: meal.name, planned_time: meal.planned_time, position: meal.position }).select("id").single(); if (mealError) return { ok: false, message: "Шаблонът не можа да бъде приложен." };
    const mealItems = (items ?? []).filter((item) => item.template_meal_id === meal.id).map(({ id: _id, template_meal_id: _meal, ...item }) => ({ ...item, day_meal_id: dayMeal.id }));
    if (mealItems.length) { const { error: itemError } = await supabase.from("meal_items").insert(mealItems); if (itemError) return { ok: false, message: "Храните от шаблона не можаха да бъдат копирани." }; }
  }
  revalidatePath("/nutrition"); revalidatePath("/calendar"); return { ok: true, message: "Шаблонът е копиран в деня." };
}


