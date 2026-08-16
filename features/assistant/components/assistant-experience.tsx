"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  "Добави задача за утре в 10:00 да купя слънцезащитен крем",
  "Какво имам планирано днес?",
  "Запиши обяда ми: пилешко с ориз, 650 калории",
  "Добави силова тренировка за днес, 45 минути",
];

export function AssistantExperience() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Здравей, Вальо. Кажи ми какво да направя в дневника ти." }]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [imageError, setImageError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(text: string, attachedImage: string | null = null) {
    const command = text.trim() || (attachedImage ? "Разпознай продукта от снимката и го добави към храненето ми за днес." : ""); if (!command || pending) return;
    const nextMessages: Message[] = [...messages, { role: "user", content: command }];
    setMessages(nextMessages); setInput(""); setPending(true); setImage(null); setImageName(""); setImageError("");
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: nextMessages, image: attachedImage }) });
      const result = await response.json() as { message?: string; error?: string; actions?: unknown[] };
      setMessages((current) => [...current, { role: "assistant", content: result.message ?? result.error ?? "Не успях да изпълня командата." }]);
      if (result.actions?.length) router.refresh();
    } catch { setMessages((current) => [...current, { role: "assistant", content: "Връзката прекъсна. Опитай отново." }]); }
    finally { setPending(false); requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void send(input, image); }

  async function attachPhoto(event: ChangeEvent<HTMLInputElement>, mode: "barcode" | "food") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setImageError("Избери снимка на продукт."); return; }
    if (file.size > 15 * 1024 * 1024) { setImageError("Снимката е прекалено голяма. Максимумът е 15 MB."); return; }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      setImage(canvas.toDataURL("image/jpeg", .78));
      setImageName(mode === "barcode" ? "Снимка на баркод" : "Снимка на храна");
      setInput((current) => current.trim() ? current : mode === "barcode"
        ? "Разпознай баркода и продукта от снимката. Покажи ми намерените хранителни стойности, преди да го добавиш."
        : "Разпознай храната от снимката и ми помогни да я добавя към храненето за днес.");
      setImageError("");
    } catch { setImageError("Този формат не може да бъде прочетен. Опитай с JPG или PNG."); }
  }

  return <section className="assistant-layout">
    <header className="assistant-header"><div><p className="life-kicker">Личен AI асистент</p><h1>Какво да направим?</h1><p>Календар, дневник, хранене и тренировки — просто ми кажи.</p></div><span className="assistant-status"><i /> Готов</span></header>
    <div className="assistant-panel">
      <div className="assistant-messages" aria-live="polite">
        {messages.map((message, index) => <article className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? "AI" : "Ти"}</span><p>{message.content}</p></article>)}
        {pending ? <article className="assistant-message assistant thinking"><span>AI</span><p><i /><i /><i /></p></article> : null}<div ref={bottomRef} />
      </div>
      {messages.length === 1 ? <div className="assistant-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void send(suggestion)}>{suggestion}</button>)}</div> : null}
      <form className="assistant-composer" onSubmit={submit}>
        <label htmlFor="assistant-command">Команда към асистента</label>
        <div className="assistant-capture-actions" aria-label="Сканиране и снимане">
          <label className="assistant-capture-button barcode"><input type="file" accept="image/*" capture="environment" onChange={(event) => void attachPhoto(event, "barcode")} disabled={pending} /><span aria-hidden="true">▥</span><b>Сканирай баркод</b></label>
          <label className="assistant-capture-button food"><input type="file" accept="image/*" capture="environment" onChange={(event) => void attachPhoto(event, "food")} disabled={pending} /><span aria-hidden="true">📷</span><b>Снимай храна</b></label>
        </div>
        {image ? <div className="assistant-photo-chip"><span>📷 {imageName || "Снимка на продукт"}</span><button type="button" onClick={() => { setImage(null); setImageName(""); }} aria-label="Премахни снимката">×</button></div> : null}
        {imageError ? <p className="assistant-photo-error">{imageError}</p> : null}
        <div className="assistant-input-row"><textarea id="assistant-command" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input, image); } }} placeholder="Напиши команда…" rows={2} maxLength={8000} disabled={pending} /><button type="submit" disabled={pending || (!input.trim() && !image)} aria-label="Изпрати">↑</button></div>
        <small>При баркод го дръж целия в кадър. При храна снимай порцията отгоре.</small>
      </form>
    </div>
  </section>;
}
