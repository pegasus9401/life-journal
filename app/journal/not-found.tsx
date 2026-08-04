import Link from "next/link";

export default function JournalNotFound() {
  return <main className="journal-not-found"><p className="kicker">Memory not found</p><h1>This page is no longer here.</h1><Link className="primary-button" href="/journal">Return to your journal</Link></main>;
}
