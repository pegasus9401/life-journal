"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCalendarSource } from "../actions";

export function DeleteCalendarItem({ type, id }: { type: "event" | "task" | "birthday"; id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return <button className="danger-button" disabled={pending} type="button" onClick={async () => { if (!window.confirm("Да изтрия ли този запис?")) return; setPending(true); const result = await deleteCalendarSource(type, id); if (result.ok) router.push("/calendar"); else setPending(false); }}>{pending ? "Изтриване…" : "Изтрий"}</button>;
}
