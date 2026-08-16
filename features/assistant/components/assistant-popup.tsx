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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("close-assistant-popup", close);
    return () => window.removeEventListener("close-assistant-popup", close);
  }, []);

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
    <style jsx global>{`
      @media (max-width: 820px) {
        .assistant-popup {
          top: max(10px, env(safe-area-inset-top)) !important;
          right: 8px !important;
          bottom: max(10px, env(safe-area-inset-bottom)) !important;
          left: 8px !important;
          width: auto !important;
          height: auto !important;
          max-height: none !important;
          border-radius: 24px !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .assistant-popup-bar {
          flex: 0 0 58px !important;
          min-height: 58px !important;
          padding: 0 12px 0 18px !important;
          color: #30263b !important;
          border-color: #eee7f5 !important;
          background: rgba(255,255,255,.98) !important;
        }
        .assistant-popup .assistant-layout {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          display: flex !important;
        }
        .assistant-popup .assistant-panel {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          background: #fff !important;
        }
        .assistant-popup .assistant-messages {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          padding: 20px 16px !important;
          gap: 14px !important;
        }
        .assistant-popup .assistant-message {
          max-width: 92% !important;
          gap: 9px !important;
        }
        .assistant-popup .assistant-message p {
          padding: 11px 13px !important;
          font-size: 14px !important;
          line-height: 1.45 !important;
          color: #30263b !important;
          background: #f3eef8 !important;
        }
        .assistant-popup .assistant-suggestions {
          flex: 0 0 auto !important;
          grid-template-columns: 1fr !important;
          max-height: 178px !important;
          overflow-y: auto !important;
          padding: 0 12px 10px !important;
          gap: 7px !important;
        }
        .assistant-popup .assistant-suggestions button {
          min-height: 44px !important;
          padding: 10px 12px !important;
          font-size: 11px !important;
          color: #473a55 !important;
          border-color: #e3d8ee !important;
          background: #fbf9fd !important;
        }
        .assistant-popup .assistant-composer {
          flex: 0 0 auto !important;
          padding: 10px !important;
          padding-bottom: max(10px, env(safe-area-inset-bottom)) !important;
          border-color: #e8deef !important;
          background: #f7f3fa !important;
        }
        .assistant-popup .assistant-input-row {
          grid-template-columns: minmax(0,1fr) 44px !important;
          gap: 7px !important;
        }
        .assistant-popup .assistant-capture-actions {
          grid-template-columns: 1fr 1fr !important;
          gap: 7px !important;
        }
        .assistant-popup .assistant-capture-button {
          min-height: 48px !important;
          padding: 0 10px !important;
          color: #5b21b6 !important;
          border-color: #d9c8f4 !important;
          background: #f1eafd !important;
        }
        .assistant-popup .assistant-capture-button.food {
          color: #047857 !important;
          border-color: #afe5d1 !important;
          background: #eaf9f3 !important;
        }
        .assistant-popup .assistant-capture-button b { display: inline !important; }
        .assistant-popup .assistant-composer textarea {
          min-height: 42px !important;
          height: 42px !important;
          max-height: 100px !important;
          padding: 11px 13px !important;
          border-radius: 13px !important;
          resize: none !important;
          font-size: 16px !important;
          color: #30263b !important;
          border-color: #ded4e7 !important;
          background: #fff !important;
        }
        .assistant-popup .assistant-input-row > button {
          width: 44px !important;
          height: 44px !important;
        }
        .assistant-popup .assistant-composer small { display: none !important; }
        .assistant-fab.is-open { display: none !important; }
      }
    `}</style>
  </>;
}
