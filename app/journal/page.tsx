import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLink } from "@/components/brand-link";
import { signOut } from "@/features/auth/actions";
import { getJournalEntries } from "@/features/travel/journal/queries";

export const metadata = { title: "Дневник за пътувания · Дневник на живота" };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

const moodLabels: Record<string, string> = { joyful: "радостно", peaceful: "спокойно", excited: "вълнуващо", reflective: "замислено", tired: "уморено", challenging: "предизвикателно" };

export default async function JournalPage() {
  const entries = await getJournalEntries();
  if (!entries) redirect("/login");

  return (
    <main className="journal-shell">
      <nav className="topbar" aria-label="Навигация на дневника">
        <BrandLink />
        <div className="nav-actions"><Link className="quiet-link" href="/journal/new">Нов запис</Link><form action={signOut}><button className="quiet-button" type="submit">Изход</button></form></div>
      </nav>
      <header className="journal-index-header">
        <div><p className="kicker">Дневник за пътувания</p><h1>Дни, които си струва да запазиш.</h1><p className="intro">Тихо място за всяко посетено място и чувството да бъдеш там.</p></div>
        <Link className="primary-button" href="/journal/new"><span aria-hidden="true">+</span>Запиши днешния ден</Link>
      </header>

      {entries.length === 0 ? (
        <section className="journal-empty-card"><p className="memory-number">01</p><h2>Първата ти страница те очаква.</h2><p>Започни с днешния ден. Достатъчни са заглавие и няколко искрени реда.</p><Link className="secondary-button" href="/journal/new">Създай първия си запис</Link></section>
      ) : (
        <section className="entry-list" aria-label="Записи в дневника">
          {entries.map((entry) => {
            const cover = entry.journal_photos[0];
            return (
              <Link className="entry-card" href={`/journal/${entry.id}`} key={entry.id}>
                <div className={`entry-card-image ${cover?.signedUrl ? "has-photo" : ""}`}>
                  {cover?.signedUrl ? <Image src={cover.signedUrl} alt="" fill sizes="(max-width: 760px) 100vw, 50vw" /> : <span aria-hidden="true">{formatDate(entry.entry_date).slice(0, 2)}</span>}
                  {entry.status === "draft" ? <span className="status-badge">Чернова</span> : null}
                </div>
                <div className="entry-card-copy">
                  <p className="entry-meta">{entry.location_name ?? "Някъде в спомените"} · {formatDate(entry.entry_date)}</p>
                  <h2>{entry.title}</h2>
                  <p>{entry.content_text || "Един спомен придобива форма…"}</p>
                  <div className="entry-card-footer"><span>{entry.mood ? `Настроение: ${moodLabels[entry.mood] ?? entry.mood}` : "Бележка от пътуване"}</span>{entry.is_favorite ? <span aria-label="Любим запис">♥</span> : null}</div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
