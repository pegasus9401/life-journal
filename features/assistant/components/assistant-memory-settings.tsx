"use client";

import { useEffect, useState } from "react";
import styles from "./assistant-memory-settings.module.css";

type Memory = { id: string; category: string; content: string; keywords: string[]; enabled: boolean };
const categoryLabels: Record<string, string> = { goal: "Цел", preference: "Предпочитание", training: "Тренировки", nutrition: "Хранене", routine: "Рутина", communication: "Комуникация" };

export function AssistantMemorySettings() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [category, setCategory] = useState("preference");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/assistant/memories", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Паметта не се зареди.");
    setMemories(data.memories ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function persist(memory: Memory) {
    setBusy(true); setError("");
    const response = await fetch("/api/assistant/memories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(memory) });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Промяната не беше запазена.");
    else setMemories((current) => current.map((item) => item.id === memory.id ? data.memory : item));
    setBusy(false);
  }

  async function addMemory() {
    if (!content.trim() || busy) return;
    setBusy(true); setError("");
    const response = await fetch("/api/assistant/memories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, content, keywords: [], enabled: true }) });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Записът не беше добавен.");
    else { setMemories((current) => [data.memory, ...current]); setContent(""); }
    setBusy(false);
  }

  async function removeMemory(id: string) {
    if (busy) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/assistant/memories?id=${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Записът не беше изтрит.");
    else setMemories((current) => current.filter((item) => item.id !== id));
    setBusy(false);
  }

  return <section className={styles.wrap}>
    <div className={styles.summary}><div><strong>Какво помни Pegas</strong><p>Pegas актуализира паметта автоматично от разговорите. Тук можеш да преглеждаш, коригираш, изключваш или изтриваш записите.</p></div><span>{memories.filter((memory) => memory.enabled).length} активни</span></div>
    <div className={styles.add}><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Категория">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input value={content} onChange={(event) => setContent(event.target.value)} placeholder="Добави факт или предпочитание" maxLength={1000}/><button type="button" disabled={busy || !content.trim()} onClick={() => void addMemory()}>Добави</button></div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {loading ? <div className={styles.status}>Зареждане на паметта…</div> : memories.length ? <div className={styles.list}>{memories.map((memory) => <article className={`${styles.memory} ${memory.enabled ? "" : styles.disabled}`} key={memory.id}><button className={styles.toggle} type="button" disabled={busy} aria-label={memory.enabled ? "Изключи записа" : "Включи записа"} onClick={() => void persist({ ...memory, enabled: !memory.enabled })}>{memory.enabled ? "✓" : "○"}</button><div className={styles.body}><label>{categoryLabels[memory.category] ?? memory.category}</label><textarea defaultValue={memory.content} maxLength={1000} aria-label="Съдържание на паметта" onBlur={(event) => { const next = event.currentTarget.value.trim(); if (next && next !== memory.content) void persist({ ...memory, content: next }); }}/></div><button className={styles.remove} type="button" disabled={busy} aria-label="Изтрий записа" onClick={() => void removeMemory(memory.id)}>×</button></article>)}</div> : <div className={styles.empty}>Pegas още няма запазена дългосрочна памет. Тя ще се попълва автоматично, докато разговаряте.</div>}
  </section>;
}
