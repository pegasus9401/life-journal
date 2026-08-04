"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteJournalEntry } from "../actions";

export function DeleteEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Да изтрия ли този запис и всички негови снимки? Действието е необратимо.")) return;
    setPending(true);
    const result = await deleteJournalEntry(entryId);
    if (result.ok) router.push("/journal");
    else {
      setPending(false);
      window.alert(result.message);
    }
  }

  return <button className="danger-button" type="button" disabled={pending} onClick={handleDelete}>{pending ? "Изтриване…" : "Изтрий записа"}</button>;
}
