export type Profile = {
  owner_id: string;
  display_name: string | null;
  avatar_path: string | null;
  birth_date: string | null;
  sex: "female" | "male" | "other" | "prefer_not_to_say" | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  starting_weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active" | null;
  fitness_goal: "lose_weight" | "maintain" | "gain_muscle" | "improve_fitness" | null;
  timezone: string;
};

export type UserGoals = {
  calorie_goal: number;
  protein_goal_g: number;
  carbs_goal_g: number;
  fat_goal_g: number;
  water_goal_ml: number;
  steps_goal: number;
  source: "manual" | "automatic";
};

export const DEFAULT_USER_GOALS: UserGoals = {
  calorie_goal: 2200,
  protein_goal_g: 140,
  carbs_goal_g: 240,
  fat_goal_g: 70,
  water_goal_ml: 2000,
  steps_goal: 8000,
  source: "manual",
};


