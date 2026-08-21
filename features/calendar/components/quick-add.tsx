"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveBirthday, saveEvent, saveTask, type CalendarActionState } from "../actions";
import { DEFAULT_TIMEZONE } from "../domain/date-utils";

const initial: CalendarActionState = { status: "idle", message: "" };
type Kind = "event" | "task" | "meal" | "birthday" | "sticker";

const calendarStickers = [
  "🎂", "🎉", "❤️", "⭐", "😊", "🥳", "💪", "🏆",
  "✈️", "🏖️", "🚗", "🏠", "💼", "💰", "🛒", "🎁",
  "☕", "🍽️", "💧", "💊", "🌧️", "☀️", "🌙", "🐾",
];

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
  const [kind, setKind] = useState<Kind>("event");
  const [allDay, setAllDay] = useState(false);
  const [menu, setMenu] = useState("Меню 1");
  const [meal, setMeal] = useState("Закуска");
  const [variant, setVariant] = useState(0);
  const [sticker, setSticker] = useState("🎉");
  const [stickerDate, setStickerDate] = useState(defaultDate);
  const [eventState, eventAction, eventPending] = useActionState(saveEvent, initial);
  const [taskState, taskAction, taskPending] = useActionState(saveTask, initial);
  const [birthdayState, birthdayAction, birthdayPending] = useActionState(saveBirthday, initial);
  const state = kind === "task" ? taskState : kind === "birthday" ? birthdayState : eventState;
  const variants = mealOptions[menu]?.[meal] ?? [];

  useEffect(() => {
    if (state.status === "success") { router.refresh(); const timer = setTimeout(() => setOpen(false), 450); return () => clearTimeout(timer); }
  }, [state, router]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("gesture-close-overlay", close);
    return () => window.removeEventListener("gesture-close-overlay", close);
  }, [open]);

  const changeMenu = (value: string) => { setMenu(value); setMeal("Закуска"); setVariant(0); };
  const changeMeal = (value: string) => { setMeal(value); setVariant(0); };

  return <>
    <button className="quick-add-trigger" type="button" onClick={() => setOpen(true)}><span>＋</span><span>Добави</span></button>
    {open ? <div className="quick-add-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="quick-add-sheet" role="dialog" aria-modal="true" aria-labelledby="quick-add-title">
        <header><div><p className="kicker">Бързо добавяне</p><h2 id="quick-add-title">Какво предстои?</h2></div><button type="button" aria-label="Затвори" onClick={() => setOpen(false)}>×</button></header>
        <div className="quick-add-tabs" role="tablist">
          {(["event","task","meal","birthday","sticker"] as Kind[]).map((item) => <button key={item} type="button" role="tab" aria-selected={kind === item} onClick={() => setKind(item)}>{item === "event" ? "Събитие" : item === "task" ? "Задача" : item === "meal" ? "Хранене" : item === "birthday" ? "Рожден ден" : "Стикер"}</button>)}
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
        {kind === "meal" ? <form action={eventAction} className="quick-form">
          <input type="hidden" name="timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE} /><input type="hidden" name="title" value={`${meal} · ${menu} · Вариант ${variant + 1}`} /><input type="hidden" name="description" value={variants[variant] ?? ""} /><input type="hidden" name="endDate" value={defaultDate} /><input type="hidden" name="allDay" value="on" /><input type="hidden" name="category" value="meal" /><input type="hidden" name="color" value="violet" /><input type="hidden" name="recurrenceKind" value="none" />
          <label><span>Дата</span><input name="date" type="date" defaultValue={defaultDate} required /></label>
          <div className="quick-form-row"><label><span>Меню</span><select value={menu} onChange={(event) => changeMenu(event.target.value)}>{Object.keys(mealOptions).map((name) => <option key={name}>{name}</option>)}</select></label><label><span>Хранене</span><select value={meal} onChange={(event) => changeMeal(event.target.value)}>{Object.keys(mealOptions[menu]).map((name) => <option key={name}>{name}</option>)}</select></label></div>
          <label><span>Вариант</span><select value={variant} onChange={(event) => setVariant(Number(event.target.value))}>{variants.map((option, index) => <option key={option} value={index}>Вариант {index + 1} - {option}</option>)}</select></label>
          <div className="meal-calendar-preview"><span>Избрано</span><strong>{meal} · {menu} · Вариант {variant + 1}</strong><p>{variants[variant]}</p></div>
          <button className="primary-button" disabled={eventPending}>Добави храненето в календара</button>
        </form> : null}
        {kind === "birthday" ? <form action={birthdayAction} className="quick-form">
          <label><span>Име</span><input name="personName" autoFocus required placeholder="Име на човека" /></label><label><span>Дата на раждане</span><input name="birthDate" type="date" required /></label>
          <label className="inline-check"><input name="birthYearKnown" type="checkbox" /> Годината е точна</label><label><span>Бележки</span><textarea name="notes" rows={3} /></label><button className="primary-button" disabled={birthdayPending}>Запази рождения ден</button>
        </form> : null}
        {kind === "sticker" ? <form action={eventAction} className="quick-form sticker-form">
          <input type="hidden" name="timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE} />
          <input type="hidden" name="title" value={sticker} />
          <input type="hidden" name="description" value="Календарен стикер" />
          <input type="hidden" name="endDate" value={stickerDate} />
          <input type="hidden" name="allDay" value="on" />
          <input type="hidden" name="category" value="sticker" />
          <input type="hidden" name="color" value="violet" />
          <input type="hidden" name="recurrenceKind" value="none" />
          <label><span>Дата</span><input name="date" type="date" value={stickerDate} onChange={(event) => setStickerDate(event.target.value)} required /></label>
          <fieldset className="calendar-sticker-picker"><legend>Избери стикер</legend><div>{calendarStickers.map((item) => <button className={sticker === item ? "selected" : ""} key={item} type="button" aria-label={`Избери стикер ${item}`} aria-pressed={sticker === item} onClick={() => setSticker(item)}>{item}</button>)}</div></fieldset>
          <div className="calendar-sticker-preview" aria-live="polite"><span>{sticker}</span><small>Ще се покаже върху избрания ден</small></div>
          <button className="primary-button" disabled={eventPending}>Добави стикера</button>
        </form> : null}
        <p className={`form-message ${state.status}`} aria-live="polite">{state.message}</p>
      </section>
    </div> : null}
  </>;
}
