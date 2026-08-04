"use client";

export default function JournalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="journal-not-found">
      <p className="kicker">Страницата не се зареди</p>
      <h1>Спомените ти са в безопасност.</h1>
      <p className="intro">Провери връзката си и опитай отново.</p>
      <button className="primary-button" type="button" onClick={reset}>Опитай отново</button>
    </main>
  );
}
