import Link from "next/link";
import type { CSSProperties } from "react";
import { TaskToggle } from "./task-toggle";
import type { CalendarItem as Item } from "../types";
import styles from "./calendar-item.module.css";

const typeMeta = {
  event: { label: "Събитие", icon: "○", tone: "#6e91ef" },
  task: { label: "Задача", icon: "✓", tone: "#efb65d" },
  birthday: { label: "Рожден ден", icon: "✦", tone: "#e47bb0" },
  workout: { label: "Тренировка", icon: "↗", tone: "#8173eb" },
  meal: { label: "Хранене", icon: "◇", tone: "#59cfa1" },
  trip: { label: "Пътуване", icon: "↗", tone: "#62a6d8" },
  reminder: { label: "Напомняне", icon: "!", tone: "#d78a55" },
} as const;

function itemTone(item: Item) {
  const named: Record<string, string> = { violet: "#8173eb", purple: "#9d68df", green: "#59cfa1", red: "#eb7180", pink: "#e47bb0", blue: "#6e91ef", orange: "#efb65d" };
  if (item.color.startsWith("#")) return item.color;
  return named[item.color] ?? typeMeta[item.type].tone;
}

export function CalendarItem({ item, compact = false }: { item: Item; compact?: boolean }) {
  const meta = typeMeta[item.type];
  const style = { "--item-tone": itemTone(item) } as CSSProperties;
  const copy = <>
    <span className={styles.icon} aria-hidden="true">{item.sticker ?? meta.icon}</span>
    <span className={styles.copy}>
      <small>{meta.label}</small>
      <strong>{item.title}</strong>
      {!compact && item.location ? <span>{item.location}</span> : null}
    </span>
    <time>{item.time ?? (item.allDay ? "Цял ден" : "")}</time>
  </>;

  const className = `${styles.item} ${compact ? styles.compact : ""} ${item.completed ? styles.completed : ""}`;
  if (item.type === "workout") return <Link data-type={item.type} className={className} style={style} href={`/calendar/edit/workout/${item.sourceId}`}>{copy}<b className={styles.chevron} aria-hidden="true">›</b></Link>;
  if (item.type === "task") return <div data-type={item.type} className={`${className} ${styles.taskItem}`} style={style}><TaskToggle id={item.sourceId} completed={Boolean(item.completed)} className={styles.taskToggle} />{copy}<Link className={styles.editLink} href={`/calendar/edit/task/${item.sourceId}`} aria-label={`Редактирай ${item.title}`}>•••</Link></div>;
  return <Link data-type={item.type} className={className} style={style} href={`/calendar/edit/${item.type}/${item.sourceId}`}>{copy}<b className={styles.chevron} aria-hidden="true">›</b></Link>;
}
