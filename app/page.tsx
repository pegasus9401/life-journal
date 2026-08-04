import Link from "next/link";

import { BrandLink } from "@/components/brand-link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="home-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <BrandLink />
        <span className="eyebrow">Your story starts here</span>
      </nav>

      <section className="hero" aria-labelledby="welcome-title">
        <div className="hero-copy">
          <p className="kicker">A place for the days worth remembering</p>
          <h1 id="welcome-title">Turn your journeys into stories.</h1>
          <p className="intro">
            Collect the places, moments, and small details that made each trip yours.
            Begin with one journey — the rest can unfold naturally.
          </p>
          <Link className="primary-button" href={user ? "/journal" : "/login"}>
            <span aria-hidden="true">+</span>
            Create your first trip
          </Link>
          <p className="helper">It only takes a moment to begin.</p>
        </div>

        <div className="memory-card" aria-label="A preview of your future travel journal">
          <div className="memory-image" aria-hidden="true">
            <div className="sun" />
            <div className="hill hill-back" />
            <div className="hill hill-front" />
          </div>
          <div className="memory-meta">
            <div>
              <p className="memory-place">Somewhere unforgettable</p>
              <p className="memory-date">Your first journey</p>
            </div>
            <span className="memory-number">01</span>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>Made for a life well remembered.</span>
        <span aria-hidden="true">✦</span>
      </footer>
    </main>
  );
}
