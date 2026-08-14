import type { CalendarView, RecurrenceKind } from "../types";

export const DEFAULT_TIMEZONE = "Europe/Sofia";

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}

export function startOfWeek(value: string) {
  const date = parseDateKey(value);
  const offset = (date.getUTCDay() + 6) % 7;
  return addDays(value, -offset);
}

export function getViewRange(view: CalendarView, selected: string) {
  if (view === "day") return { start: selected, end: selected };
  if (view === "week") {
    const start = startOfWeek(selected);
    return { start, end: addDays(start, 6) };
  }
  const date = parseDateKey(selected);
  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start: dateKey(monthStart), end: dateKey(monthEnd) };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function nextOccurrence(current: string, kind: RecurrenceKind, interval = 1) {
  const date = parseDateKey(current);
  if (kind === "daily") date.setUTCDate(date.getUTCDate() + interval);
  if (kind === "weekly") date.setUTCDate(date.getUTCDate() + 7 * interval);
  if (kind === "monthly") {
    const day = date.getUTCDate();
    const targetMonth = date.getUTCMonth() + interval;
    const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    date.setUTCFullYear(targetYear, normalizedMonth, Math.min(day, daysInMonth(targetYear, normalizedMonth)));
  }
  if (kind === "yearly") {
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const year = date.getUTCFullYear() + interval;
    date.setUTCFullYear(year, month, Math.min(day, daysInMonth(year, month)));
  }
  return dateKey(date);
}

export function expandRecurrence(start: string, kind: RecurrenceKind, interval: number, rangeStart: string, rangeEnd: string, recurrenceEnd?: string | null) {
  if (kind === "none") return start >= rangeStart && start <= rangeEnd ? [start] : [];
  const result: string[] = [];
  let current = start;
  let guard = 0;
  while (current < rangeStart && guard++ < 5000) current = nextOccurrence(current, kind, interval);
  while (current <= rangeEnd && (!recurrenceEnd || current <= recurrenceEnd) && guard++ < 5000) {
    result.push(current);
    current = nextOccurrence(current, kind, interval);
  }
  return result;
}

export function localDateKey(timeZone = DEFAULT_TIMEZONE, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

export function zonedDateTimeToUtc(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(guess));
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    const represented = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"));
    guess += target - represented;
  }

  return new Date(guess).toISOString();
}
