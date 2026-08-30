import assert from "node:assert/strict";
import test from "node:test";
import { recommendNutrition, validateMacroEnergy } from "./nutrition-goals.ts";
import type { Profile } from "./types.ts";

const profile: Profile = { owner_id: "test", display_name: "Test", avatar_path: null, birth_date: "1994-01-04", sex: "male", height_cm: 174, current_weight_kg: 90, starting_weight_kg: null, target_weight_kg: 76, activity_level: "sedentary", fitness_goal: "lose_weight", timezone: "Europe/Sofia" };

test("creates a coherent recommendation from the profile", () => {
  const value = recommendNutrition(profile, "lose_weight", new Date("2026-08-30T12:00:00Z"));
  assert.deepEqual(value && { calories: value.calories, protein: value.protein, carbs: value.carbs, fat: value.fat }, { calories: 1830, protein: 137, carbs: 206, fat: 51 });
  assert.equal(validateMacroEnergy(value!.calories, value!.protein, value!.carbs, value!.fat), null);
});

test("rejects calories that contradict the macros", () => {
  assert.equal(validateMacroEnergy(1800, 300, 300, 300), "Макросите дават 5100 kcal, а зададената цел е 1800 kcal.");
});

test("activity level materially changes the recommendation", () => {
  const sedentary = recommendNutrition(profile, "lose_weight", new Date("2026-08-30T12:00:00Z"));
  const moderate = recommendNutrition({ ...profile, activity_level: "moderate" }, "lose_weight", new Date("2026-08-30T12:00:00Z"));
  assert.ok(sedentary && moderate);
  assert.ok(moderate.calories > sedentary.calories);
  assert.equal(moderate.activityLabel, "Умерена активност");
});

test("diet style redistributes macros without changing calories", () => {
  const balanced = recommendNutrition(profile, "lose_weight", new Date("2026-08-30T12:00:00Z"), 76, "balanced");
  const highProtein = recommendNutrition(profile, "lose_weight", new Date("2026-08-30T12:00:00Z"), 76, "high_protein");
  const keto = recommendNutrition(profile, "lose_weight", new Date("2026-08-30T12:00:00Z"), 76, "keto");
  assert.ok(balanced && highProtein && keto);
  assert.equal(highProtein.calories, balanced.calories);
  assert.ok(highProtein.protein > balanced.protein);
  assert.ok(keto.carbs < balanced.carbs);
  assert.equal(validateMacroEnergy(keto.calories, keto.protein, keto.carbs, keto.fat), null);
});

