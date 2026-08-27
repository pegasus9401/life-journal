"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TimelineCategory, TimelineItem } from "../types";
import styles from "./timeline.module.css";

type Filter = "all" | TimelineCategory;
const filters: { value: Filter; label: string }[] = [{ value: "all", label: "Всичко" }, { value: "food", label: "Храна" }, { value: "workout", label: "Тренировки" }, { value: "journal", label: "Дневник" }, { value: "tasks", label: "Задачи" }, { value: "health", label: "Здраве" }];
const statusLabels = { planned: "Планирано", in_progress: "В процес", completed: "Завършено", missed: "Пропуснато", skipped: "Отказано" } as const;

export function LifeTimeline({ items, calories, calorieGoal, protein, proteinGoal }: { items: TimelineItem[]; calories: number; calorieGoal: number; protein: number; proteinGoal: number }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => filter === "all" ? items : items.filter((item) => item.category === filter), [filter, items]);
  return <section className={styles.timeline} aria-labelledby="timeline-title">
    <header><div><p>ЖИВОТЪТ ТИ ДНЕС</p><h2 id="timeline-title">Timeline</h2></div><span>{visible.length} записа</span></header>
    <nav className={styles.timelineFilters} data-horizontal-scroll aria-label="Филтри на Timeline">{filters.map((item) => <button type="button" key={item.value} className={filter === item.value ? styles.activeFilter : ""} onClick={() => setFilter(item.value)}>{item.label}</button>)}</nav>
    {filter === "food" ? <div className={styles.timelineSummary}><span><b>{Math.round(calories)}</b> / {calorieGoal} kcal</span><span><b>{Math.round(protein)}</b> / {proteinGoal} g протеин</span></div> : null}
    <div className={styles.timelineFlow}>{visible.map((item) => <Link href={item.href} className={styles.timelineItem} key={item.id}>
      <time>{item.time ?? "Ден"}</time><i aria-hidden="true">{item.icon}</i><div><header><strong>{item.title}</strong><em className={styles[item.status]}>{statusLabels[item.status]}</em></header>{item.detail ? <p>{item.detail}</p> : null}{item.meta ? <small>{item.meta}</small> : null}</div>
    </Link>)}{!visible.length ? <div className={styles.timelineEmpty}><strong>Няма записана активност</strong><span>Продължи към друг ден или добави нещо с Quick Add.</span></div> : null}</div>
  </section>;
}

