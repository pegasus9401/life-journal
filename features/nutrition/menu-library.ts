import { mealMenus, mealNames } from "./meal-data";

export type MealMenu = Record<string, string[]>;
export type MenuLibrary = Record<string, MealMenu>;
export type NutritionValues = { kcal: number; protein: number; carbs: number; fat: number };
export type MenuNutrition = NutritionValues & { meals: Record<string, NutritionValues> };

const defaultMenuNutrition: Record<string, MenuNutrition> = {
  "Меню 1": { kcal: 1888, protein: 180, carbs: 148, fat: 56, meals: {
    "Закуска": { kcal: 247, protein: 21, carbs: 33, fat: 3 },
    "След тренировка": { kcal: 529, protein: 59, carbs: 31, fat: 16 },
    "Следобедна закуска": { kcal: 514, protein: 36, carbs: 60, fat: 12 },
    "Вечеря": { kcal: 463, protein: 40, carbs: 17, fat: 24 },
    "Преди лягане": { kcal: 135, protein: 24, carbs: 7, fat: 1 },
  }},
  "Меню 2": { kcal: 1895, protein: 183, carbs: 124, fat: 65, meals: {
    "Закуска": { kcal: 337, protein: 27, carbs: 26, fat: 11 },
    "След тренировка": { kcal: 720, protein: 62, carbs: 48, fat: 28 },
    "Следобедна закуска": { kcal: 350, protein: 29, carbs: 27, fat: 13 },
    "Вечеря": { kcal: 353, protein: 41, carbs: 16, fat: 12 },
    "Преди лягане": { kcal: 135, protein: 24, carbs: 7, fat: 1 },
  }},
  "Меню 3": { kcal: 1905, protein: 185, carbs: 131, fat: 62, meals: {
    "Закуска": { kcal: 392, protein: 30, carbs: 31, fat: 15 },
    "След тренировка": { kcal: 551, protein: 45, carbs: 48, fat: 18 },
    "Следобедна закуска": { kcal: 395, protein: 42, carbs: 32, fat: 9 },
    "Вечеря": { kcal: 432, protein: 44, carbs: 13, fat: 19 },
    "Преди лягане": { kcal: 135, protein: 24, carbs: 7, fat: 1 },
  }},
};

export type MealMenuSettings = {
  custom_meal_menus?: MenuLibrary;
  meal_menu_nutrition?: Record<string, MenuNutrition>;
  archived_meal_menus?: string[];
  deleted_meal_menus?: string[];
};

const zeroNutrition = (): NutritionValues => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 });

export function getMenuLibrary(metadata: MealMenuSettings | null | undefined, includeArchived = true): MenuLibrary {
  const custom = metadata?.custom_meal_menus ?? {};
  const deleted = new Set(metadata?.deleted_meal_menus ?? []);
  const archived = new Set(metadata?.archived_meal_menus ?? []);
  const combined: MenuLibrary = { ...(mealMenus as unknown as MenuLibrary), ...custom };
  return Object.fromEntries(Object.entries(combined).filter(([name]) => !deleted.has(name) && (includeArchived || !archived.has(name))));
}

export function orderedMealEntries(menu: MealMenu) {
  const order = new Map(mealNames.map((meal, index) => [meal, index]));
  return Object.entries(menu).sort(([left], [right]) => (order.get(left) ?? 999) - (order.get(right) ?? 999));
}

export function getMenuNutrition(metadata: MealMenuSettings | null | undefined, menuName: string): MenuNutrition {
  const stored = metadata?.meal_menu_nutrition?.[menuName] ?? defaultMenuNutrition[menuName];
  const meals = Object.fromEntries(mealNames.map(meal => [meal, { ...zeroNutrition(), ...(stored?.meals?.[meal] ?? {}) }]));
  return { ...zeroNutrition(), ...(stored ?? {}), meals };
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
