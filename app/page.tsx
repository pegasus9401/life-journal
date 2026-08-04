import { CreateTripButton } from "@/components/create-trip-button";

export default function Home() {
  return (
    <main className="home-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Life Journal home">
          <span className="brand-mark" aria-hidden="true">LJ</span>
          <span>Life Journal</span>
        </a>
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
          <CreateTripButton />
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
