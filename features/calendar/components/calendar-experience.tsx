"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DayMealPlanner } from "@/features/nutrition/components/day-meal-planner";
import type { WorkoutCalendarTemplate, WorkoutDayKey } from "@/features/workouts/workout-library";
import { addDays, dateKey, parseDateKey, startOfWeek } from "../domain/date-utils";
import type { CalendarItem, CalendarView } from "../types";
import { CalendarItem as ItemCard } from "./calendar-item";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const fullDate = new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const dayNumber = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "short", timeZone: "UTC" });

export type CalendarMealPlan = { plan_date: string; menu_name: string; selections?: Record<string, number> };
function href(view: CalendarView, date: string) { return `/calendar?view=${view}&date=${date}`; }
function itemsOn(items: CalendarItem[], date: string) { return items.filter((item) => item.date <= date && (item.endDate ?? item.date) >= date); }
function mealOn(plans: CalendarMealPlan[], date: string) { return plans.find(plan => plan.plan_date === date); }
function menuShort(name: string) { const match = name.match(/(\d+)/); return match ? `M${match[1]}` : name; }
function MealBadge({ plan }: { plan?: CalendarMealPlan }) { return plan ? <span className="calendar-meal-badge"><span>🍽</span><b>{menuShort(plan.menu_name)}</b></span> : <span className="calendar-meal-add">+ меню</span>; }

const workoutDayKeys: WorkoutDayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function workoutsOn(plans: WorkoutCalendarTemplate[], date: string) {
  const weekday = workoutDayKeys[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return plans.filter((plan) => plan.days.includes(weekday) && (!plan.startDate || date >= plan.startDate) && (!plan.endDate || date <= plan.endDate));
}
function WorkoutBadges({ plans, date, compact = false }: { plans: WorkoutCalendarTemplate[]; date: string; compact?: boolean }) {
  const workouts = workoutsOn(plans, date);
  if (!workouts.length) return null;
  return <div className={`calendar-workout-list ${compact ? "is-compact" : ""}`}>{workouts.map((workout) => <Link className="calendar-workout-badge" href="/workouts" key={workout.id} title={workout.name}><span>◆</span><b>{workout.name}</b>{compact ? null : <small>{workout.durationMinutes ? `${workout.durationMinutes} мин` : `${workout.exerciseCount} упражнения`}</small>}</Link>)}</div>;
}

export function CalendarExperience({ view, selected, today, items, mealPlans = [], workoutPlans = [] }: { view: CalendarView; selected: string; today: string; items: CalendarItem[]; mealPlans?: CalendarMealPlan[]; workoutPlans?: WorkoutCalendarTemplate[] }) {
  const [mealDate, setMealDate] = useState<string | null>(null);
  const selectedDate = parseDateKey(selected);
  const title = view === "month" ? monthName.format(selectedDate) : view === "week" ? `${dayNumber.format(parseDateKey(startOfWeek(selected)))} - ${dayNumber.format(parseDateKey(addDays(startOfWeek(selected), 6)))}` : fullDate.format(selectedDate);
  const previous = view === "month" ? dateKey(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() - 1, 1))) : addDays(selected, view === "week" ? -7 : -1);
  const next = view === "month" ? dateKey(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1, 1))) : addDays(selected, view === "week" ? 7 : 1);
  const activePlan = mealDate ? mealOn(mealPlans, mealDate) : undefined;

  useEffect(() => {
    if (!mealDate) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMealDate(null); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [mealDate]);

  useEffect(() => {
    if (!mealDate) return;
    const close = () => setMealDate(null);
    window.addEventListener("gesture-close-overlay", close);
    return () => window.removeEventListener("gesture-close-overlay", close);
  }, [mealDate]);

  return <>
    <header className="calendar-header"><div><p className="life-kicker">Твоето време</p><h1>{title}</h1></div><div className="calendar-controls"><div className="view-switcher">{(["month", "week", "day"] as CalendarView[]).map(value => <Link key={value} className={view === value ? "active" : ""} href={href(value, selected)}>{value === "month" ? "Месец" : value === "week" ? "Седмица" : "Ден"}</Link>)}</div><div className="date-navigation"><Link aria-label="Назад" href={href(view, previous)}>←</Link><Link href={href(view, today)}>Днес</Link><Link aria-label="Напред" href={href(view, next)}>→</Link></div></div></header>
    {view === "month" ? <MonthView selected={selected} today={today} items={items} mealPlans={mealPlans} workoutPlans={workoutPlans} openMeal={setMealDate} /> : null}
    {view === "week" ? <WeekView selected={selected} today={today} items={items} mealPlans={mealPlans} workoutPlans={workoutPlans} openMeal={setMealDate} /> : null}
    {view === "day" ? <DayView selected={selected} items={items} mealPlans={mealPlans} workoutPlans={workoutPlans} openMeal={setMealDate} /> : null}
    {mealDate ? <div className="meal-plan-modal-backdrop" role="presentation" onMouseDown={() => setMealDate(null)}>
      <section className="meal-plan-modal" role="dialog" aria-modal="true" aria-label={`Хранене за ${mealDate}`} onMouseDown={event => event.stopPropagation()}>
        <button className="meal-plan-modal-close" type="button" aria-label="Затвори" onClick={() => setMealDate(null)}>×</button>
        <DayMealPlanner key={mealDate} date={mealDate} initialMenu={activePlan?.menu_name || "Меню 1"} initialSelections={activePlan?.selections || {}} initialHasPlan={Boolean(activePlan)} />
      </section>
    </div> : null}
  </>;
}

