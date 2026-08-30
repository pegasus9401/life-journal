import { z } from "zod";
import { validateMacroEnergy } from "./nutrition-goals";

const optionalNumber = (min: number, max: number) => z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().finite().min(min).max(max).optional(),
);

export const profileSchema = z.object({
  displayName: z.string().trim().max(100).optional().transform((value) => value || null),
  birthDate: z.union([z.iso.date(), z.literal("")]).transform((value) => value || null),
  sex: z.union([z.enum(["female", "male", "other", "prefer_not_to_say"]), z.literal("")]).transform((value) => value || null),
  heightCm: optionalNumber(50, 300),
  currentWeightKg: optionalNumber(20, 500),
  startingWeightKg: optionalNumber(20, 500),
  targetWeightKg: optionalNumber(20, 500),
  activityLevel: z.union([z.enum(["sedentary", "light", "moderate", "active", "very_active"]), z.literal("")]).transform((value) => value || null),
  fitnessGoal: z.union([z.enum(["lose_weight", "maintain", "gain_muscle", "improve_fitness"]), z.literal("")]).transform((value) => value || null),
  timezone: z.string().trim().min(1).max(100),
});

export const userGoalsSchema = z.object({
  calories: z.coerce.number().int().min(1).max(100000),
  protein: z.coerce.number().finite().min(0).max(100000),
  carbs: z.coerce.number().finite().min(0).max(100000),
  fat: z.coerce.number().finite().min(0).max(100000),
  water: z.coerce.number().int().min(0).max(20000),
  steps: z.coerce.number().int().min(0).max(200000),
  source: z.enum(["manual", "automatic"]),
}).superRefine((value, context) => {
  const message = validateMacroEnergy(value.calories, value.protein, value.carbs, value.fat);
  if (message) context.addIssue({ code: "custom", message, path: ["calories"] });
});

export const longTermGoalsSchema = z.object({
  targetWeightKg: optionalNumber(20, 500),
  fitnessGoal: z.union([z.enum(["lose_weight", "maintain", "gain_muscle", "improve_fitness"]), z.literal("")]).transform((value) => value || null),
});


