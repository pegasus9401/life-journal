"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { journalEntrySchema, type JournalEntryInput } from "./schema";

export async function saveJournalEntry(input: JournalEntryInput) {
  const parsed = journalEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Провери записа и опитай отново." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Сесията ти изтече. Влез отново." };

  const value = parsed.data;
  if (value.newPhotos.some((photo) => !photo.storage_path.startsWith(`${user.id}/`))) {
    return { ok: false as const, message: "Пътят за качване на снимката е невалиден." };
  }
  const entryData = {
    owner_id: user.id,
    entry_date: value.entryDate,
    title: value.title,
    content: value.content,
    content_text: value.contentText,
    mood: value.mood,
    weather: value.weather || null,
    location_name: value.locationName || null,
    tags: [...new Set(value.tags.map((tag) => tag.toLowerCase()))],
    is_favorite: value.isFavorite,
    status: value.status,
    published_at: value.status === "published" ? new Date().toISOString() : null,
  };

  let entryId = value.id;
  if (entryId) {
    const { error } = await supabase.from("journal_entries").update(entryData).eq("id", entryId).eq("owner_id", user.id);
    if (error) return { ok: false as const, message: "Записът не можа да бъде обновен." };
  } else {
    const { data, error } = await supabase.from("journal_entries").insert(entryData).select("id").single();
    if (error || !data) return { ok: false as const, message: "Записът не можа да бъде запазен." };
    entryId = data.id;
  }

  const { data: currentPhotos } = await supabase
    .from("journal_photos")
    .select("id, storage_path")
    .eq("entry_id", entryId);
  const retained = new Set(value.retainedPhotoIds);
  const removed = (currentPhotos ?? []).filter((photo) => !retained.has(photo.id));

  if (removed.length > 0) {
    await supabase.from("journal_photos").delete().in("id", removed.map((photo) => photo.id));
    await supabase.storage.from("journal-photos").remove(removed.map((photo) => photo.storage_path));
  }

  if (value.newPhotos.length > 0) {
    const startPosition = value.retainedPhotoIds.length;
    const rows = value.newPhotos.map((photo, index) => ({
      ...photo,
      entry_id: entryId,
      owner_id: user.id,
      position: startPosition + index,
    }));
    const { error } = await supabase.from("journal_photos").insert(rows);
    if (error) return { ok: false as const, message: "Записът беше запазен, но новите снимки не можаха да бъдат добавени." };
  }

  revalidatePath("/journal");
  revalidatePath(`/journal/${entryId}`);
  return { ok: true as const, id: entryId };
}

export async function deleteJournalEntry(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Сесията ти изтече." };

  const { data: photos } = await supabase.from("journal_photos").select("storage_path").eq("entry_id", id);
  const { error } = await supabase.from("journal_entries").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return { ok: false as const, message: "Записът не можа да бъде изтрит." };

  if (photos?.length) await supabase.storage.from("journal-photos").remove(photos.map((photo) => photo.storage_path));
  revalidatePath("/journal");
  return { ok: true as const };
}
