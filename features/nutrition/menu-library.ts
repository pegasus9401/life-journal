import { mealMenus, mealNames } from "./meal-data";

export type MealMenu = Record<string, string[]>;
export type MenuLibrary = Record<string, MealMenu>;
export type MealMenuSettings = {
  custom_meal_menus?: MenuLibrary;
  archived_meal_menus?: string[];
  deleted_meal_menus?: string[];
};

export function getMenuLibrary(metadata: MealMenuSettings | null | undefined, includeArchived = true): MenuLibrary {
  const custom = metadata?.custom_meal_menus ?? {};
  const deleted = new Set(metadata?.deleted_meal_menus ?? []);
  const archived = new Set(metadata?.archived_meal_menus ?? []);
  const combined: MenuLibrary = { ...(mealMenus as unknown as MenuLibrary), ...custom };
  return Object.fromEntries(Object.entries(combined).filter(([name]) => !deleted.has(name) && (includeArchived || !archived.has(name))));
}

export function cleanMealMenu(input: Record<string, string>): MealMenu | null {
  const menu: MealMenu = {};
  for (const meal of mealNames) {
    const options = (input[meal] ?? "").split("\n").map(value => value.trim()).filter(Boolean);
    if (!options.length) return null;
    menu[meal] = options;
  }
  return menu;
}
