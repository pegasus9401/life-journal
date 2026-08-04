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
  joyful: "Радостно", peaceful: "Спокойно", excited: "Вълнуващо",
  reflective: "Замислено", tired: "Уморено", challenging: "Предизвикателно",
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
    if (accepted.length !== files.length) setMessage("Някои снимки бяха пропуснати. Използвай до 30 снимки под 15 MB.");
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
        throw new Error("Една от снимките не можа да бъде качена. Провери връзката си и опитай отново.");
      }
      uploaded.push({ storage_path, file_name: photo.file.name, mime_type: mimeType, file_size: photo.file.size });
    }
    return uploaded;
  }

  async function submit(status: EntryStatus) {
    setMessage("");
    if (!title.trim()) return setMessage("Дай заглавие на този ден.");
    if (status === "published" && !contentText.trim()) return setMessage("Напиши нещо преди публикуване.");
    if (tags.length > 12) return setMessage("Използвай не повече от 12 етикета.");

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
      setMessage(error instanceof Error ? error.message : "Нещо се обърка. Опитай отново.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="entry-form">
      <header className="entry-form-header">
        <div><p className="kicker">{entry ? "Редактиране на спомен" : "Нов запис в дневника"}</p><h1>{entry ? "Върни се към този ден." : "Запомни днешния ден."}</h1></div>
        <label className="favorite-control"><input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} /><span aria-hidden="true">♥</span> Любим</label>
      </header>

      <div className="entry-grid">
        <section className="entry-main-fields">
          <label className="field"><span>Дата</span><input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} required /></label>
          <label className="field title-field"><span>Заглавие</span><input type="text" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} placeholder="Златен следобед в Севиля" autoFocus /></label>
          <div className="field"><span>История</span><RichTextEditor value={content} onChange={(nextContent, text) => { setContent(nextContent); setContentText(text); }} /></div>
        </section>

        <aside className="entry-details">
          <fieldset className="field"><legend>Настроение</legend><div className="mood-picker">{moods.map((item) => <button key={item} type="button" className={mood === item ? "selected" : ""} aria-pressed={mood === item} onClick={() => setMood(mood === item ? null : item)}>{moodLabels[item]}</button>)}</div></fieldset>
          <label className="field"><span>Време</span><input value={weather} onChange={(event) => setWeather(event.target.value)} maxLength={80} placeholder="Топла и ясна вечер" /></label>
          <label className="field"><span>Място</span><input value={locationName} onChange={(event) => setLocationName(event.target.value)} maxLength={160} placeholder="Севиля, Испания" /></label>
          <label className="field"><span>Етикети <small>разделени със запетаи</small></span><input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="испания, тапас, залез" /></label>
        </aside>
      </div>

      <section className="photo-field" aria-labelledby="photos-label">
        <div><p id="photos-label" className="field-label">Снимки</p><p className="field-help">Първата снимка става корица. До 30 снимки по 15 MB.</p></div>
        <label className="photo-picker"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={(event) => { addPhotos(event.target.files); event.target.value = ""; }} /><span>＋ Добави снимки</span></label>
        {photoCount > 0 ? <div className="photo-preview-grid">
          {existingPhotos.map((photo, index) => <div className="photo-preview" key={photo.id}>{photo.signedUrl ? <Image src={photo.signedUrl} alt={`Снимка от дневника ${index + 1}`} fill sizes="(max-width: 700px) 45vw, 220px" /> : null}<button type="button" aria-label={`Премахни ${photo.file_name}`} onClick={() => setExistingPhotos((current) => current.filter((item) => item.id !== photo.id))}>×</button>{index === 0 ? <span>Корица</span> : null}</div>)}
          {pendingPhotos.map((photo, index) => <div className="photo-preview" key={photo.id}><Image src={photo.previewUrl} alt={`Нова снимка ${index + 1}`} fill unoptimized sizes="(max-width: 700px) 45vw, 220px" /><button type="button" aria-label={`Премахни ${photo.file.name}`} onClick={() => removePending(photo.id)}>×</button>{existingPhotos.length === 0 && index === 0 ? <span>Корица</span> : null}</div>)}
        </div> : null}
      </section>

      <div className="form-actions">
        <p className="form-message error" aria-live="polite">{message}</p>
        <button className="secondary-button" type="button" disabled={saving !== null} onClick={() => submit("draft")}>{saving === "draft" ? "Запазване…" : "Запази чернова"}</button>
        <button className="primary-button" type="button" disabled={saving !== null} onClick={() => submit("published")}>{saving === "published" ? "Публикуване…" : "Публикувай записа"}</button>
      </div>
    </div>
  );
}
