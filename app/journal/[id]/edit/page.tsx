import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EntryForm } from "@/features/travel/journal/components/entry-form";
import { getJournalEntry } from "@/features/travel/journal/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit entry · Life Journal" };

export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: { user } }, entry] = await Promise.all([supabase.auth.getUser(), getJournalEntry(id)]);
  if (!user) redirect("/login");
  if (!entry) notFound();
  return <main className="editor-page"><nav className="editor-nav"><Link href={`/journal/${id}`}>← Back to entry</Link><span>{entry.status === "draft" ? "Draft" : "Published"}</span></nav><EntryForm userId={user.id} entry={entry} /></main>;
}
