import type { FoodProduct } from "@/features/products/types";

export type RecipeIngredient = {
  id: string;
  productId: string;
  quantity: number;
  unit: string;
  grams: number;
  position: number;
};

export type Recipe = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  servings: number;
  favorite: boolean;
  ingredients: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
};

export type RecipeDraft = Omit<Recipe, "createdAt" | "updatedAt">;

export type RecipeMacros = { calories: number; protein: number; carbs: number; fat: number };

export function recipeMacros(recipe: Pick<Recipe, "ingredients" | "servings">, products: FoodProduct[]): RecipeMacros {
  const index = new Map(products.map((product) => [product.id, product]));
  return recipe.ingredients.reduce<RecipeMacros>((total, ingredient) => {
    const product = index.get(ingredient.productId);
    if (!product) return total;
    const factor = ingredient.grams / 100;
    total.calories += product.calories100g * factor;
    total.protein += product.protein100g * factor;
    total.carbs += product.carbs100g * factor;
    total.fat += product.fat100g * factor;
    return total;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}


