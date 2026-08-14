import type { NutritionEntry, NutritionGoals } from "./types";

export function nutritionTotals(entries: NutritionEntry[]): NutritionGoals {
  return entries.reduce((total, entry) => ({
    calories: total.calories + entry.calories,
    protein: total.protein + entry.protein_g,
    carbs: total.carbs + entry.carbs_g,
    fat: total.fat + entry.fat_g,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export function goalProgress(value: number, goal: number) {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((value / goal) * 100));
}
