import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteEntryButton } from "@/features/travel/journal/components/delete-entry-button";
import { RichTextContent } from "@/features/travel/journal/components/rich-text-content";
import { getJournalEntry } from "@/features/travel/journal/queries";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

const moodLabels: Record<string, string> = { joyful: "радостно", peaceful: "спокойно", excited: "вълнуващо", reflective: "замислено", tired: "уморено", challenging: "предизвикателно" };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const entry = await getJournalEntry((await params).id);
  return { title: entry ? `${entry.title} · Дневник на живота` : "Запис в дневника" };
}

export default async function JournalEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const entry = await getJournalEntry((await params).id);
  if (!entry) notFound();
  const cover = entry.journal_photos[0];

  return (
    <main className="story-page">
      <nav className="story-nav"><Link href="/journal">← Всички записи</Link><div><Link href={`/journal/${entry.id}/edit`}>Редактирай</Link><DeleteEntryButton entryId={entry.id} /></div></nav>
      <article>
        <header className={`story-hero ${cover?.signedUrl ? "with-image" : "without-image"}`}>
          {cover?.signedUrl ? <Image src={cover.signedUrl} alt={`Корица на ${entry.title}`} fill priority sizes="100vw" /> : null}
          <div className="story-hero-overlay" />
          <div className="story-heading">
            <p>{entry.location_name ?? "Дневник за пътувания"}</p>
            <h1>{entry.title}</h1>
            <div className="story-byline"><span>{formatDate(entry.entry_date)}</span>{entry.mood ? <span>Настроение: {moodLabels[entry.mood] ?? entry.mood}</span> : null}{entry.weather ? <span>{entry.weather}</span> : null}{entry.status === "draft" ? <span>Чернова</span> : null}</div>
          </div>
        </header>

        <div className="story-content">
          <RichTextContent content={entry.content} />
          {entry.tags.length ? <div className="story-tags" aria-label="Етикети">{entry.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div> : null}
          {entry.journal_photos.length > 1 ? <section className="story-gallery" aria-labelledby="gallery-title"><p className="kicker" id="gallery-title">Кадри от този ден</p><div>{entry.journal_photos.slice(1).map((photo, index) => photo.signedUrl ? <figure key={photo.id}><Image src={photo.signedUrl} alt={`${entry.title}, снимка ${index + 2}`} fill sizes="(max-width: 760px) 100vw, 50vw" /></figure> : null)}</div></section> : null}
          <footer className="story-footer"><span>{entry.is_favorite ? "♥ Любим спомен" : "Дневник на живота"}</span><Link href={`/journal/${entry.id}/edit`}>Редактирай този спомен</Link></footer>
        </div>
      </article>
    </main>
  );
}
