import type { Profile } from "./types";

export type MacroStyle = "balanced" | "high_protein" | "low_carb" | "keto" | "mediterranean";

export type NutritionRecommendation = {
  calories: number; protein: number; carbs: number; fat: number;
  age: number; restingCalories: number; maintenanceCalories: number; adjustmentCalories: number;
  activityLabel: string; goalLabel: string; macroStyleLabel: string; estimatedWeeklyChangeKg: number; estimatedWeeks: number | null;
};

const activityFactor = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 } as const;
const activityLabel = { sedentary: "Заседнала", light: "Лека активност", moderate: "Умерена активност", active: "Висока активност", very_active: "Много висока активност" } as const;
const macroStyles = {
  balanced: { label: "Балансиран", protein: 0.30, fat: 0.25 },
  high_protein: { label: "Високопротеинов", protein: 0.35, fat: 0.25 },
  low_carb: { label: "Нисковъглехидратен", protein: 0.35, fat: 0.40 },
  keto: { label: "Кето", protein: 0.30, fat: 0.65 },
  mediterranean: { label: "Средиземноморски", protein: 0.25, fat: 0.30 },
} as const;

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

export function recommendNutrition(profile: Profile | null, goal = profile?.fitness_goal ?? null, today = new Date(), targetWeightKg = profile?.target_weight_kg ?? null, macroStyle: MacroStyle = "balanced"): NutritionRecommendation | null {
  if (!profile || missingRecommendationFields(profile, goal).length || !goal || !profile.birth_date || !profile.height_cm || !profile.current_weight_kg || !profile.activity_level) return null;
  if (profile.sex !== "male" && profile.sex !== "female") return null;
  const age = ageOnDate(profile.birth_date, today);
  if (age < 18 || age > 100) return null;
  const sexOffset = profile.sex === "male" ? 5 : -161;
  const restingEnergy = 10 * profile.current_weight_kg + 6.25 * profile.height_cm - 5 * age + sexOffset;
  const maintenanceCalories = Math.round(restingEnergy * activityFactor[profile.activity_level] / 10) * 10;
  const weeklyWeightChangeKg = goal === "gain_muscle"
    ? Math.min(0.25, Math.max(0.1, profile.current_weight_kg * 0.0025))
    : Math.min(0.75, Math.max(0.25, profile.current_weight_kg * 0.005));
  const desiredDailyAdjustment = weeklyWeightChangeKg * 7700 / 7;
  const rawCalories = goal === "lose_weight"
    ? Math.max(restingEnergy, maintenanceCalories - desiredDailyAdjustment)
    : goal === "gain_muscle"
      ? maintenanceCalories + Math.min(desiredDailyAdjustment, maintenanceCalories * 0.15)
      : maintenanceCalories;
  const calories = Math.round(rawCalories / 10) * 10;
  const split = macroStyles[macroStyle];
  const protein = Math.round(calories * split.protein / 4);
  const fat = Math.round(calories * split.fat / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const adjustmentCalories = calories - maintenanceCalories;
  const adjustmentPercent = Math.round(Math.abs(adjustmentCalories) / maintenanceCalories * 100);
  const goalLabel = goal === "lose_weight" ? `Отслабване (−${adjustmentPercent}%)` : goal === "gain_muscle" ? `Мускулна маса (+${adjustmentPercent}%)` : goal === "maintain" ? "Поддържане" : "По-добра форма";
  const estimatedWeeklyChangeKg = Math.round(Math.abs(adjustmentCalories) * 7 / 7700 * 100) / 100;
  const targetDifference = targetWeightKg ? Math.abs(profile.current_weight_kg - targetWeightKg) : 0;
  const directionMatches = goal === "lose_weight" ? Boolean(targetWeightKg && targetWeightKg < profile.current_weight_kg) : goal === "gain_muscle" ? Boolean(targetWeightKg && targetWeightKg > profile.current_weight_kg) : false;
  const estimatedWeeks = directionMatches && estimatedWeeklyChangeKg > 0 ? Math.ceil(targetDifference / estimatedWeeklyChangeKg) : null;
  return { calories, protein, carbs, fat, age, restingCalories: Math.round(restingEnergy), maintenanceCalories, adjustmentCalories, activityLabel: activityLabel[profile.activity_level], goalLabel, macroStyleLabel: split.label, estimatedWeeklyChangeKg, estimatedWeeks };
}

export function validateMacroEnergy(calories: number, protein: number, carbs: number, fat: number) {
  const macroCalories = protein * 4 + carbs * 4 + fat * 9;
  const difference = Math.abs(macroCalories - calories);
  if (difference > Math.max(50, calories * 0.05)) return `Макросите дават ${Math.round(macroCalories)} kcal, а зададената цел е ${Math.round(calories)} kcal.`;
  const proteinShare = protein * 4 / calories;
  const carbsShare = carbs * 4 / calories;
  const fatShare = fat * 9 / calories;
  if (proteinShare < 0.10 || proteinShare > 0.40) return "Протеинът трябва да е между 10% и 40% от дневните калории.";
  if (carbsShare < 0.03 || carbsShare > 0.65) return "Въглехидратите трябва да са между 3% и 65% от дневните калории.";
  if (fatShare < 0.20 || fatShare > 0.70) return "Мазнините трябва да са между 20% и 70% от дневните калории.";
  return null;
}

