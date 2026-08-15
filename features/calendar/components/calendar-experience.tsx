"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DayMealPlanner } from "@/features/nutrition/components/day-meal-planner";
import type { WorkoutCalendarTemplate, WorkoutDayKey } from "@/features/workouts/workout-library";
import { addDays, dateKey, parseDateKey, startOfWeek } from "../domain/date-utils";
import type { CalendarItem, CalendarView } from "../types";
import { CalendarItem as ItemCard } from "./calendar-item";

const weekDays = ["Пон", "Вто", "Сря", "Чет", "Пет", "Съб", "Нед"];
const fullDate = new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric", timeZone: "UTC" });
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
  return plans.filter((plan) => plan.days.includes(weekday));
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

  return <>
    <header className="calendar-header"><div><p className="life-kicker">Твоето време</p><h1>{title}</h1></div><div className="calendar-controls"><div className="view-switcher">{(["month", "week", "day"] as CalendarView[]).map(value => <Link key={value} className={view === value ? "active" : ""} href={href(value, selected)}>{value === "month" ? "Месец" : value === "week" ? "Седмица" : "Ден"}</Link>)}</div><div className="date-navigation"><Link aria-label="Назад" href={href(view, previous)}>←</Link><Link href={href(view, today)}>Днес</Link><Link aria-label="Напред" href={href(view, next)}>→</Link></div></div></header>
    {view === "month" ? <MonthView selected={selected} today={today} items={items} mealPlans={mealPlans} workoutPlans={workoutPlans} openMeal={setMealDate} /> : null}
    {view === "week" ? <WeekView selected={selected} today={today} items={items} mealPlans={mealPlans} workoutPlans={workoutPlans} openMeal={setMealDate} /> : null}
    {view === "day" ? <DayView selected={selected} items={items} mealPlans={mealPlans} workoutPlans={workoutPlans} openMeal={setMealDate} /> : null}
    {mealDate ? <div className="meal-plan-modal-backdrop" role="presentation" onMouseDown={() => setMealDate(null)}>
      <section className="meal-plan-modal" role="dialog" aria-modal="true" aria-label={`Хранене за ${mealDate}`} onMouseDown={event => event.stopPropagation()}>
        <button className="meal-plan-modal-close" type="button" aria-label="Затвори" onClick={() => setMealDate(null)}>×</button>
        <DayMealPlanner key={mealDate} date={mealDate} initialMenu={activePlan?.menu_name || "Меню 1"} initialSelections={activePlan?.selections || {}} />
      </section>
    </div> : null}
  </>;
}

function MonthView({ selected, today, items, mealPlans, workoutPlans, openMeal }: { selected: string; today: string; items: CalendarItem[]; mealPlans: CalendarMealPlan[]; workoutPlans: WorkoutCalendarTemplate[]; openMeal: (date: string) => void }) {
  const date = parseDateKey(selected); const first = dateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))); const gridStart = startOfWeek(first); const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return <section className="month-calendar" aria-label="Месечен календар"><div className="month-weekdays">{weekDays.map(day => <span key={day}>{day}</span>)}</div><div className="month-grid">{days.map(day => { const dayItems = itemsOn(items, day); const outside = day.slice(0, 7) !== selected.slice(0, 7); return <article key={day} className={`month-day ${day === today ? "today" : ""} ${outside ? "outside" : ""}`}><button type="button" className="month-day-click" onClick={() => openMeal(day)} aria-label={`Отвори храненето за ${day}`} aria-haspopup="dialog"><span className="month-day-number">{Number(day.slice(8))}</span><MealBadge plan={mealOn(mealPlans, day)} /></button><WorkoutBadges plans={workoutPlans} date={day} compact /><div>{dayItems.slice(0, 3).map(item => <ItemCard key={item.id} item={item} compact />)}{dayItems.length > 3 ? <Link className="more-items" href={href("day", day)}>+ още {dayItems.length - 3}</Link> : null}</div></article>; })}</div></section>;
}

function WeekView({ selected, today, items, mealPlans, workoutPlans, openMeal }: { selected: string; today: string; items: CalendarItem[]; mealPlans: CalendarMealPlan[]; workoutPlans: WorkoutCalendarTemplate[]; openMeal: (date: string) => void }) {
  const start = startOfWeek(selected);
  return <section className="week-calendar">{Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((day, index) => <article key={day} className={`week-day ${day === today ? "today" : ""}`}><button type="button" className="week-day-click" onClick={() => openMeal(day)} aria-haspopup="dialog"><header><span>{weekDays[index]}</span><b>{Number(day.slice(8))}</b></header><MealBadge plan={mealOn(mealPlans, day)} /></button><WorkoutBadges plans={workoutPlans} date={day} /><div className="day-stack">{itemsOn(items, day).map(item => <ItemCard key={item.id} item={item} />)}{itemsOn(items, day).length === 0 ? <p className="empty-day">Натисни деня, за да избереш меню</p> : null}</div></article>)}</section>;
}

function DayView({ selected, items, mealPlans, workoutPlans, openMeal }: { selected: string; items: CalendarItem[]; mealPlans: CalendarMealPlan[]; workoutPlans: WorkoutCalendarTemplate[]; openMeal: (date: string) => void }) {
  const dayItems = itemsOn(items, selected); const plan = mealOn(mealPlans, selected);
  return <section className="day-calendar"><div className="day-time-rail">{["06", "09", "12", "15", "18", "21"].map(hour => <span key={hour}>{hour}:00</span>)}</div><div className="day-agenda"><button type="button" className="day-meal-summary" onClick={() => openMeal(selected)} aria-haspopup="dialog"><span>Хранене</span><strong>{plan ? `🍽 ${plan.menu_name}` : "🍽 Избери меню за този ден"}</strong><span className="day-meal-summary-action">{plan ? "Виж / промени вариантите" : "Избери меню и варианти"}</span></button><WorkoutBadges plans={workoutPlans} date={selected} />{dayItems.length ? dayItems.map(item => <ItemCard key={item.id} item={item} />) : null}</div></section>;
}
