"use client";

import { FormEvent, useRef, useState } from "react";
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
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const command = text.trim(); if (!command || pending) return;
    const nextMessages: Message[] = [...messages, { role: "user", content: command }];
    setMessages(nextMessages); setInput(""); setPending(true);
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: nextMessages }) });
      const result = await response.json() as { message?: string; error?: string; actions?: unknown[] };
      setMessages((current) => [...current, { role: "assistant", content: result.message ?? result.error ?? "Не успях да изпълня командата." }]);
      if (result.actions?.length) router.refresh();
    } catch { setMessages((current) => [...current, { role: "assistant", content: "Връзката прекъсна. Опитай отново." }]); }
    finally { setPending(false); requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void send(input); }

  return <section className="assistant-layout">
    <header className="assistant-header"><div><p className="life-kicker">Личен AI асистент</p><h1>Какво да направим?</h1><p>Календар, дневник, хранене и тренировки — просто ми кажи.</p></div><span className="assistant-status"><i /> Готов</span></header>
    <div className="assistant-panel">
      <div className="assistant-messages" aria-live="polite">
        {messages.map((message, index) => <article className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? "AI" : "Ти"}</span><p>{message.content}</p></article>)}
        {pending ? <article className="assistant-message assistant thinking"><span>AI</span><p><i /><i /><i /></p></article> : null}<div ref={bottomRef} />
      </div>
      {messages.length === 1 ? <div className="assistant-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void send(suggestion)}>{suggestion}</button>)}</div> : null}
      <form className="assistant-composer" onSubmit={submit}><label htmlFor="assistant-command">Команда към асистента</label><textarea id="assistant-command" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); } }} placeholder="Напр. добави вечеря за днес…" rows={2} maxLength={8000} disabled={pending} /><button type="submit" disabled={pending || !input.trim()} aria-label="Изпрати">↑</button><small>За изтриване винаги ще поискам потвърждение.</small></form>
    </div>
  </section>;
}
