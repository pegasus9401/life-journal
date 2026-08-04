"use client";

export default function JournalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="journal-not-found">
      <p className="kicker">The page did not load</p>
      <h1>Your memories are still safe.</h1>
      <p className="intro">Check your connection and try once more.</p>
      <button className="primary-button" type="button" onClick={reset}>Try again</button>
    </main>
  );
}
