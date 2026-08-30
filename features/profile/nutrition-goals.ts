import type { Profile } from "./types";

export type NutritionRecommendation = {
  calories: number; protein: number; carbs: number; fat: number;
  age: number; restingCalories: number; maintenanceCalories: number; adjustmentCalories: number;
  activityLabel: string; goalLabel: string; estimatedWeeklyChangeKg: number; estimatedWeeks: number | null;
};

const activityFactor = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 } as const;
const goalFactor = { lose_weight: 0.85, maintain: 1, gain_muscle: 1.1, improve_fitness: 1 } as const;
const proteinPerKg = { lose_weight: 1.8, maintain: 1.5, gain_muscle: 1.8, improve_fitness: 1.6 } as const;
const activityLabel = { sedentary: "Заседнала", light: "Лека активност", moderate: "Умерена активност", active: "Висока активност", very_active: "Много висока активност" } as const;
const goalLabel = { lose_weight: "Отслабване (−15%)", maintain: "Поддържане", gain_muscle: "Мускулна маса (+10%)", improve_fitness: "По-добра форма" } as const;

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

export function recommendNutrition(profile: Profile | null, goal = profile?.fitness_goal ?? null, today = new Date(), targetWeightKg = profile?.target_weight_kg ?? null): NutritionRecommendation | null {
  if (!profile || missingRecommendationFields(profile, goal).length || !goal || !profile.birth_date || !profile.height_cm || !profile.current_weight_kg || !profile.activity_level) return null;
  if (profile.sex !== "male" && profile.sex !== "female") return null;
  const age = ageOnDate(profile.birth_date, today);
  if (age < 18 || age > 100) return null;
  const sexOffset = profile.sex === "male" ? 5 : -161;
  const restingEnergy = 10 * profile.current_weight_kg + 6.25 * profile.height_cm - 5 * age + sexOffset;
  const maintenanceCalories = Math.round(restingEnergy * activityFactor[profile.activity_level] / 10) * 10;
  const calories = Math.round(maintenanceCalories * goalFactor[goal] / 10) * 10;
  const proteinByWeight = profile.current_weight_kg * proteinPerKg[goal];
  const protein = Math.round(Math.min(proteinByWeight, calories * 0.30 / 4));
  const fat = Math.round(calories * 0.25 / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const adjustmentCalories = calories - maintenanceCalories;
  const estimatedWeeklyChangeKg = Math.round(Math.abs(adjustmentCalories) * 7 / 7700 * 100) / 100;
  const targetDifference = targetWeightKg ? Math.abs(profile.current_weight_kg - targetWeightKg) : 0;
  const directionMatches = goal === "lose_weight" ? Boolean(targetWeightKg && targetWeightKg < profile.current_weight_kg) : goal === "gain_muscle" ? Boolean(targetWeightKg && targetWeightKg > profile.current_weight_kg) : false;
  const estimatedWeeks = directionMatches && estimatedWeeklyChangeKg > 0 ? Math.ceil(targetDifference / estimatedWeeklyChangeKg) : null;
  return { calories, protein, carbs, fat, age, restingCalories: Math.round(restingEnergy), maintenanceCalories, adjustmentCalories, activityLabel: activityLabel[profile.activity_level], goalLabel: goalLabel[goal], estimatedWeeklyChangeKg, estimatedWeeks };
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

