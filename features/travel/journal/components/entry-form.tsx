"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { createClient } from "@/lib/supabase/client";
import { saveJournalEntry } from "../actions";
import { moods, type EntryStatus, type JournalEntry, type JournalPhoto, type Mood, type UploadedPhoto } from "../types";
import { RichTextEditor } from "./rich-text-editor";

const emptyStory: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
const moodLabels: Record<Mood, string> = {
  joyful: "Joyful", peaceful: "Peaceful", excited: "Excited",
  reflective: "Reflective", tired: "Tired", challenging: "Challenging",
};
const acceptedExtensions = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
const mimeByExtension: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" };

function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

type PendingPhoto = { file: File; previewUrl: string; id: string };

export function EntryForm({ userId, entry }: { userId: string; entry?: JournalEntry }) {
  const router = useRouter();
  const [entryDate, setEntryDate] = useState(entry?.entry_date ?? localToday());
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState<JSONContent>(entry?.content ?? emptyStory);
  const [contentText, setContentText] = useState(entry?.content_text ?? "");
  const [mood, setMood] = useState<Mood | null>(entry?.mood ?? null);
  const [weather, setWeather] = useState(entry?.weather ?? "");
  const [locationName, setLocationName] = useState(entry?.location_name ?? "");
  const [tagsText, setTagsText] = useState(entry?.tags.join(", ") ?? "");
  const [favorite, setFavorite] = useState(entry?.is_favorite ?? false);
  const [existingPhotos, setExistingPhotos] = useState<JournalPhoto[]>(entry?.journal_photos ?? []);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [saving, setSaving] = useState<EntryStatus | null>(null);
  const [message, setMessage] = useState("");
  const previewUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const photoCount = existingPhotos.length + pendingPhotos.length;
  const tags = useMemo(() => tagsText.split(",").map((tag) => tag.trim()).filter(Boolean), [tagsText]);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const available = 30 - photoCount;
    const accepted = Array.from(files).slice(0, available).filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      return (file.type.startsWith("image/") || acceptedExtensions.has(extension)) && file.size <= 15 * 1024 * 1024;
    });
    if (accepted.length !== files.length) setMessage("Some photos were skipped. Use images under 15 MB, up to 30 per entry.");
    const additions = accepted.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return { file, id: crypto.randomUUID(), previewUrl };
    });
    setPendingPhotos((current) => [...current, ...additions]);
  }

  function removePending(id: string) {
    setPendingPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
        previewUrls.current.delete(removed.previewUrl);
      }
      return current.filter((photo) => photo.id !== id);
    });
  }

  async function uploadPhotos(): Promise<UploadedPhoto[]> {
    const supabase = createClient();
    const uploaded: UploadedPhoto[] = [];
    for (const photo of pendingPhotos) {
      const rawExtension = photo.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const extension = /^[a-z0-9]{2,5}$/.test(rawExtension) ? rawExtension : "jpg";
      const storage_path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const mimeType = photo.file.type || mimeByExtension[extension] || "image/jpeg";
      const { error } = await supabase.storage.from("journal-photos").upload(storage_path, photo.file, { contentType: mimeType, upsert: false });
      if (error) {
        if (uploaded.length) await supabase.storage.from("journal-photos").remove(uploaded.map((item) => item.storage_path));
        throw new Error("One of the photos could not be uploaded. Check your connection and try again.");
      }
      uploaded.push({ storage_path, file_name: photo.file.name, mime_type: mimeType, file_size: photo.file.size });
    }
    return uploaded;
  }

  async function submit(status: EntryStatus) {
    setMessage("");
    if (!title.trim()) return setMessage("Give this day a title.");
    if (status === "published" && !contentText.trim()) return setMessage("Write something before publishing.");
    if (tags.length > 12) return setMessage("Use no more than 12 tags.");

    setSaving(status);
    let uploaded: UploadedPhoto[] = [];
    try {
      uploaded = await uploadPhotos();
      const result = await saveJournalEntry({
        id: entry?.id,
        entryDate,
        title,
        content,
        contentText,
        mood,
        weather: weather || null,
        locationName: locationName || null,
        tags,
        isFavorite: favorite,
        status,
        retainedPhotoIds: existingPhotos.map((photo) => photo.id),
        newPhotos: uploaded,
      });
      if (!result.ok) {
        if (uploaded.length) await createClient().storage.from("journal-photos").remove(uploaded.map((photo) => photo.storage_path));
        setMessage(result.message);
        return;
      }
      router.push(`/journal/${result.id}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong. Try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="entry-form">
      <header className="entry-form-header">
        <div><p className="kicker">{entry ? "Edit memory" : "New journal entry"}</p><h1>{entry ? "Return to this day." : "Remember today."}</h1></div>
        <label className="favorite-control"><input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} /><span aria-hidden="true">♥</span> Favorite</label>
      </header>

      <div className="entry-grid">
        <section className="entry-main-fields">
          <label className="field"><span>Date</span><input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} required /></label>
          <label className="field title-field"><span>Title</span><input type="text" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} placeholder="A golden afternoon in Seville" autoFocus /></label>
          <div className="field"><span>Story</span><RichTextEditor value={content} onChange={(nextContent, text) => { setContent(nextContent); setContentText(text); }} /></div>
        </section>

        <aside className="entry-details">
          <fieldset className="field"><legend>Mood</legend><div className="mood-picker">{moods.map((item) => <button key={item} type="button" className={mood === item ? "selected" : ""} aria-pressed={mood === item} onClick={() => setMood(mood === item ? null : item)}>{moodLabels[item]}</button>)}</div></fieldset>
          <label className="field"><span>Weather</span><input value={weather} onChange={(event) => setWeather(event.target.value)} maxLength={80} placeholder="Warm, clear evening" /></label>
          <label className="field"><span>Location</span><input value={locationName} onChange={(event) => setLocationName(event.target.value)} maxLength={160} placeholder="Seville, Spain" /></label>
          <label className="field"><span>Tags <small>separated by commas</small></span><input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="spain, tapas, sunset" /></label>
        </aside>
      </div>

      <section className="photo-field" aria-labelledby="photos-label">
        <div><p id="photos-label" className="field-label">Photos</p><p className="field-help">The first photo becomes the cover. Up to 30 images, 15 MB each.</p></div>
        <label className="photo-picker"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={(event) => { addPhotos(event.target.files); event.target.value = ""; }} /><span>＋ Add photos</span></label>
        {photoCount > 0 ? <div className="photo-preview-grid">
          {existingPhotos.map((photo, index) => <div className="photo-preview" key={photo.id}>{photo.signedUrl ? <Image src={photo.signedUrl} alt={`Journal photo ${index + 1}`} fill sizes="(max-width: 700px) 45vw, 220px" /> : null}<button type="button" aria-label={`Remove ${photo.file_name}`} onClick={() => setExistingPhotos((current) => current.filter((item) => item.id !== photo.id))}>×</button>{index === 0 ? <span>Cover</span> : null}</div>)}
          {pendingPhotos.map((photo, index) => <div className="photo-preview" key={photo.id}><Image src={photo.previewUrl} alt={`New journal photo ${index + 1}`} fill unoptimized sizes="(max-width: 700px) 45vw, 220px" /><button type="button" aria-label={`Remove ${photo.file.name}`} onClick={() => removePending(photo.id)}>×</button>{existingPhotos.length === 0 && index === 0 ? <span>Cover</span> : null}</div>)}
        </div> : null}
      </section>

      <div className="form-actions">
        <p className="form-message error" aria-live="polite">{message}</p>
        <button className="secondary-button" type="button" disabled={saving !== null} onClick={() => submit("draft")}>{saving === "draft" ? "Saving…" : "Save draft"}</button>
        <button className="primary-button" type="button" disabled={saving !== null} onClick={() => submit("published")}>{saving === "published" ? "Publishing…" : "Publish entry"}</button>
      </div>
    </div>
  );
}
