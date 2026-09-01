"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveBirthday, saveEvent, saveTask, type CalendarActionState } from "../actions";
import { DEFAULT_TIMEZONE } from "../domain/date-utils";
import { CalendarStickerPicker } from "./calendar-sticker-picker";

const initial: CalendarActionState = { status: "idle", message: "" };
const addDateFormatter = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", timeZone: "UTC" });
function addDateLabel(value: string) { return addDateFormatter.format(new Date(`${value}T12:00:00Z`)); }
type Kind = "event" | "task" | "meal" | "birthday";

const mealOptions: Record<string, Record<string, string[]>> = {
  "Меню 1": {
    "Закуска": ["High Protein Pudding Milbona + банан", "Протеин + банан + прясно мляко", "Skyr + ябълка + фъстъчено масло"],
    "След тренировка": ["Пилешка пържола + салата + протеинов хляб", "Пъстърва + салата + картофи", "Яйца + белтъци + пуешко филе + протеинов хляб", "Свинско контра филе + салата + картофи", "Моцарела light + домат + пуешко филе + протеинов хляб + песто"],
    "Следобедна закуска": ["Протеин + кисело мляко + ябълка + овес", "Цезар салата с пилешко", "Skyr + Corny Big + ябълка + бадеми"],
    "Вечеря": ["Свински врат + салата", "Яйца + белтъци + сирене + пуешко филе + салата", "Пилешка пържола + салата + Caesar сос", "Свинско контра филе + салата + бадеми", "Сьомга + салата + зехтин"],
    "Преди лягане": ["High Protein Quark-Creme"]
  },
  "Меню 2": {
    "Закуска": ["Протеинов хляб + пуешко филе + кашкавал + домат", "High Protein Quark-Creme + бадеми + ябълка", "Протеин + мляко + фъстъчено масло + ябълка"],
    "След тренировка": ["Лаваш + Goldessa + пилешка пържола + салата", "Ориз + пилешка пържола + зеленчуци + кашкавал", "Макарони Carbonara + кашкавал + пилешко", "Яйца + белтъци + пуешко + кашкавал + хляб + картофи", "Пъстърва + картофи + зехтин + салата"],
    "Следобедна закуска": ["Ябълка + High Protein Quark-Creme + бадеми", "LZ шоколад + извара Pilos", "Протеин + мляко + фъстъчено масло + ябълка"],
    "Вечеря": ["Пилешка пържола + салата", "Яйца + белтъци + пуешко + сирене + салата", "Свинско контра филе + салата", "Моцарела light + домат + пуешко + ябълка", "Пъстърва + салата"],
    "Преди лягане": ["High Protein Quark-Creme"]
  },
  "Меню 3": {
    "Закуска": ["High Protein Quark-Creme + бадеми + ябълка", "Протеин + мляко + фъстъчено масло + банан"],
    "След тренировка": ["Бургер питка + пилешки гърди + Goldessa + домат", "Ориз + пилешка пържола + зеленчуци + кашкавал", "Пилешки гърди + картофи + зехтин + салата", "Яйца + белтъци + сирене + пуешко + хляб + салата", "Пъстърва + картофи + зехтин + салата"],
    "Следобедна закуска": ["Skyr + бадеми + ябълка", "Шейк с мляко + протеин + банан + фъстъчено масло"],
    "Вечеря": ["Яйца + белтъци + пуешко + кашкавал + салата", "Свинско контра филе + салата + зехтин", "Пилешка пържола + салата + зехтин", "Пъстърва + салата + зехтин", "Моцарела light + домат + пуешко + песто"],
    "Преди лягане": ["High Protein Quark-Creme"]
  }
};

