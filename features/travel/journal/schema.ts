import { z } from "zod";
import { moods } from "./types";

const jsonContentSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonContentSchema), z.record(z.string(), jsonContentSchema)]),
);

export const journalEntrySchema = z.object({
  id: z.uuid().optional(),
  entryDate: z.iso.date(),
  title: z.string().trim().min(1, "Give this day a title.").max(140),
  content: jsonContentSchema.refine((content) => JSON.stringify(content).length <= 250000, "The story is too large."),
  contentText: z.string().trim().max(50000),
  mood: z.enum(moods).nullable(),
  weather: z.string().trim().max(80).nullable(),
  locationName: z.string().trim().max(160).nullable(),
  tags: z.array(z.string().trim().min(1).max(32)).max(12),
  isFavorite: z.boolean(),
  status: z.enum(["draft", "published"]),
  retainedPhotoIds: z.array(z.uuid()).max(30),
  newPhotos: z.array(z.object({
    storage_path: z.string().min(1).max(500),
    file_name: z.string().min(1).max(255),
    mime_type: z.string().regex(/^image\//),
    file_size: z.number().int().positive().max(15 * 1024 * 1024),
  })).max(30),
}).refine((value) => value.status === "draft" || value.contentText.length > 0, {
  message: "Write something before publishing.", path: ["contentText"],
});

export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
