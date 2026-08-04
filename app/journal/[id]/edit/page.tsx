import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EntryForm } from "@/features/travel/journal/components/entry-form";
import { getJournalEntry } from "@/features/travel/journal/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Редактиране · Дневник на живота" };

export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: { user } }, entry] = await Promise.all([supabase.auth.getUser(), getJournalEntry(id)]);
  if (!user) redirect("/login");
  if (!entry) notFound();
  return <main className="editor-page"><nav className="editor-nav"><Link href={`/journal/${id}`}>← Назад към записа</Link><span>{entry.status === "draft" ? "Чернова" : "Публикуван"}</span></nav><EntryForm userId={user.id} entry={entry} /></main>;
}
