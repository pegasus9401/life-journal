"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { birthdaySchema, eventSchema, taskSchema } from "./schema";
import { zonedDateTimeToUtc } from "./domain/date-utils";
import { withStickerDescription } from "./domain/stickers";

export type CalendarActionState = { status: "idle" | "success" | "error"; message: string };
const ok = (message: string): CalendarActionState => ({ status: "success", message });
const fail = (message: string): CalendarActionState => ({ status: "error", message });
const refresh = () => { revalidatePath("/today"); revalidatePath("/calendar"); };

async function userClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveEvent(_state: CalendarActionState, formData: FormData): Promise<CalendarActionState> {
  const sticker = formData.get("sticker")?.toString() || "";
  const parsed = eventSchema.safeParse({ id: formData.get("id") || undefined, title: formData.get("title"), description: formData.get("description"), date: formData.get("date"), endDate: formData.get("endDate"), allDay: formData.get("allDay") === "on", startTime: formData.get("startTime") || undefined, endTime: formData.get("endTime") || undefined, timezone: formData.get("timezone"), location: formData.get("location"), category: formData.get("category"), color: formData.get("color"), recurrenceKind: formData.get("recurrenceKind"), recurrenceEnd: formData.get("recurrenceEnd") || undefined });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Провери събитието.");
  const { supabase, user } = await userClient(); if (!user) return fail("Сесията изтече.");
  const value = parsed.data;
  const data = { owner_id: user.id, title: value.title, description: withStickerDescription(value.description, sticker), all_day: value.allDay, timezone: value.timezone, location: value.location, category: value.category, color: value.color, recurrence_kind: value.recurrenceKind, recurrence_interval: 1, recurrence_end: value.recurrenceEnd, start_date: value.allDay ? value.date : null, end_date: value.allDay ? value.endDate : null, starts_at: value.allDay ? null : zonedDateTimeToUtc(value.date, value.startTime!, value.timezone), ends_at: value.allDay ? null : zonedDateTimeToUtc(value.endDate, value.endTime!, value.timezone) };
  const query = value.id ? supabase.from("calendar_events").update(data).eq("id", value.id) : supabase.from("calendar_events").insert(data);
  const { error } = await query; if (error) return fail("Събитието не можа да бъде запазено."); refresh(); return ok("Събитието е запазено.");
}

export async function saveTask(_state: CalendarActionState, formData: FormData): Promise<CalendarActionState> {
  const sticker = formData.get("sticker")?.toString() || "";
  const parsed = taskSchema.safeParse({ id: formData.get("id") || undefined, title: formData.get("title"), description: formData.get("description"), dueDate: formData.get("dueDate"), dueTime: formData.get("dueTime"), timezone: formData.get("timezone"), priority: formData.get("priority"), category: formData.get("category"), recurrenceKind: formData.get("recurrenceKind"), recurrenceEnd: formData.get("recurrenceEnd") || undefined });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Провери задачата.");
  const { supabase, user } = await userClient(); if (!user) return fail("Сесията изтече."); const value = parsed.data;
  const data = { owner_id: user.id, title: value.title, description: withStickerDescription(value.description, sticker), due_date: value.dueDate, due_time: value.dueTime, timezone: value.timezone, priority: value.priority, category: value.category, recurrence_kind: value.recurrenceKind, recurrence_interval: 1, recurrence_end: value.recurrenceEnd };
  const query = value.id ? supabase.from("tasks").update(data).eq("id", value.id) : supabase.from("tasks").insert(data);
  const { error } = await query; if (error) return fail("Задачата не можа да бъде запазена."); refresh(); return ok("Задачата е запазена.");
}

export async function saveBirthday(_state: CalendarActionState, formData: FormData): Promise<CalendarActionState> {
  const parsed = birthdaySchema.safeParse({ id: formData.get("id") || undefined, personName: formData.get("personName"), birthDate: formData.get("birthDate"), birthYearKnown: formData.get("birthYearKnown") === "on", notes: formData.get("notes") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Провери рождения ден.");
  const { supabase, user } = await userClient(); if (!user) return fail("Сесията изтече."); const value = parsed.data;
  const data = { owner_id: user.id, person_name: value.personName, birth_date: value.birthDate, birth_year_known: value.birthYearKnown, notes: value.notes };
  const query = value.id ? supabase.from("birthdays").update(data).eq("id", value.id) : supabase.from("birthdays").insert(data);
  const { error } = await query; if (error) return fail("Рожденият ден не можа да бъде запазен."); refresh(); return ok("Рожденият ден е запазен.");
}

export async function toggleTask(id: string, completed: boolean) {
  const { supabase, user } = await userClient(); if (!user) return { ok: false };
  const { error } = await supabase.from("tasks").update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq("id", id).eq("owner_id", user.id);
  refresh(); return { ok: !error };
}

export async function rescheduleWorkout(formData: FormData) {
  const id = String(formData.get("id") ?? ""); const workoutDate = String(formData.get("workoutDate") ?? ""); const time = String(formData.get("time") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(workoutDate) || (time && !/^\d{2}:\d{2}$/.test(time))) return;
  const { supabase, user } = await userClient(); if (!user) return;
  await supabase.from("workout_sessions").update({ workout_date: workoutDate, scheduled_at: time ? zonedDateTimeToUtc(workoutDate, time, "Europe/Sofia") : null, status: "planned", completed: false, completed_at: null, skipped_at: null }).eq("id", id).eq("owner_id", user.id);
  refresh(); revalidatePath("/workouts");
}

export async function deleteCalendarSource(type: "event" | "task" | "birthday", id: string) {
  const { supabase, user } = await userClient(); if (!user) return { ok: false };
  const table = type === "event" ? "calendar_events" : type === "task" ? "tasks" : "birthdays";
  const { error } = await supabase.from(table).delete().eq("id", id).eq("owner_id", user.id);
  refresh(); return { ok: !error };
}
