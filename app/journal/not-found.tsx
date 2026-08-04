import Link from "next/link";

export default function JournalNotFound() {
  return <main className="journal-not-found"><p className="kicker">Споменът не е намерен</p><h1>Тази страница вече не съществува.</h1><Link className="primary-button" href="/journal">Върни се в дневника</Link></main>;
}