function MonthView({ selected, today, items, mealPlans, workoutPlans, openMeal }: { selected: string; today: string; items: CalendarItem[]; mealPlans: CalendarMealPlan[]; workoutPlans: WorkoutCalendarTemplate[]; openMeal: (date: string) => void }) {
  const date = parseDateKey(selected); const first = dateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))); const gridStart = startOfWeek(first); const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const [activeDay, setActiveDay] = useState(days.includes(selected) ? selected : today);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaDragY, setAgendaDragY] = useState(0);
  const agendaListRef = useRef<HTMLDivElement | null>(null);
  const agendaTouch = useRef<{ x: number; y: number; canCollapse: boolean } | null>(null);
  const activeItems = itemsOn(items, activeDay);
  const activeMeal = mealOn(mealPlans, activeDay);
  const activeWorkouts = workoutsOn(workoutPlans, activeDay);
  const agendaTransform = `translateY(${Math.max(0, agendaDragY)}px)`;
  const beginAgendaGesture = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    agendaTouch.current = { x: touch.clientX, y: touch.clientY, canCollapse: (agendaListRef.current?.scrollTop ?? 0) <= 0 };
    setAgendaDragY(0);
  };
  const moveAgendaGesture = (event: React.TouchEvent<HTMLElement>) => {
    const start = agendaTouch.current;
    const touch = event.touches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) >= Math.abs(dy) || Math.abs(dy) < 8) return;
    if (start.canCollapse && dy > 0) setAgendaDragY(Math.min(dy, 420));
  };
  const finishAgendaGesture = (event: React.TouchEvent<HTMLElement>) => {
    const start = agendaTouch.current;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx) * 1.25 && Math.abs(dy) >= 54) {
      if (start.canCollapse && dy > 0) setAgendaOpen(false);
    }
    agendaTouch.current = null;
    setAgendaDragY(0);
  };

  return <section className="adaptive-month is-expanded" aria-label="Месечен календар">
    <div className="month-calendar">
      <div className="month-weekdays">{weekDays.map(day => <span key={day}>{day}</span>)}</div>
      <div className="month-grid">{days.map(day => {
        const dayItems = itemsOn(items, day); const stickerItem = dayItems.find(item => item.sticker); const visibleDayItems = dayItems.filter(item => item.category !== "sticker"); const plan = mealOn(mealPlans, day); const workouts = workoutsOn(workoutPlans, day); const outside = day.slice(0, 7) !== selected.slice(0, 7);
        const markers = [...visibleDayItems.map(item => item.color), ...(plan ? ["green"] : []), ...workouts.map(() => "violet")].slice(0, 4);
        return <article key={day} className={`month-day ${day === today ? "today" : ""} ${day === activeDay && agendaOpen ? "selected" : ""} ${outside ? "outside" : ""}`}>
          <button type="button" className="month-day-click" onClick={() => { if (day === activeDay && agendaOpen) { setAgendaOpen(false); return; } setActiveDay(day); setAgendaOpen(true); }} aria-label={day === activeDay && agendaOpen ? `Затвори програмата за ${day}` : `Отвори програмата за ${day}`} aria-pressed={day === activeDay && agendaOpen}><span className="month-day-number">{Number(day.slice(8))}</span><span className="month-markers" aria-hidden="true">{markers.map((color, index) => <i className={`color-${color}`} key={`${color}-${index}`} />)}</span></button>
          <div className="month-expanded-content"><button type="button" className="month-meal-action" onClick={() => { setActiveDay(day); openMeal(day); }} aria-label={plan ? `Промени или премахни менюто за ${day}` : `Добави меню за ${day}`} aria-haspopup="dialog"><MealBadge plan={plan} /></button><div className="month-stickers">{stickerItem ? <Link href={`/calendar/edit/${stickerItem.type === "task" ? "task" : "event"}/${stickerItem.sourceId}`} aria-label={`Редактирай ${stickerItem.title}`}>{stickerItem.sticker}</Link> : null}</div><WorkoutBadges plans={workoutPlans} date={day} compact /><div>{visibleDayItems.slice(0, 3).map(item => <ItemCard key={item.id} item={item} compact />)}{visibleDayItems.length > 3 ? <span className="more-items">+ още {visibleDayItems.length - 3}</span> : null}</div></div>
        </article>;
      })}</div>
    </div>
    {agendaOpen ? <section className={`calendar-agenda-sheet is-expanded ${agendaDragY ? "is-dragging" : ""}`} role="dialog" aria-modal="false" aria-label={`Програма за ${activeDay}`} style={{ transform: agendaTransform }} onTouchStart={beginAgendaGesture} onTouchMove={moveAgendaGesture} onTouchEnd={finishAgendaGesture} onTouchCancel={() => { agendaTouch.current = null; setAgendaDragY(0); }}>
      <button className="calendar-agenda-handle" type="button" aria-label="Затвори програмата" onClick={() => setAgendaOpen(false)}><span /></button>
      <header><h2>{fullDate.format(parseDateKey(activeDay))}</h2></header>
      <div className="calendar-agenda-list" ref={agendaListRef}>
        <button className="calendar-agenda-card color-green" type="button" onClick={() => openMeal(activeDay)}>
          <span className="calendar-agenda-time">🍽</span><span><b>{activeMeal ? activeMeal.menu_name : "Add nutrition"}</b><small>{activeMeal ? "View or change the meal plan" : "Choose a menu for this day"}</small><i>Nutrition</i></span>
        </button>
        {activeWorkouts.map(workout => <Link className="calendar-agenda-card color-violet" href="/workouts" key={workout.id}><span className="calendar-agenda-time">◆</span><span><b>{workout.name}</b><small>{workout.durationMinutes ? `${workout.durationMinutes} minutes` : `${workout.exerciseCount} exercises`}</small><i>Workout</i></span></Link>)}
        {activeItems.map(item => <div className={`calendar-agenda-event color-${item.color}`} key={item.id}><span className="calendar-agenda-time"><b>{item.time || (item.allDay ? "All day" : "—")}</b>{item.endTime ? <small>{item.endTime}</small> : null}</span><ItemCard item={item} /></div>)}
        {!activeMeal && !activeWorkouts.length && !activeItems.length ? <div className="calendar-agenda-empty"><b>No plans yet</b><span>Add an event, task, workout or meal for this day.</span></div> : null}
      </div>
    </section> : null}
  </section>;
}

