import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { RecipeLibrary } from "@/features/recipes/components/recipe-library";
import { getRecipeLibrary } from "@/features/recipes/queries";

export const metadata = { title: "Рецепти · PegasOS" };

export default async function RecipesPage() {
  const data = await getRecipeLibrary();
  if (!data) redirect("/login");
  return <main className="life-app-shell"><AppNavigation active="recipes" /><RecipeLibrary initialRecipes={data.recipes} products={data.products} /></main>;
}