export function QuickAdd({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chooser, setChooser] = useState(true);
  const [targetDate, setTargetDate] = useState(defaultDate);
  const [eventCategory, setEventCategory] = useState("personal");
  const [kind, setKind] = useState<Kind>("event");
  const [allDay, setAllDay] = useState(false);
  const [menu, setMenu] = useState("Меню 1");
  const [meal, setMeal] = useState("Закуска");
  const [variant, setVariant] = useState(0);
  const [sticker, setSticker] = useState("🎉");
  const [eventState, eventAction, eventPending] = useActionState(saveEvent, initial);
  const [taskState, taskAction, taskPending] = useActionState(saveTask, initial);
  const [birthdayState, birthdayAction, birthdayPending] = useActionState(saveBirthday, initial);
  const state = kind === "task" ? taskState : kind === "birthday" ? birthdayState : eventState;
  const variants = mealOptions[menu]?.[meal] ?? [];

  useEffect(() => {
    if (state.status === "success") { router.refresh(); const timer = setTimeout(() => setOpen(false), 450); return () => clearTimeout(timer); }
  }, [state, router]);

  useEffect(() => {
    const selectDate = (event: Event) => { const date = (event as CustomEvent<string>).detail; if (date) setTargetDate(date); };
    window.addEventListener("calendar-active-date", selectDate);
    return () => window.removeEventListener("calendar-active-date", selectDate);
  }, []);

  useEffect(() => {
    const openFromDock = (event: Event) => { event.preventDefault(); setChooser(true); setOpen(true); };
    window.addEventListener("open-quick-capture", openFromDock, true);
    return () => window.removeEventListener("open-quick-capture", openFromDock, true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("gesture-close-overlay", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("gesture-close-overlay", close); window.removeEventListener("keydown", closeOnEscape); };
  }, [open]);

  const changeMenu = (value: string) => { setMenu(value); setMeal("Закуска"); setVariant(0); };
  const changeMeal = (value: string) => { setMeal(value); setVariant(0); };

  return <>
    <button className="quick-add-trigger" type="button" onClick={() => { setChooser(true); setOpen(true); }}><span>＋</span><span>Добави</span></button>
    {open ? <div className="quick-add-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="quick-add-sheet" role="dialog" aria-modal="true" aria-labelledby="quick-add-title">
        <header><div>{chooser ? null : <button className="quick-add-back" type="button" aria-label="Назад" onClick={() => setChooser(true)}>‹</button>}<h2 id="quick-add-title">{chooser ? `Добави към ${addDateLabel(targetDate)}` : "Какво предстои?"}</h2></div><button type="button" aria-label="Затвори" onClick={() => setOpen(false)}>×</button></header><div className="quick-add-drag-handle" aria-hidden="true"><span /></div>
        {chooser ? <div className="quick-add-launcher">
          <button type="button" onClick={() => { setOpen(false); router.push(`/nutrition?date=${targetDate}&add=meal`); }}><span>🍴</span><b>Храна</b></button>
          <button type="button" onClick={() => { setOpen(false); router.push("/workouts"); }}><span>🏋️</span><b>Тренировка</b></button>
          <button type="button" onClick={() => { setEventCategory("cardio"); setKind("event"); setChooser(false); }}><span>🏃</span><b>Кардио</b></button>
          <button type="button" onClick={() => { setKind("task"); setChooser(false); }}><span>✓</span><b>Задача</b></button>
          <button type="button" onClick={() => { setEventCategory("personal"); setKind("event"); setChooser(false); }}><span>▣</span><b>Събитие</b></button>
          <button type="button" onClick={() => { setOpen(false); router.push("/journal/new"); }}><span>□</span><b>Дневник</b></button>
          <button type="button" onClick={() => { setOpen(false); router.push("/profile"); }}><span>↕</span><b>Тегло</b></button>
          <button type="button" onClick={() => { setOpen(false); router.push("/journal/new"); }}><span>▧</span><b>Снимка</b></button>
        </div> : null}
        <div className={`quick-add-tabs ${chooser ? "is-hidden" : ""}`} role="tablist">
          {(["event","task","meal","birthday"] as Kind[]).map((item) => <button key={item} type="button" role="tab" aria-selected={kind === item} onClick={() => setKind(item)}>{item === "event" ? "Събитие" : item === "task" ? "Задача" : item === "meal" ? "Хранене" : "Рожден ден"}</button>)}
        </div>
        {!chooser && kind === "event" ? <form action={eventAction} className="quick-form">
          <input type="hidden" name="timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE} />
          <label><span>Заглавие</span><input name="title" autoFocus required placeholder="Вечеря, среща, пътуване…" /></label>
          <div className="quick-form-row"><label><span>Начална дата</span><input name="date" type="date" defaultValue={targetDate} required /></label><label><span>Крайна дата</span><input name="endDate" type="date" defaultValue={targetDate} required /></label></div>
          <label className="inline-check"><input name="allDay" type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} /> Цял ден</label>
          {!allDay ? <div className="quick-form-row"><label><span>От</span><input name="startTime" type="time" defaultValue="09:00" required /></label><label><span>До</span><input name="endTime" type="time" defaultValue="10:00" required /></label></div> : null}
          <div className="quick-form-row"><label><span>Място</span><input name="location" placeholder="По желание" /></label><label><span>Повторение</span><select name="recurrenceKind" defaultValue="none"><option value="none">Не се повтаря</option><option value="daily">Всеки ден</option><option value="weekly">Всяка седмица</option><option value="monthly">Всеки месец</option><option value="yearly">Всяка година</option></select></label></div>
          <div className="quick-form-row"><label><span>Категория</span><input name="category" value={eventCategory} onChange={(event) => setEventCategory(event.target.value)} /></label><label><span>Цвят</span><select name="color" defaultValue="violet"><option value="violet">Виолетов</option><option value="indigo">Индиго</option><option value="rose">Розов</option><option value="amber">Кехлибарен</option><option value="emerald">Зелен</option><option value="slate">Сив</option></select></label></div>
          <label><span>Описание</span><textarea name="description" rows={3} /></label><CalendarStickerPicker value={sticker} onChange={setSticker} /><button className="primary-button" disabled={eventPending}>Запази събитието</button>
        </form> : null}
        {!chooser && kind === "task" ? <form action={taskAction} className="quick-form">
          <input type="hidden" name="timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE} />
          <label><span>Задача</span><input name="title" autoFocus required placeholder="Какво трябва да направиш?" /></label>
          <div className="quick-form-row"><label><span>Дата</span><input name="dueDate" type="date" defaultValue={targetDate} /></label><label><span>Час</span><input name="dueTime" type="time" /></label></div>
          <div className="quick-form-row"><label><span>Приоритет</span><select name="priority" defaultValue="normal"><option value="low">Нисък</option><option value="normal">Нормален</option><option value="high">Висок</option></select></label><label><span>Повторение</span><select name="recurrenceKind" defaultValue="none"><option value="none">Не се повтаря</option><option value="daily">Всеки ден</option><option value="weekly">Всяка седмица</option><option value="monthly">Всеки месец</option><option value="yearly">Всяка година</option></select></label></div>
          <label><span>Категория</span><input name="category" placeholder="По желание" /></label><label><span>Описание</span><textarea name="description" rows={3} /></label><CalendarStickerPicker value={sticker} onChange={setSticker} /><button className="primary-button" disabled={taskPending}>Запази задачата</button>
        </form> : null}
        {!chooser && kind === "meal" ? <form action={eventAction} className="quick-form">
          <input type="hidden" name="timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE} /><input type="hidden" name="title" value={`${meal} · ${menu} · Вариант ${variant + 1}`} /><input type="hidden" name="description" value={variants[variant] ?? ""} /><input type="hidden" name="endDate" value={targetDate} /><input type="hidden" name="allDay" value="on" /><input type="hidden" name="category" value="meal" /><input type="hidden" name="color" value="violet" /><input type="hidden" name="recurrenceKind" value="none" />
          <label><span>Дата</span><input name="date" type="date" defaultValue={targetDate} required /></label>
          <div className="quick-form-row"><label><span>Меню</span><select value={menu} onChange={(event) => changeMenu(event.target.value)}>{Object.keys(mealOptions).map((name) => <option key={name}>{name}</option>)}</select></label><label><span>Хранене</span><select value={meal} onChange={(event) => changeMeal(event.target.value)}>{Object.keys(mealOptions[menu]).map((name) => <option key={name}>{name}</option>)}</select></label></div>
          <label><span>Вариант</span><select value={variant} onChange={(event) => setVariant(Number(event.target.value))}>{variants.map((option, index) => <option key={option} value={index}>Вариант {index + 1} - {option}</option>)}</select></label>
          <div className="meal-calendar-preview"><span>Избрано</span><strong>{meal} · {menu} · Вариант {variant + 1}</strong><p>{variants[variant]}</p></div>
          <button className="primary-button" disabled={eventPending}>Добави храненето в календара</button>
        </form> : null}
        {!chooser && kind === "birthday" ? <form action={birthdayAction} className="quick-form">
          <label><span>Име</span><input name="personName" autoFocus required placeholder="Име на човека" /></label><label><span>Дата на раждане</span><input name="birthDate" type="date" required /></label>
          <label className="inline-check"><input name="birthYearKnown" type="checkbox" /> Годината е точна</label><label><span>Бележки</span><textarea name="notes" rows={3} /></label><button className="primary-button" disabled={birthdayPending}>Запази рождения ден</button>
        </form> : null}
        <p className={`form-message ${state.status}`} aria-live="polite">{state.message}</p>
      </section>
    </div> : null}
  </>;
}

