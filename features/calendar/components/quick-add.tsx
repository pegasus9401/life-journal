"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveBirthday, saveEvent, saveTask, type CalendarActionState } from "../actions";
import { DEFAULT_TIMEZONE } from "../domain/date-utils";

const initial: CalendarActionState = { status: "idle", message: "" };
type Kind = "event" | "task" | "birthday";

export function QuickAdd({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("event");
  const [allDay, setAllDay] = useState(false);
  const [eventState, eventAction, eventPending] = useActionState(saveEvent, initial);
  const [taskState, taskAction, taskPending] = useActionState(saveTask, initial);
  const [birthdayState, birthdayAction, birthdayPending] = useActionState(saveBirthday, initial);
  const state = kind === "event" ? eventState : kind === "task" ? taskState : birthdayState;

  useEffect(() => {
    if (state.status === "success") { router.refresh(); const timer = setTimeout(() => setOpen(false), 450); return () => clearTimeout(timer); }
  }, [state, router]);

  return <>
    <button className="quick-add-trigger" type="button" onClick={() => setOpen(true)}><span>＋</span><span>Добави</span></button>
    {open ? <div className="quick-add-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="quick-add-sheet" role="dialog" aria-modal="true" aria-labelledby="quick-add-title">
        <header><div><p className="kicker">Бързо добавяне</p><h2 id="quick-add-title">Какво предстои?</h2></div><button type="button" aria-label="Затвори" onClick={() => setOpen(false)}>×</button></header>
        <div className="quick-add-tabs" role="tablist">
          {(["event","task","birthday"] as Kind[]).map((item) => <button key={item} type="button" role="tab" aria-selected={kind === item} onClick={() => setKind(item)}>{item === "event" ? "Събитие" : item === "task" ? "Задача" : "Рожден ден"}</button>)}
        </div>
        {kind === "event" ? <form action={eventAction} className="quick-form">
          <input type="hidden" name="timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE} />
          <label><span>Заглавие</span><input name="title" autoFocus required placeholder="Вечеря, среща, пътуване…" /></label>
          <div className="quick-form-row"><label><span>Начална дата</span><input name="date" type="date" defaultValue={defaultDate} required /></label><label><span>Крайна дата</span><input name="endDate" type="date" defaultValue={defaultDate} required /></label></div>
          <label className="inline-check"><input name="allDay" type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} /> Цял ден</label>
          {!allDay ? <div className="quick-form-row"><label><span>От</span><input name="startTime" type="time" defaultValue="09:00" required /></label><label><span>До</span><input name="endTime" type="time" defaultValue="10:00" required /></label></div> : null}
          <div className="quick-form-row"><label><span>Място</span><input name="location" placeholder="По желание" /></label><label><span>Повторение</span><select name="recurrenceKind" defaultValue="none"><option value="none">Не се повтаря</option><option value="daily">Всеки ден</option><option value="weekly">Всяка седмица</option><option value="monthly">Всеки месец</option><option value="yearly">Всяка година</option></select></label></div>
          <div className="quick-form-row"><label><span>Категория</span><input name="category" defaultValue="personal" /></label><label><span>Цвят</span><select name="color" defaultValue="violet"><option value="violet">Виолетов</option><option value="indigo">Индиго</option><option value="rose">Розов</option><option value="amber">Кехлибарен</option><option value="emerald">Зелен</option><option value="slate">Сив</option></select></label></div>
          <label><span>Описание</span><textarea name="description" rows={3} /></label><button className="primary-button" disabled={eventPending}>Запази събитието</button>
        </form> : null}
        {kind === "task" ? <form action={taskAction} className="quick-form">
          <input type="hidden" name="timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE} />
          <label><span>Задача</span><input name="title" autoFocus required placeholder="Какво трябва да направиш?" /></label>
          <div className="quick-form-row"><label><span>Дата</span><input name="dueDate" type="date" defaultValue={defaultDate} /></label><label><span>Час</span><input name="dueTime" type="time" /></label></div>
          <div className="quick-form-row"><label><span>Приоритет</span><select name="priority" defaultValue="normal"><option value="low">Нисък</option><option value="normal">Нормален</option><option value="high">Висок</option></select></label><label><span>Повторение</span><select name="recurrenceKind" defaultValue="none"><option value="none">Не се повтаря</option><option value="daily">Всеки ден</option><option value="weekly">Всяка седмица</option><option value="monthly">Всеки месец</option><option value="yearly">Всяка година</option></select></label></div>
          <label><span>Категория</span><input name="category" placeholder="По желание" /></label><label><span>Описание</span><textarea name="description" rows={3} /></label><button className="primary-button" disabled={taskPending}>Запази задачата</button>
        </form> : null}
        {kind === "birthday" ? <form action={birthdayAction} className="quick-form">
          <label><span>Име</span><input name="personName" autoFocus required placeholder="Име на човека" /></label><label><span>Дата на раждане</span><input name="birthDate" type="date" required /></label>
          <label className="inline-check"><input name="birthYearKnown" type="checkbox" /> Годината е точна</label><label><span>Бележки</span><textarea name="notes" rows={3} /></label><button className="primary-button" disabled={birthdayPending}>Запази рождения ден</button>
        </form> : null}
        <p className={`form-message ${state.status}`} aria-live="polite">{state.message}</p>
      </section>
    </div> : null}
  </>;
}
