"use client";

import { useEffect, useState } from "react";
import styles from "./assistant-memory-settings.module.css";

type Memory = { id: string; category: string; content: string; keywords: string[]; enabled: boolean };
type Persona = "friend" | "guardian" | "data_nerd" | "commander";
const categoryLabels: Record<string, string> = { goal: "Цел", preference: "Предпочитание", training: "Тренировки", nutrition: "Хранене", routine: "Рутина", communication: "Комуникация" };
const personas: Array<{ value: Persona; label: string; description: string }> = [
  { value: "friend", label: "Friend", description: "Топъл, естествен и подкрепящ" },
  { value: "guardian", label: "Guardian", description: "Спокоен, разумен и балансиран" },
  { value: "data_nerd", label: "Data Nerd", description: "Аналитичен, точен и ориентиран към данните" },
  { value: "commander", label: "Commander", description: "Кратък, директен и ориентиран към действие" },
];

export function AssistantMemorySettings() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [persona, setPersona] = useState<Persona>("friend");
  const [category, setCategory] = useState("preference");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [memoryResponse, settingsResponse] = await Promise.all([fetch("/api/assistant/memories", { cache: "no-store" }), fetch("/api/assistant/settings", { cache: "no-store" })]);
    const [memoryData, settingsData] = await Promise.all([memoryResponse.json(), settingsResponse.json()]);
    if (!memoryResponse.ok) throw new Error(memoryData.error ?? "Паметта не се зареди.");
    if (!settingsResponse.ok) throw new Error(settingsData.error ?? "Поведението не се зареди.");
    setMemories(memoryData.memories ?? []); setPersona(settingsData.persona ?? "friend");
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

  async function choosePersona(value: Persona) {
    if (busy || value === persona) return;
    const previous = persona; setPersona(value); setBusy(true); setError("");
    const response = await fetch("/api/assistant/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona: value }) });
    const data = await response.json();
    if (!response.ok) { setPersona(previous); setError(data.error ?? "Поведението не беше запазено."); }
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
    <div className={styles.behavior}><div><strong>Как да се държи Pegas</strong><p>Този избор се запазва за всички разговори. Можеш да го промениш по всяко време.</p></div><div className={styles.personas}>{personas.map((option) => <button type="button" className={persona === option.value ? styles.selected : ""} disabled={busy} key={option.value} onClick={() => void choosePersona(option.value)}><span>{option.label}</span><small>{option.description}</small><i>{persona === option.value ? "✓" : ""}</i></button>)}</div></div>
    <div className={styles.summary}><div><strong>Какво помни Pegas</strong><p>Pegas актуализира паметта автоматично от разговорите. Тук можеш да преглеждаш, коригираш, изключваш или изтриваш записите.</p></div><span>{memories.filter((memory) => memory.enabled).length} активни</span></div>
    <div className={styles.add}><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Категория">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input value={content} onChange={(event) => setContent(event.target.value)} placeholder="Добави факт или предпочитание" maxLength={1000}/><button type="button" disabled={busy || !content.trim()} onClick={() => void addMemory()}>Добави</button></div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {loading ? <div className={styles.status}>Зареждане на паметта…</div> : memories.length ? <div className={styles.list}>{memories.map((memory) => <article className={`${styles.memory} ${memory.enabled ? "" : styles.disabled}`} key={memory.id}><button className={styles.toggle} type="button" disabled={busy} aria-label={memory.enabled ? "Изключи записа" : "Включи записа"} onClick={() => void persist({ ...memory, enabled: !memory.enabled })}>{memory.enabled ? "✓" : "○"}</button><div className={styles.body}><label>{categoryLabels[memory.category] ?? memory.category}</label><textarea defaultValue={memory.content} maxLength={1000} aria-label="Съдържание на паметта" onBlur={(event) => { const next = event.currentTarget.value.trim(); if (next && next !== memory.content) void persist({ ...memory, content: next }); }}/></div><button className={styles.remove} type="button" disabled={busy} aria-label="Изтрий записа" onClick={() => void removeMemory(memory.id)}>×</button></article>)}</div> : <div className={styles.empty}>Pegas още няма запазена дългосрочна памет. Тя ще се попълва автоматично, докато разговаряте.</div>}
  </section>;
}
