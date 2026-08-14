import { z } from "zod";

const exerciseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sets: z.coerce.number().int().min(0).max(100),
  reps: z.coerce.number().int().min(0).max(10000),
  weight: z.coerce.number().min(0).max(100000),
});

export const workoutSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]).optional().transform((value) => value || null),
  workoutDate: z.iso.date(),
  title: z.string().trim().min(1, "Добави име на тренировката.").max(160),
  workoutType: z.enum(["strength", "cardio", "mobility", "sport", "other"]),
  durationMinutes: z.coerce.number().int().min(0).max(1440),
  caloriesBurned: z.coerce.number().int().min(0).max(100000),
  notes: z.string().trim().max(3000).optional().transform((value) => value || null),
  exercises: z.string().transform((value, context) => {
    try { return z.array(exerciseSchema).max(100).parse(JSON.parse(value || "[]")); }
    catch { context.addIssue({ code: "custom", message: "Провери упражненията." }); return z.NEVER; }
  }),
  completed: z.boolean(),
});
