import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { aggregateCalendarItems } from "./domain/aggregation";
import type { BirthdayRow, CalendarEventRow, TaskRow } from "./types";

export const getCalendarData = cache(async (rangeStart: string, rangeEnd: string) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const rangeStartIso = `${rangeStart}T00:00:00.000Z`;
  const rangeEndIso = `${rangeEnd}T23:59:59.999Z`;
  const [oneTimeEvents, recurringEvents, datedTasks, recurringTasks, birthdays] = await Promise.all([
    supabase.from("calendar_events").select("*").eq("recurrence_kind", "none").or(`and(all_day.eq.true,start_date.lte.${rangeEnd},end_date.gte.${rangeStart}),and(all_day.eq.false,starts_at.lte.${rangeEndIso},ends_at.gte.${rangeStartIso})`),
    supabase.from("calendar_events").select("*").neq("recurrence_kind", "none").or(`start_date.lte.${rangeEnd},starts_at.lte.${rangeEndIso}`).or(`recurrence_end.is.null,recurrence_end.gte.${rangeStart}`),
    supabase.from("tasks").select("*").eq("recurrence_kind", "none").gte("due_date", rangeStart).lte("due_date", rangeEnd),
    supabase.from("tasks").select("*").neq("recurrence_kind", "none").lte("due_date", rangeEnd).or(`recurrence_end.is.null,recurrence_end.gte.${rangeStart}`),
    supabase.from("birthdays").select("*"),
  ]);
  const error = [oneTimeEvents.error, recurringEvents.error, datedTasks.error, recurringTasks.error, birthdays.error].find(Boolean);
  if (error) throw new Error(`Календарът не можа да се зареди: ${error.message}`);
  const events = [...(oneTimeEvents.data ?? []), ...(recurringEvents.data ?? [])] as CalendarEventRow[];
  const tasks = [...(datedTasks.data ?? []), ...(recurringTasks.data ?? [])] as TaskRow[];
  return {
    items: aggregateCalendarItems(events, tasks, (birthdays.data ?? []) as BirthdayRow[], rangeStart, rangeEnd),
    events, tasks, birthdays: (birthdays.data ?? []) as BirthdayRow[],
  };
});

export async function getUpcoming(from: string, days = 8) {
  const end = new Date(`${from}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + days);
  return getCalendarData(from, end.toISOString().slice(0, 10));
}

export async function getCalendarSource(type: "event" | "task" | "birthday", id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const table = type === "event" ? "calendar_events" : type === "task" ? "tasks" : "birthdays";
  const { data } = await supabase.from(table).select("*").eq("id", id).eq("owner_id", user.id).maybeSingle();
  return data;
}
