import Link from "next/link";
import { redirect } from "next/navigation";
import { EntryForm } from "@/features/travel/journal/components/entry-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "New entry · Life Journal" };

export default async function NewEntryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <main className="editor-page"><nav className="editor-nav"><Link href="/journal">← Journal</Link><span>Private entry</span></nav><EntryForm userId={user.id} /></main>;
}
