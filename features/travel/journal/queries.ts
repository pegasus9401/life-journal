import { cache } from "react";
import { createClient, getAuthenticatedClient } from "@/lib/supabase/server";
import type { JournalEntry, JournalPhoto } from "./types";

const withSignedPhotos = async (entry: JournalEntry, supabase: Awaited<ReturnType<typeof createClient>>) => {
  const photos = [...(entry.journal_photos ?? [])].sort((a, b) => a.position - b.position);
  if (photos.length === 0) return { ...entry, journal_photos: photos };

  const { data } = await supabase.storage.from("journal-photos").createSignedUrls(
    photos.map((photo) => photo.storage_path),
    60 * 60,
  );
  const signedByPath = new Map(data?.map((item) => [item.path, item.signedUrl]));
  return {
    ...entry,
    journal_photos: photos.map((photo) => ({ ...photo, signedUrl: signedByPath.get(photo.storage_path) })) as JournalPhoto[],
  };
};

export const getJournalEntries = cache(async () => {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return null;

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*, journal_photos(*)")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load journal entries: ${error.message}`);
  return Promise.all((data as JournalEntry[]).map((entry) => withSignedPhotos(entry, supabase)));
});

export const getJournalDay = cache(async (date: string) => {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return null;
  const { data, error } = await supabase.from("journal_entries").select("*, journal_photos(*)").eq("owner_id", user.id).eq("entry_date", date).order("created_at");
  if (error) throw new Error(`Дневникът не може да се зареди: ${error.message}`);
  return Promise.all(((data ?? []) as JournalEntry[]).map((entry) => withSignedPhotos(entry, supabase)));
});

export const getJournalEntry = cache(async (id: string) => {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return null;

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*, journal_photos(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load journal entry: ${error.message}`);
  return data ? withSignedPhotos(data as JournalEntry, supabase) : null;
});
