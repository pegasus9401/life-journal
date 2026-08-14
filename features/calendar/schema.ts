import { z } from "zod";

const recurrence = z.enum(["none", "daily", "weekly", "monthly", "yearly"]);
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || null);

export const eventSchema = z.object({
  id: z.uuid().optional(), title: z.string().trim().min(1, "Добави заглавие.").max(160),
  description: optionalText(5000), date: z.iso.date(), endDate: z.iso.date(), allDay: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().trim().min(1).max(80), location: optionalText(240), category: z.string().trim().min(1).max(40),
  color: z.enum(["violet","indigo","rose","amber","emerald","slate"]), recurrenceKind: recurrence,
  recurrenceEnd: z.union([z.iso.date(), z.literal("")]).optional().transform((value) => value || null),
}).superRefine((value, context) => {
  if (value.endDate < value.date) context.addIssue({ code: "custom", message: "Крайната дата е преди началната." });
  if (!value.allDay && (!value.startTime || !value.endTime)) context.addIssue({ code: "custom", message: "Добави начален и краен час." });
  if (!value.allDay && value.date === value.endDate && value.endTime! <= value.startTime!) context.addIssue({ code: "custom", message: "Крайният час трябва да е след началния." });
});

export const taskSchema = z.object({
  id: z.uuid().optional(), title: z.string().trim().min(1, "Добави задача.").max(200), description: optionalText(5000),
  dueDate: z.union([z.iso.date(), z.literal("")]).optional().transform((value) => value || null),
  dueTime: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal("")]).optional().transform((value) => value || null),
  timezone: z.string().trim().min(1).max(80), priority: z.enum(["low","normal","high"]), category: optionalText(40),
  recurrenceKind: recurrence, recurrenceEnd: z.union([z.iso.date(), z.literal("")]).optional().transform((value) => value || null),
});

export const birthdaySchema = z.object({
  id: z.uuid().optional(), personName: z.string().trim().min(1, "Добави име.").max(160), birthDate: z.iso.date(),
  birthYearKnown: z.boolean(), notes: optionalText(3000),
});
