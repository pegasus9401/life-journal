"use client";

import Image from "next/image";
import { Fragment, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Action = { tool: string; result: Record<string, unknown> };
type Message = { id?: string; role: "user" | "assistant"; content: string; actions?: Action[] };
type Persona = "friend" | "guardian" | "data_nerd" | "commander";
type Conversation = { id: string; title: string; persona: Persona; updated_at: string };
type Memory = { id: string; category: string; content: string; keywords: string[]; enabled: boolean };
const personaLabels: Record<Persona, string> = { friend: "Friend", guardian: "Guardian", data_nerd: "Data Nerd", commander: "Commander" };
const suggestions = ["Какво имам днес?", "Планирай деня ми", "Добави храна", "Направи тренировка", "Добави задача", "Анализирай деня ми"];
const toolLabels: Record<string, string> = {
  get_day: "Преглед на деня", create_task: "Задачата е добавена", create_event: "Събитието е добавено",
  add_nutrition: "Храната е добавена", create_workout: "Тренировката е добавена", update_task: "Задачата е обновена",
  complete_task: "Задачата е завършена", search_food: "Резултати за храна",
};

function inlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : <Fragment key={index}>{part}</Fragment>);
}

function AssistantContent({ content }: { content: string }) {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flushList = () => { if (list.length) { blocks.push(<ul key={`list-${blocks.length}`}>{list.map((line, index) => <li key={index}>{inlineMarkdown(line)}</li>)}</ul>); list = []; } };
  lines.forEach((line) => {
    if (/^[-•]\s+/.test(line)) { list.push(line.replace(/^[-•]\s+/, "")); return; }
    flushList();
    if (/^#{1,3}\s+/.test(line)) blocks.push(<h3 key={`heading-${blocks.length}`}>{inlineMarkdown(line.replace(/^#{1,3}\s+/, ""))}</h3>);
    else blocks.push(<p key={`paragraph-${blocks.length}`}>{inlineMarkdown(line)}</p>);
  });
  flushList();
  return <div className="assistant-rich-text">{blocks}</div>;
}

function actionLabel(action: Action) { return toolLabels[action.tool] ?? action.tool.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "); }

export function AssistantExperience() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]); const [input, setInput] = useState(""); const [pending, setPending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null); const [conversations, setConversations] = useState<Conversation[]>([]);
  const [persona, setPersona] = useState<Persona>("friend"); const [memories, setMemories] = useState<Memory[]>([]); const [showMemory, setShowMemory] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState(""); const [memoryCategory, setMemoryCategory] = useState("preference"); const [requestError, setRequestError] = useState("");
  const [image, setImage] = useState<string | null>(null); const [imageName, setImageName] = useState(""); const bottomRef = useRef<HTMLDivElement>(null);

  async function load(id?: string | null) {
    const response = await fetch(`/api/assistant${id ? `?conversationId=${id}` : ""}`, { cache: "no-store" }); const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Intelligence не се зареди.");
    setConversations(data.conversations ?? []); setMemories(data.memories ?? []); setPersona(data.persona ?? "friend");
    if (id) setMessages((data.messages ?? []).map((message: { id: string; role: "user" | "assistant"; content: string; metadata?: { actions?: Action[] } }) => ({ id: message.id, role: message.role, content: message.content, actions: message.metadata?.actions })));
  }

  useEffect(() => { const timer = window.setTimeout(() => { void load().catch((error) => setRequestError(error.message)); }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, pending]);

  async function choosePersona(value: Persona) { setPersona(value); const response = await fetch("/api/assistant/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona: value }) }); if (!response.ok) setRequestError("Persona не беше запазена."); }
  async function openConversation(id: string) { setConversationId(id); setRequestError(""); await load(id).catch((error) => setRequestError(error.message)); }
  function newConversation() { setConversationId(null); setMessages([]); setRequestError(""); }

  async function send(text: string, attachedImage: string | null = null) {
    const command = text.trim() || (attachedImage ? "Анализирай тази снимка." : ""); if (!command || pending) return;
    const outgoing: Message[] = [...messages, { role: "user", content: command }]; setMessages([...outgoing, { role: "assistant", content: "" }]); setInput(""); setPending(true); setRequestError(""); setImage(null); setImageName("");
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: outgoing.map(({ role, content }) => ({ role, content })), image: attachedImage, conversationId }) });
      if (!response.ok || !response.body) { const data = await response.json().catch(() => null); throw new Error(data?.error ?? "Не успях да изпълня командата."); }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) { if (!line.trim()) continue; const event = JSON.parse(line) as { type: string; text?: string; error?: string; conversationId?: string; actions?: Action[] };
          if (event.type === "meta" && event.conversationId) setConversationId(event.conversationId);
          if (event.type === "text" && event.text) setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, content: message.content + event.text } : message));
          if (event.type === "done") { const completedActions = event.actions ?? []; setMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, content: message.content || "Готово.", actions: completedActions } : message)); if (completedActions.length) router.refresh(); }
          if (event.type === "error") throw new Error(event.error);
        }
      }
      await load();
    } catch (error) { setMessages((current) => current.filter((_, index) => index !== current.length - 1)); setRequestError(error instanceof Error ? error.message : "Връзката прекъсна."); }
    finally { setPending(false); }
  }

  async function saveMemory() {
    if (!memoryDraft.trim()) return; const response = await fetch("/api/assistant/memories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: memoryCategory, content: memoryDraft, keywords: [], enabled: true }) }); const data = await response.json();
    if (!response.ok) { setRequestError(data.error); return; } setMemories((current) => [data.memory, ...current]); setMemoryDraft("");
  }
  async function updateMemory(memory: Memory, patch: Partial<Memory>) { const next = { ...memory, ...patch }; const response = await fetch("/api/assistant/memories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }); if (response.ok) setMemories((current) => current.map((item) => item.id === memory.id ? next : item)); }
  async function deleteMemory(id: string) { const response = await fetch(`/api/assistant/memories?id=${id}`, { method: "DELETE" }); if (response.ok) setMemories((current) => current.filter((item) => item.id !== id)); }
  function submit(event: FormEvent) { event.preventDefault(); void send(input, image); }

  async function attachPhoto(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ""; if (!file || !file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) { setRequestError("Избери JPG/PNG снимка до 15 MB."); return; } const bitmap = await createImageBitmap(file); const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale); canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close(); const encoded = canvas.toDataURL("image/jpeg", .65); if (encoded.length > 2_900_000) { setRequestError("Снимката е прекалено голяма."); return; } setImage(encoded); setImageName("Снимка на храна"); }

  return <section className="assistant-layout intelligence-layout">
    <header className="assistant-header intelligence-header"><div><p className="life-kicker">PegasOS Intelligence</p><h1>Какво да направим?</h1></div><div className="intelligence-header-actions"><button type="button" onClick={() => setShowMemory((value) => !value)}>Памет</button><button type="button" onClick={newConversation}>＋ Нов разговор</button></div></header>
    <div className="intelligence-personas" aria-label="AI persona">{(Object.keys(personaLabels) as Persona[]).map((value) => <button type="button" className={persona === value ? "active" : ""} key={value} onClick={() => void choosePersona(value)}>{personaLabels[value]}</button>)}</div>
    {showMemory ? <aside className="intelligence-memory"><header><div><strong>Какво помни Pegas</strong><small>Само включените релевантни записи се изпращат към AI.</small></div><button type="button" onClick={() => setShowMemory(false)}>×</button></header><div className="intelligence-memory-add"><select value={memoryCategory} onChange={(event) => setMemoryCategory(event.target.value)}><option value="goal">Цел</option><option value="preference">Предпочитание</option><option value="training">Тренировки</option><option value="nutrition">Хранене</option><option value="routine">Рутина</option><option value="communication">Комуникация</option></select><input value={memoryDraft} onChange={(event) => setMemoryDraft(event.target.value)} placeholder="Напр. Не обичам сутрешни тренировки"/><button type="button" onClick={() => void saveMemory()}>Добави</button></div><div className="intelligence-memory-list">{memories.map((memory) => <article key={memory.id} className={memory.enabled ? "" : "disabled"}><button type="button" onClick={() => void updateMemory(memory, { enabled: !memory.enabled })}>{memory.enabled ? "●" : "○"}</button><div><small>{memory.category}</small><p contentEditable suppressContentEditableWarning onBlur={(event) => void updateMemory(memory, { content: event.currentTarget.textContent?.trim() || memory.content })}>{memory.content}</p></div><button type="button" onClick={() => void deleteMemory(memory.id)}>×</button></article>)}</div></aside> : null}
    <div className="assistant-panel intelligence-panel">
      {conversations.length ? <nav className="intelligence-history" aria-label="История"><span>История</span>{conversations.map((conversation) => <button type="button" className={conversation.id === conversationId ? "active" : ""} key={conversation.id} onClick={() => void openConversation(conversation.id)}>{conversation.title}</button>)}</nav> : null}
      <div className="assistant-messages" aria-live="polite">{!messages.length ? <div className="intelligence-welcome"><Image src="/images/pegas-friend.png" alt="Pegas" width={96} height={72}/><h2>{personaLabels[persona]}</h2><p>Кажи ми какво искаш да направим.</p></div> : null}{messages.map((message, index) => <article className={`assistant-message ${message.role}`} key={message.id ?? `${message.role}-${index}`}><span>{message.role === "assistant" ? "P" : "Ти"}</span><div>{message.content ? <AssistantContent content={message.content}/> : pending ? <div className="assistant-thinking">Мисля…</div> : null}{message.actions?.map((action, actionIndex) => <div className="intelligence-action-card" key={`${action.tool}-${actionIndex}`}><strong>✓ {actionLabel(action)}</strong><span>{action.result?.preview && typeof action.result.preview === "object" && typeof (action.result.preview as Record<string, unknown>).title === "string" && (action.result.preview as Record<string, unknown>).title !== action.tool ? String((action.result.preview as Record<string, unknown>).title) : "Изпълнено успешно"}</span><a href={action.tool.includes("event") ? "/calendar" : action.tool.includes("task") ? "/calendar" : action.tool.includes("nutrition") || action.tool.includes("food") ? "/nutrition" : action.tool === "get_day" ? "/today" : "/workouts"}>Отвори</a></div>)}</div></article>)}<div ref={bottomRef}/></div>
      {!messages.length ? <div className="assistant-suggestions intelligence-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void send(suggestion)}>{suggestion}</button>)}</div> : null}
      {requestError ? <div className="assistant-photo-error" role="alert">{requestError}</div> : null}
      <form className="assistant-composer" onSubmit={submit}>{image ? <div className="assistant-photo-chip"><Image src={image} alt={imageName} width={48} height={48} unoptimized/><span>{imageName}</span><button type="button" onClick={() => setImage(null)}>×</button></div> : null}<div className="assistant-input-row"><label className="intelligence-photo"><input type="file" accept="image/*" capture="environment" onChange={(event) => void attachPhoto(event)} disabled={pending}/><span>📷</span></label><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input, image); } }} placeholder="Ask Pegas anything…" rows={2} maxLength={8000} disabled={pending}/><button type="submit" disabled={pending || (!input.trim() && !image)} aria-label="Изпрати">↑</button></div></form>
    </div>
  </section>;
}
