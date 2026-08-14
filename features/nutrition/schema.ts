import { z } from "zod";

const nonNegativeNumber = z.coerce.number().finite().min(0).max(100000);

export const nutritionEntrySchema = z.object({
  id: z.union([z.uuid(), z.literal("")]).optional().transform((value) => value || null),
  entryDate: z.iso.date(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  name: z.string().trim().min(1, "Добави име на храната.").max(160),
  quantity: z.string().trim().max(80).optional().transform((value) => value || null),
  calories: nonNegativeNumber,
  protein: nonNegativeNumber,
  carbs: nonNegativeNumber,
  fat: nonNegativeNumber,
  notes: z.string().trim().max(1000).optional().transform((value) => value || null),
});

export const nutritionGoalsSchema = z.object({
  calories: nonNegativeNumber.min(1),
  protein: nonNegativeNumber,
  carbs: nonNegativeNumber,
  fat: nonNegativeNumber,
});
