import Link from "next/link";
import { TaskToggle } from "./task-toggle";
import type { CalendarItem as Item } from "../types";

const typeLabels = { event: "Събитие", task: "Задача", birthday: "Рожден ден", workout: "Тренировка", meal: "Хранене", trip: "Пътуване", reminder: "Напомняне" };

export function CalendarItem({ item, compact = false }: { item: Item; compact?: boolean }) {
  const content = <>
    <span className={`calendar-item-dot color-${item.color}`} />
    <span className="calendar-item-copy">
      {!compact ? <small>{typeLabels[item.type]}</small> : null}
      <strong>{item.title}</strong>
      {!compact && item.location ? <span>{item.location}</span> : null}
    </span>
    {item.time ? <time>{item.time}</time> : item.allDay && !compact ? <time>Цял ден</time> : null}
  </>;

  if (item.type === "task") return <div className={`calendar-item ${compact ? "compact" : ""} ${item.completed ? "completed" : ""}`}><TaskToggle id={item.sourceId} completed={Boolean(item.completed)} />{content}<Link className="item-edit-link" href={`/calendar/edit/task/${item.sourceId}`} aria-label={`Редактирай ${item.title}`}>•••</Link></div>;
  return <Link className={`calendar-item ${compact ? "compact" : ""}`} href={`/calendar/edit/${item.type}/${item.sourceId}`}>{content}</Link>;
}
