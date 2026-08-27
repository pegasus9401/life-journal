"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTimelineCompleted } from "../actions";
import type { TimelineCategory, TimelineItem } from "../types";
import styles from "./timeline.module.css";

type Filter = "all" | TimelineCategory;
const filters: { value: Filter; label: string }[] = [{ value: "all", label: "Всичко" }, { value: "food", label: "Храна" }, { value: "workout", label: "Тренировки" }, { value: "journal", label: "Дневник" }, { value: "tasks", label: "Задачи" }, { value: "health", label: "Здраве" }];
const statusLabels = { planned: "Планирано", in_progress: "В процес", completed: "Завършено", missed: "Пропуснато", skipped: "Отказано" } as const;

export function LifeTimeline({ items, calories, calorieGoal, protein, proteinGoal }: { items: TimelineItem[]; calories: number; calorieGoal: number; protein: number; proteinGoal: number }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [statuses, setStatuses] = useState<Record<string, TimelineItem["status"]>>({});
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const visible = useMemo(() => (filter === "all" ? items : items.filter((item) => item.category === filter)).map((item) => ({ ...item, status: statuses[item.id] ?? item.status })), [filter, items, statuses]);
  function toggle(item: TimelineItem) {
    if (!item.completion || pending) return;
    const completed = item.status !== "completed";
    const previous = item.status;
    setStatuses((current) => ({ ...current, [item.id]: completed ? "completed" : "planned" }));
    setMessage("");
    startTransition(async () => {
      const result = await setTimelineCompleted(item.completion!, completed);
      if (!result.ok) setStatuses((current) => ({ ...current, [item.id]: previous }));
      setMessage(result.message);
      router.refresh();
    });
  }
  return <section className={styles.timeline} aria-labelledby="timeline-title">
    <header><div><p>ЖИВОТЪТ ТИ ДНЕС</p><h2 id="timeline-title">Timeline</h2></div><span>{visible.length} записа</span></header>
    <nav className={styles.timelineFilters} data-horizontal-scroll aria-label="Филтри на Timeline">{filters.map((item) => <button type="button" key={item.value} className={filter === item.value ? styles.activeFilter : ""} onClick={() => setFilter(item.value)}>{item.label}</button>)}</nav>
    {filter === "food" ? <div className={styles.timelineSummary}><span><b>{Math.round(calories)}</b> / {calorieGoal} kcal</span><span><b>{Math.round(protein)}</b> / {proteinGoal} g протеин</span></div> : null}
    {message ? <p className={styles.timelineMessage} role="status">{message}</p> : null}
    <div className={styles.timelineFlow}>{visible.map((item) => <article className={`${styles.timelineItem} ${item.status === "completed" ? styles.completedItem : ""}`} key={item.id}>
      <time>{item.time ?? "Ден"}</time><i aria-hidden="true">{item.icon}</i><div className={styles.timelineCard}><Link href={item.href}><header><strong>{item.title}</strong><em className={styles[item.status]}>{statusLabels[item.status]}</em></header>{item.detail ? <p>{item.detail}</p> : null}{item.meta ? <small>{item.meta}</small> : null}</Link>{item.completion && (item.status === "planned" || item.status === "completed") ? <button type="button" className={styles.completeButton} aria-label={item.status === "completed" ? `Върни ${item.title} в планирани` : `Отбележи ${item.title} като готово`} aria-pressed={item.status === "completed"} disabled={pending} onClick={() => toggle(item)}><span aria-hidden="true">{item.status === "completed" ? "✓" : ""}</span>{item.status === "completed" ? "Готово" : "Отбележи"}</button> : null}</div>
    </article>)}{!visible.length ? <div className={styles.timelineEmpty}><strong>Няма записана активност</strong><span>Продължи към друг ден или добави нещо с Quick Add.</span></div> : null}</div>
  </section>;
}
