import type { JSONContent } from "@tiptap/react";

export const moods = ["joyful", "peaceful", "excited", "reflective", "tired", "challenging"] as const;
export type Mood = (typeof moods)[number];
export type EntryStatus = "draft" | "published";

export type JournalPhoto = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  position: number;
  signedUrl?: string;
};

export type JournalEntry = {
  id: string;
  owner_id: string;
  entry_date: string;
  title: string;
  content: JSONContent;
  content_text: string;
  mood: Mood | null;
  weather: string | null;
  location_name: string | null;
  tags: string[];
  is_favorite: boolean;
  status: EntryStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  journal_photos: JournalPhoto[];
};

export type UploadedPhoto = Omit<JournalPhoto, "id" | "position" | "signedUrl">;
