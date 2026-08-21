"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveBirthday, saveEvent, saveTask, type CalendarActionState } from "../actions";
import type { BirthdayRow, CalendarEventRow, TaskRow } from "../types";
import { DEFAULT_TIMEZONE } from "../domain/date-utils";
import { DeleteCalendarItem } from "./delete-calendar-item";
import { CalendarStickerPicker } from "./calendar-sticker-picker";
import { splitStickerDescription } from "../domain/stickers";

const initial: CalendarActionState = { status: "idle", message: "" };
type Source = CalendarEventRow | TaskRow | BirthdayRow;
function localParts(value: string | null, timeZone: string) { if (!value) return { date: "", time: "" }; const date = new Date(value); const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date); const get = (kind: string) => parts.find((part) => part.type === kind)?.value ?? ""; return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` }; }

export function EditCalendarForm({ type, source }: { type: "event" | "task" | "birthday"; source: Source }) {
  const action = type === "event" ? saveEvent : type === "task" ? saveTask : saveBirthday;
  const [state, formAction, pending] = useActionState(action, initial);
  const router = useRouter();
  const event = type === "event" ? source as CalendarEventRow : null;
  const task = type === "task" ? source as TaskRow : null;
  const birthday = type === "birthday" ? source as BirthdayRow : null;
  const eventDetails = splitStickerDescription(event?.description);
  const taskDetails = splitStickerDescription(task?.description);
  const [sticker, setSticker] = useState(eventDetails.sticker || taskDetails.sticker);
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const start = event ? localParts(event.starts_at, event.timezone) : null;
  const end = event ? localParts(event.ends_at, event.timezone) : null;
  useEffect(() => { if (state.status === "success") { router.refresh(); } }, [state.status, router]);

  return <form action={formAction} className="calendar-editor-form">
    <input type="hidden" name="id" value={source.id} />
    {event ? <><input type="hidden" name="timezone" value={event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE} /><label><span>Заглавие</span><input name="title" defaultValue={event.title} required /></label><div className="quick-form-row"><label><span>Начална дата</span><input name="date" type="date" defaultValue={event.start_date ?? start?.date} required /></label><label><span>Крайна дата</span><input name="endDate" type="date" defaultValue={event.end_date ?? end?.date} required /></label></div><label className="inline-check"><input name="allDay" type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> Цял ден</label>{!allDay ? <div className="quick-form-row"><label><span>От</span><input name="startTime" type="time" defaultValue={start?.time} required /></label><label><span>До</span><input name="endTime" type="time" defaultValue={end?.time} required /></label></div> : null}<div className="quick-form-row"><label><span>Място</span><input name="location" defaultValue={event.location ?? ""} /></label><label><span>Категория</span><input name="category" defaultValue={event.category} /></label></div><div className="quick-form-row"><label><span>Цвят</span><select name="color" defaultValue={event.color}><option value="violet">Виолетов</option><option value="indigo">Индиго</option><option value="rose">Розов</option><option value="amber">Кехлибарен</option><option value="emerald">Зелен</option><option value="slate">Сив</option></select></label><Recurrence kind={event.recurrence_kind} end={event.recurrence_end} /></div><CalendarStickerPicker value={sticker} onChange={setSticker} /><label><span>Описание</span><textarea name="description" rows={5} defaultValue={eventDetails.description} /></label></> : null}
    {task ? <><input type="hidden" name="timezone" value={task.timezone} /><label><span>Задача</span><input name="title" defaultValue={task.title} required /></label><div className="quick-form-row"><label><span>Дата</span><input name="dueDate" type="date" defaultValue={task.due_date ?? ""} /></label><label><span>Час</span><input name="dueTime" type="time" defaultValue={task.due_time?.slice(0,5) ?? ""} /></label></div><div className="quick-form-row"><label><span>Приоритет</span><select name="priority" defaultValue={task.priority}><option value="low">Нисък</option><option value="normal">Нормален</option><option value="high">Висок</option></select></label><Recurrence kind={task.recurrence_kind} end={task.recurrence_end} /></div><label><span>Категория</span><input name="category" defaultValue={task.category ?? ""} /></label><CalendarStickerPicker value={sticker} onChange={setSticker} /><label><span>Описание</span><textarea name="description" rows={5} defaultValue={taskDetails.description} /></label></> : null}
    {birthday ? <><label><span>Име</span><input name="personName" defaultValue={birthday.person_name} required /></label><label><span>Дата на раждане</span><input name="birthDate" type="date" defaultValue={birthday.birth_date} required /></label><label className="inline-check"><input name="birthYearKnown" type="checkbox" defaultChecked={birthday.birth_year_known} /> Годината е точна</label><label><span>Бележки</span><textarea name="notes" rows={5} defaultValue={birthday.notes ?? ""} /></label></> : null}
    <p className={`form-message ${state.status}`}>{state.message}</p><div className="calendar-editor-actions"><DeleteCalendarItem type={type} id={source.id} /><button className="primary-button" disabled={pending}>{pending ? "Запазване…" : "Запази промените"}</button></div>
  </form>;
}

function Recurrence({ kind, end }: { kind: string; end: string | null }) { return <label><span>Повторение</span><select name="recurrenceKind" defaultValue={kind}><option value="none">Не се повтаря</option><option value="daily">Всеки ден</option><option value="weekly">Всяка седмица</option><option value="monthly">Всеки месец</option><option value="yearly">Всяка година</option></select><input name="recurrenceEnd" type="date" defaultValue={end ?? ""} aria-label="Край на повторението" /></label>; }