function WeekView({ selected, today, items, mealPlans, workoutPlans, openMeal }: { selected: string; today: string; items: CalendarItem[]; mealPlans: CalendarMealPlan[]; workoutPlans: WorkoutCalendarTemplate[]; openMeal: (date: string) => void }) {
  const start = startOfWeek(selected);
  return <section className="week-calendar">{Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((day, index) => <article key={day} className={`week-day ${day === today ? "today" : ""}`}><button type="button" className="week-day-click" onClick={() => openMeal(day)} aria-haspopup="dialog"><header><span>{weekDays[index]}</span><b>{Number(day.slice(8))}</b></header><MealBadge plan={mealOn(mealPlans, day)} /></button><WorkoutBadges plans={workoutPlans} date={day} /><div className="day-stack">{itemsOn(items, day).map(item => <ItemCard key={item.id} item={item} />)}{itemsOn(items, day).length === 0 ? <p className="empty-day">Натисни деня, за да избереш меню</p> : null}</div></article>)}</section>;
}

function DayView({ selected, items, mealPlans, workoutPlans, openMeal }: { selected: string; items: CalendarItem[]; mealPlans: CalendarMealPlan[]; workoutPlans: WorkoutCalendarTemplate[]; openMeal: (date: string) => void }) {
  const dayItems = itemsOn(items, selected); const plan = mealOn(mealPlans, selected);
  return <section className="day-calendar"><div className="day-time-rail">{["06", "09", "12", "15", "18", "21"].map(hour => <span key={hour}>{hour}:00</span>)}</div><div className="day-agenda"><button type="button" className="day-meal-summary" onClick={() => openMeal(selected)} aria-haspopup="dialog"><span>Хранене</span><strong>{plan ? `🍽 ${plan.menu_name}` : "🍽 Избери меню за този ден"}</strong><span className="day-meal-summary-action">{plan ? "Виж / промени вариантите" : "Избери меню и варианти"}</span></button><WorkoutBadges plans={workoutPlans} date={selected} />{dayItems.length ? dayItems.map(item => <ItemCard key={item.id} item={item} />) : null}</div></section>;
}
