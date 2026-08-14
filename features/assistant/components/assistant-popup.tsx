"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AssistantExperience } from "./assistant-experience";

export function AssistantPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus());
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (pathname === "/login") return null;

  return <>
    <button type="button" className={`assistant-fab${open ? " is-open" : ""}`} onClick={() => setOpen((current) => !current)} aria-label={open ? "Затвори AI асистента" : "Отвори AI асистента"} aria-expanded={open} aria-controls="assistant-popup">
      <span aria-hidden="true">{open ? "×" : "AI"}</span>
    </button>
    <div className={`assistant-popup-backdrop${open ? " is-open" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />
    <div id="assistant-popup" ref={panelRef} className={`assistant-popup${open ? " is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Личен AI асистент" aria-hidden={!open}>
      <div className="assistant-popup-bar"><div><i /><span>Личен AI асистент</span></div><button type="button" onClick={() => setOpen(false)} aria-label="Затвори">×</button></div>
      <AssistantExperience />
    </div>
  </>;
}
