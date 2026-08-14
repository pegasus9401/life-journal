export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type NutritionEntry = {
  id: string;
  owner_id: string;
  entry_date: string;
  meal_type: MealType;
  name: string;
  quantity: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type NutritionGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const DEFAULT_NUTRITION_GOALS: NutritionGoals = {
  calories: 2200,
  protein: 140,
  carbs: 240,
  fat: 70,
};

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Закуска",
  lunch: "Обяд",
  dinner: "Вечеря",
  snack: "Междинно",
};
