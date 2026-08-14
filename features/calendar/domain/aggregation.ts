import { addDays, expandRecurrence } from "./date-utils";
import type { BirthdayRow, CalendarEventRow, CalendarItem, TaskRow } from "../types";

function timeInZone(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("bg-BG", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function dateInZone(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

export function aggregateCalendarItems(events: CalendarEventRow[], tasks: TaskRow[], birthdays: BirthdayRow[], rangeStart: string, rangeEnd: string): CalendarItem[] {
  const items: CalendarItem[] = [];
  for (const event of events) {
    const start = event.all_day ? event.start_date! : dateInZone(event.starts_at!, event.timezone);
    const end = event.all_day ? event.end_date! : dateInZone(event.ends_at!, event.timezone);
    const duration = Math.max(0, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000));
    for (const occurrence of expandRecurrence(start, event.recurrence_kind, event.recurrence_interval, rangeStart, rangeEnd, event.recurrence_end)) {
      items.push({ id: `event:${event.id}:${occurrence}`, type: "event", sourceId: event.id, sourceType: "calendar_events", title: event.title, date: occurrence, endDate: addDays(occurrence, duration), time: event.all_day ? undefined : timeInZone(event.starts_at!, event.timezone), endTime: event.all_day ? undefined : timeInZone(event.ends_at!, event.timezone), allDay: event.all_day, category: event.category, color: event.color, location: event.location, recurring: event.recurrence_kind !== "none" });
    }
  }
  for (const task of tasks) {
    if (!task.due_date) continue;
    for (const occurrence of expandRecurrence(task.due_date, task.recurrence_kind, task.recurrence_interval, rangeStart, rangeEnd, task.recurrence_end)) {
      items.push({ id: `task:${task.id}:${occurrence}`, type: "task", sourceId: task.id, sourceType: "tasks", title: task.title, date: occurrence, time: task.due_time?.slice(0, 5), allDay: !task.due_time, completed: task.completed, category: task.category, color: task.priority === "high" ? "rose" : "indigo", recurring: task.recurrence_kind !== "none" });
    }
  }
  for (const birthday of birthdays) {
    const [, month, day] = birthday.birth_date.split("-");
    for (let year = Number(rangeStart.slice(0, 4)) - 1; year <= Number(rangeEnd.slice(0, 4)) + 1; year++) {
      const occurrence = `${year}-${month}-${day}`;
      if (occurrence >= rangeStart && occurrence <= rangeEnd) items.push({ id: `birthday:${birthday.id}:${occurrence}`, type: "birthday", sourceId: birthday.id, sourceType: "birthdays", title: birthday.person_name, date: occurrence, allDay: true, color: "amber", recurring: true });
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.title.localeCompare(b.title));
}
