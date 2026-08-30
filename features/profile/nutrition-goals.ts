import type { Profile } from "./types";

export type NutritionRecommendation = { calories: number; protein: number; carbs: number; fat: number; basis: string };

const activityFactor = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 } as const;
const goalFactor = { lose_weight: 0.85, maintain: 1, gain_muscle: 1.1, improve_fitness: 1 } as const;
const proteinPerKg = { lose_weight: 1.8, maintain: 1.5, gain_muscle: 1.8, improve_fitness: 1.6 } as const;

function ageOnDate(birthDate: string, today = new Date()) {
  const [year, month, day] = birthDate.split("-").map(Number);
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age;
}

export function missingRecommendationFields(profile: Profile | null, goal = profile?.fitness_goal ?? null) {
  const missing: string[] = [];
  if (!profile?.birth_date) missing.push("рождена дата");
  if (profile?.sex !== "male" && profile?.sex !== "female") missing.push("пол");
  if (!profile?.height_cm) missing.push("ръст");
  if (!profile?.current_weight_kg) missing.push("текущо тегло");
  if (!profile?.activity_level) missing.push("активност");
  if (!goal) missing.push("основна цел");
  return missing;
}

export function recommendNutrition(profile: Profile | null, goal = profile?.fitness_goal ?? null, today = new Date()): NutritionRecommendation | null {
  if (!profile || missingRecommendationFields(profile, goal).length || !goal || !profile.birth_date || !profile.height_cm || !profile.current_weight_kg || !profile.activity_level) return null;
  if (profile.sex !== "male" && profile.sex !== "female") return null;
  const age = ageOnDate(profile.birth_date, today);
  if (age < 18 || age > 100) return null;
  const sexOffset = profile.sex === "male" ? 5 : -161;
  const restingEnergy = 10 * profile.current_weight_kg + 6.25 * profile.height_cm - 5 * age + sexOffset;
  const calories = Math.round(restingEnergy * activityFactor[profile.activity_level] * goalFactor[goal] / 10) * 10;
  const proteinByWeight = profile.current_weight_kg * proteinPerKg[goal];
  const protein = Math.round(Math.min(proteinByWeight, calories * 0.30 / 4));
  const fat = Math.round(calories * 0.25 / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat, basis: `Mifflin–St Jeor · ${age} г. · ${profile.current_weight_kg} кг · ${profile.height_cm} см` };
}

export function validateMacroEnergy(calories: number, protein: number, carbs: number, fat: number) {
  const macroCalories = protein * 4 + carbs * 4 + fat * 9;
  const difference = Math.abs(macroCalories - calories);
  if (difference > Math.max(50, calories * 0.05)) return `Макросите дават ${Math.round(macroCalories)} kcal, а зададената цел е ${Math.round(calories)} kcal.`;
  const proteinShare = protein * 4 / calories;
  const carbsShare = carbs * 4 / calories;
  const fatShare = fat * 9 / calories;
  if (proteinShare < 0.10 || proteinShare > 0.35) return "Протеинът трябва да е между 10% и 35% от дневните калории.";
  if (carbsShare < 0.45 || carbsShare > 0.65) return "Въглехидратите трябва да са между 45% и 65% от дневните калории.";
  if (fatShare < 0.20 || fatShare > 0.35) return "Мазнините трябва да са между 20% и 35% от дневните калории.";
  return null;
}

