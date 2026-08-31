"use client";

export function CaptureButton() {
  return <button type="button" className="p2-capture-button" aria-label="Бързо добавяне" onClick={() => window.dispatchEvent(new Event("open-quick-capture"))}><span>+</span></button>;
}
