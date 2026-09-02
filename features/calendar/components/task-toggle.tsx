"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleTask } from "../actions";

export function TaskToggle({ id, completed, className = "" }: { id: string; completed: boolean; className?: string }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [value, setValue] = useState(completed);
  return <button className={className} data-completed={value} type="button" aria-label={value ? "Маркирай като незавършена" : "Маркирай като завършена"} aria-pressed={value} disabled={pending} onClick={async () => { setPending(true); setValue(!value); const result = await toggleTask(id, !value); if (!result.ok) setValue(value); setPending(false); router.refresh(); }}><span aria-hidden="true">{value ? "✓" : ""}</span></button>;
}
