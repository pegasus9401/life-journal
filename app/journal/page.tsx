import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLink } from "@/components/brand-link";
import { signOut } from "@/features/auth/actions";
import { getJournalEntries } from "@/features/travel/journal/queries";

export const metadata = { title: "Travel Journal · Life Journal" };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export default async function JournalPage() {
  const entries = await getJournalEntries();
  if (!entries) redirect("/login");

  return (
    <main className="journal-shell">
      <nav className="topbar" aria-label="Journal navigation">
        <BrandLink />
        <div className="nav-actions"><Link className="quiet-link" href="/journal/new">New entry</Link><form action={signOut}><button className="quiet-button" type="submit">Sign out</button></form></div>
      </nav>
      <header className="journal-index-header">
        <div><p className="kicker">Travel journal</p><h1>Days worth keeping.</h1><p className="intro">A quiet record of everywhere you went and how it felt to be there.</p></div>
        <Link className="primary-button" href="/journal/new"><span aria-hidden="true">+</span>Write today</Link>
      </header>

      {entries.length === 0 ? (
        <section className="journal-empty-card"><p className="memory-number">01</p><h2>Your first page is waiting.</h2><p>Begin with today. A title and a few honest lines are enough.</p><Link className="secondary-button" href="/journal/new">Create your first entry</Link></section>
      ) : (
        <section className="entry-list" aria-label="Journal entries">
          {entries.map((entry) => {
            const cover = entry.journal_photos[0];
            return (
              <Link className="entry-card" href={`/journal/${entry.id}`} key={entry.id}>
                <div className={`entry-card-image ${cover?.signedUrl ? "has-photo" : ""}`}>
                  {cover?.signedUrl ? <Image src={cover.signedUrl} alt="" fill sizes="(max-width: 760px) 100vw, 50vw" /> : <span aria-hidden="true">{formatDate(entry.entry_date).slice(0, 2)}</span>}
                  {entry.status === "draft" ? <span className="status-badge">Draft</span> : null}
                </div>
                <div className="entry-card-copy">
                  <p className="entry-meta">{entry.location_name ?? "Somewhere remembered"} · {formatDate(entry.entry_date)}</p>
                  <h2>{entry.title}</h2>
                  <p>{entry.content_text || "A memory taking shape…"}</p>
                  <div className="entry-card-footer"><span>{entry.mood ? `Feeling ${entry.mood}` : "Travel note"}</span>{entry.is_favorite ? <span aria-label="Favorite">♥</span> : null}</div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
