"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import { DayMealPlanner } from "@/features/nutrition/components/day-meal-planner";
import type { WorkoutCalendarTemplate, WorkoutDayKey } from "@/features/workouts/workout-library";
import { addDays, dateKey, parseDateKey, startOfWeek } from "../domain/date-utils";
import type { CalendarItem, CalendarView } from "../types";
import { CalendarItem as ItemCard } from "./calendar-item";
import styles from "./calendar-experience.module.css";

const weekDays = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "НД"];
const weekDaysLong = ["Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота", "Неделя"];
const fullDate = new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "short", timeZone: "UTC" });
const shortMonth = new Intl.DateTimeFormat("bg-BG", { month: "short", timeZone: "UTC" });

export type CalendarMealPlan = { plan_date: string; menu_name: string; selections?: Record<string, number> };
type PlannerFilter = "all" | "task" | "event" | "workout" | "meal";

const filters: Array<{ value: PlannerFilter; label: string; icon: string }> = [
  { value: "all", label: "Всичко", icon: "✦" },
  { value: "task", label: "Задачи", icon: "✓" },
  { value: "event", label: "Събития", icon: "○" },
  { value: "workout", label: "Тренировки", icon: "↗" },
  { value: "meal", label: "Хранене", icon: "◇" },
];

const workoutDayKeys: WorkoutDayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function href(view: CalendarView, date: string) {
  return `/calendar?view=${view}&date=${date}`;
}

function itemsOn(items: CalendarItem[], date: string) {
  return items
    .filter((item) => item.date <= date && (item.endDate ?? item.date) >= date)
    .sort((left, right) => (left.allDay ? "00:00" : left.time ?? "23:59").localeCompare(right.allDay ? "00:00" : right.time ?? "23:59") || left.title.localeCompare(right.title, "bg"));
}

function mealOn(plans: CalendarMealPlan[], date: string) {
  return plans.find((plan) => plan.plan_date === date);
}

function workoutsOn(plans: WorkoutCalendarTemplate[], date: string) {
  const weekday = workoutDayKeys[new Date(`${date}T12:00:00Z`).getUTCDay()];
  return plans.filter((plan) => plan.days.includes(weekday) && (!plan.startDate || date >= plan.startDate) && (!plan.endDate || date <= plan.endDate));
}

function matchesFilter(item: CalendarItem, filter: PlannerFilter) {
  if (filter === "all") return item.category !== "sticker";
  if (filter === "task") return item.type === "task";
  if (filter === "workout") return item.type === "workout";
  if (filter === "meal") return item.type === "meal";
  return item.type !== "task" && item.type !== "workout" && item.type !== "meal" && item.category !== "sticker";
}

function showMeals(filter: PlannerFilter) {
  return filter === "all" || filter === "meal";
}

function showWorkouts(filter: PlannerFilter) {
  return filter === "all" || filter === "workout";
}

function markerTone(color: string) {
  const tones: Record<string, string> = {
    violet: "#8173eb",
    purple: "#9d68df",
    green: "#59cfa1",
    red: "#eb7180",
    pink: "#e47bb0",
    blue: "#6e91ef",
    orange: "#efb65d",
  };
  return color.startsWith("#") ? color : tones[color] ?? "#8173eb";
}

function capitalized(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function openQuickCapture(date?: string) {
  if (date) window.dispatchEvent(new CustomEvent("calendar-active-date", { detail: date }));
  window.dispatchEvent(new Event("open-quick-capture", { cancelable: true }));
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} /></svg>;
}

function MealPlanCard({ date, plan, openMeal, compact = false }: { date: string; plan?: CalendarMealPlan; openMeal: (date: string) => void; compact?: boolean }) {
  return <button type="button" className={`${styles.planCard} ${styles.mealCard} ${compact ? styles.compactPlanCard : ""}`} onClick={() => openMeal(date)} aria-haspopup="dialog">
    <span className={styles.planIcon} aria-hidden="true">◇</span>
    <span className={styles.planCopy}><small>ХРАНЕНЕ</small><strong>{plan?.menu_name ?? "Планирай храненето"}</strong><span>{plan ? "Виж или промени избраното меню" : "Избери меню и варианти за деня"}</span></span>
    <b aria-hidden="true">›</b>
  </button>;
}

function WorkoutPlanCard({ workout, compact = false }: { workout: WorkoutCalendarTemplate; compact?: boolean }) {
  return <Link className={`${styles.planCard} ${styles.workoutCard} ${compact ? styles.compactPlanCard : ""}`} href="/workouts">
    <span className={styles.planIcon} aria-hidden="true">↗</span>
    <span className={styles.planCopy}><small>ТРЕНИРОВКА</small><strong>{workout.name}</strong><span>{workout.durationMinutes ? `Около ${workout.durationMinutes} минути` : `${workout.exerciseCount} упражнения`}</span></span>
    <b aria-hidden="true">›</b>
  </Link>;
}

export function CalendarExperience({ view, selected, today, items, mealPlans = [], workoutPlans = [] }: { view: CalendarView; selected: string; today: string; items: CalendarItem[]; mealPlans?: CalendarMealPlan[]; workoutPlans?: WorkoutCalendarTemplate[] }) {
  const [mealDate, setMealDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<PlannerFilter>("all");
  const selectedDate = parseDateKey(selected);
  const title = view === "month"
    ? monthName.format(selectedDate)
    : view === "week"
      ? `${shortDate.format(parseDateKey(startOfWeek(selected)))} - ${shortDate.format(parseDateKey(addDays(startOfWeek(selected), 6)))}`
      : fullDate.format(selectedDate);
  const previous = view === "month" ? dateKey(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() - 1, 1))) : addDays(selected, view === "week" ? -7 : -1);
  const next = view === "month" ? dateKey(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1, 1))) : addDays(selected, view === "week" ? 7 : 1);
  const activePlan = mealDate ? mealOn(mealPlans, mealDate) : undefined;
  const visibleItems = items.filter((item) => item.category !== "sticker");
  const openTasks = visibleItems.filter((item) => item.type === "task" && !item.completed).length;
  const eventCount = visibleItems.filter((item) => item.type !== "task" && item.type !== "workout").length;
  const nextItem = visibleItems.find((item) => item.date >= today && !item.completed);

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

  return <div className={styles.planner}>
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.brand}><span aria-hidden="true">✦</span> PEGASOS</p>
        <h1>Планер</h1>
        <small>Плановете ти, подредени спокойно и ясно.</small>
      </div>
      <Link className={styles.todayLink} href={href(view, today)} aria-label="Покажи днешната дата"><span aria-hidden="true">○</span><b>Днес</b></Link>
    </header>

    <section className={styles.hero} aria-labelledby="planner-focus-title">
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.heroContent}>
        <p><span aria-hidden="true" /> ПЛАН ЗА ПЕРИОДА</p>
        <h2 id="planner-focus-title">{nextItem?.title ?? "Има място за нови планове"}</h2>
        <div className={styles.heroInsight}>{nextItem ? `${capitalized(fullDate.format(parseDateKey(nextItem.date)))}${nextItem.time ? ` в ${nextItem.time}` : ""}` : "Добави задача, събитие, тренировка или меню за деня."}</div>
        <div className={styles.heroStats} aria-label="Обобщение на планера"><span><b>{openTasks}</b> задачи</span><span><b>{eventCount}</b> събития</span><span><b>{workoutPlans.length}</b> програми</span><span><b>{mealPlans.length}</b> менюта</span></div>
        <button type="button" onClick={() => openQuickCapture(selected)}>Добави план <span aria-hidden="true">＋</span></button>
      </div>
      <div className={styles.heroCalendar} aria-hidden="true"><small>{capitalized(shortMonth.format(selectedDate))}</small><strong>{selectedDate.getUTCDate()}</strong><span>ПЛАНЕР</span></div>
    </section>

    <nav className={styles.filters} aria-label="Филтри на планера">
      {filters.map((entry) => <button type="button" key={entry.value} className={filter === entry.value ? styles.activeFilter : ""} aria-pressed={filter === entry.value} onClick={() => setFilter(entry.value)}><span aria-hidden="true">{entry.icon}</span>{entry.label}</button>)}
    </nav>

    <section className={styles.toolbar} aria-label="Навигация на календара">
      <div className={styles.periodNavigation}>
        <Link href={href(view, previous)} aria-label="Предишен период"><Chevron direction="left" /></Link>
        <div><small>{view === "month" ? "МЕСЕЧЕН ПЛАН" : view === "week" ? "СЕДМИЧЕН ПЛАН" : "ДНЕВЕН ПЛАН"}</small><h2>{capitalized(title)}</h2></div>
        <Link href={href(view, next)} aria-label="Следващ период"><Chevron direction="right" /></Link>
      </div>
      <div className={styles.viewSwitcher} aria-label="Изглед">
        {(["month", "week", "day"] as CalendarView[]).map((value) => <Link key={value} className={view === value ? styles.activeView : ""} aria-current={view === value ? "page" : undefined} href={href(value, selected)}>{value === "month" ? "Месец" : value === "week" ? "Седмица" : "Ден"}</Link>)}
      </div>
    </section>

    {view === "month" ? <MonthView key={selected} selected={selected} today={today} items={items} mealPlans={mealPlans} workoutPlans={workoutPlans} filter={filter} openMeal={setMealDate} /> : null}
    {view === "week" ? <WeekView selected={selected} today={today} items={items} mealPlans={mealPlans} workoutPlans={workoutPlans} filter={filter} openMeal={setMealDate} /> : null}
    {view === "day" ? <DayView selected={selected} items={items} mealPlans={mealPlans} workoutPlans={workoutPlans} filter={filter} openMeal={setMealDate} /> : null}

    {mealDate ? <div className="meal-plan-modal-backdrop" role="presentation" onMouseDown={() => setMealDate(null)}>
      <section className="meal-plan-modal" role="dialog" aria-modal="true" aria-label={`Хранене за ${mealDate}`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="meal-plan-modal-close" type="button" aria-label="Затвори" onClick={() => setMealDate(null)}>×</button>
        <DayMealPlanner key={mealDate} date={mealDate} initialMenu={activePlan?.menu_name || "Меню 1"} initialSelections={activePlan?.selections || {}} initialHasPlan={Boolean(activePlan)} />
      </section>
    </div> : null}
  </div>;
}

function MonthView({ selected, today, items, mealPlans, workoutPlans, filter, openMeal }: { selected: string; today: string; items: CalendarItem[]; mealPlans: CalendarMealPlan[]; workoutPlans: WorkoutCalendarTemplate[]; filter: PlannerFilter; openMeal: (date: string) => void }) {
  const date = parseDateKey(selected);
  const first = dateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const initialActiveDay = days.includes(selected) ? selected : days.includes(today) ? today : first;
  const [activeDay, setActiveDay] = useState(initialActiveDay);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaDragY, setAgendaDragY] = useState(0);
  const agendaRef = useRef<HTMLElement | null>(null);
  const agendaListRef = useRef<HTMLDivElement | null>(null);
  const agendaTouch = useRef<{ x: number; y: number; canClose: boolean } | null>(null);
  const activeItems = itemsOn(items, activeDay).filter((item) => matchesFilter(item, filter));
  const activeMeal = showMeals(filter) ? mealOn(mealPlans, activeDay) : undefined;
  const activeWorkouts = showWorkouts(filter) ? workoutsOn(workoutPlans, activeDay) : [];

  useEffect(() => {
    if (!agendaOpen) return;
    const frame = window.requestAnimationFrame(() => agendaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [agendaOpen, activeDay]);

  const beginAgendaGesture = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    agendaTouch.current = { x: touch.clientX, y: touch.clientY, canClose: (agendaListRef.current?.scrollTop ?? 0) <= 0 };
    setAgendaDragY(0);
  };

  const moveAgendaGesture = (event: TouchEvent<HTMLElement>) => {
    const start = agendaTouch.current;
    const touch = event.touches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) >= Math.abs(dy) || Math.abs(dy) < 8) return;
    if (start.canClose && dy > 0) setAgendaDragY(Math.min(dy, 160));
  };

  const finishAgendaGesture = (event: TouchEvent<HTMLElement>) => {
    const start = agendaTouch.current;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (start.canClose && dy > 64 && Math.abs(dy) > Math.abs(dx) * 1.2) setAgendaOpen(false);
    agendaTouch.current = null;
    setAgendaDragY(0);
  };

  return <section className={styles.monthView} aria-label="Месечен календар">
    <div className={styles.monthCard}>
      <div className={styles.weekdays}>{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
      <div className={styles.monthGrid}>{days.map((day) => {
        const allDayItems = itemsOn(items, day);
        const dayItems = allDayItems.filter((item) => matchesFilter(item, filter));
        const stickerItem = allDayItems.find((item) => item.sticker);
        const plan = showMeals(filter) ? mealOn(mealPlans, day) : undefined;
        const workouts = showWorkouts(filter) ? workoutsOn(workoutPlans, day) : [];
        const outside = day.slice(0, 7) !== selected.slice(0, 7);
        const markers = [
          ...dayItems.map((item) => markerTone(item.color)),
          ...(plan ? ["#59cfa1"] : []),
          ...workouts.map(() => "#8173eb"),
        ].slice(0, 4);
        const count = dayItems.length + (plan ? 1 : 0) + workouts.length;
        const preview = dayItems[0]?.title ?? (workouts[0]?.name || plan?.menu_name);
        const selectedDay = day === activeDay;
        return <article key={day} className={styles.monthDay} data-today={day === today || undefined} data-selected={selectedDay || undefined} data-outside={outside || undefined}>
          <button type="button" className={styles.dayButton} onClick={() => {
            window.dispatchEvent(new CustomEvent("calendar-active-date", { detail: day }));
            if (selectedDay && agendaOpen) { setAgendaOpen(false); return; }
            setActiveDay(day);
            setAgendaOpen(true);
          }} aria-label={`${capitalized(fullDate.format(parseDateKey(day)))}${count ? `, ${count} плана` : ", без планове"}`} aria-pressed={selectedDay && agendaOpen}>
            <span className={styles.dayNumber}>{Number(day.slice(8))}</span>
            {stickerItem?.sticker ? <span className={styles.daySticker} aria-hidden="true">{stickerItem.sticker}</span> : null}
            <span className={styles.markers} aria-hidden="true">{markers.map((tone, index) => <i key={`${tone}-${index}`} style={{ "--marker-tone": tone } as CSSProperties} />)}</span>
            {preview ? <small className={styles.dayPreview}>{preview}</small> : null}
          </button>
        </article>;
      })}</div>
    </div>

    {agendaOpen ? <section ref={agendaRef} className={`${styles.agenda} ${agendaDragY ? styles.draggingAgenda : ""}`} style={{ "--agenda-drag": `${agendaDragY}px` } as CSSProperties} aria-labelledby="selected-day-title" onTouchStart={beginAgendaGesture} onTouchMove={moveAgendaGesture} onTouchEnd={finishAgendaGesture} onTouchCancel={() => { agendaTouch.current = null; setAgendaDragY(0); }}>
      <button className={styles.agendaHandle} type="button" aria-label="Затвори програмата" onClick={() => setAgendaOpen(false)}><span /></button>
      <header className={styles.agendaHeader}>
        <div><p>ПРОГРАМА ЗА ДЕНЯ</p><h2 id="selected-day-title">{capitalized(fullDate.format(parseDateKey(activeDay)))}</h2></div>
        <div className={styles.agendaActions}><button type="button" onClick={() => openQuickCapture(activeDay)} aria-label="Добави към избрания ден">＋</button><button type="button" onClick={() => setAgendaOpen(false)} aria-label="Затвори">×</button></div>
      </header>
      <div className={styles.agendaSummary}><span><b>{activeItems.length}</b> записа</span><span><b>{activeWorkouts.length}</b> тренировки</span><span><b>{activeMeal ? 1 : 0}</b> меню</span></div>
      <div className={styles.agendaList} ref={agendaListRef}>
        {showMeals(filter) ? <MealPlanCard date={activeDay} plan={activeMeal} openMeal={openMeal} /> : null}
        {activeWorkouts.map((workout) => <WorkoutPlanCard workout={workout} key={workout.id} />)}
        {activeItems.map((item) => <ItemCard item={item} key={item.id} />)}
        {!showMeals(filter) && !activeWorkouts.length && !activeItems.length ? <EmptyPlans date={activeDay} /> : null}
      </div>
    </section> : null}
  </section>;
}

function WeekView({ selected, today, items, mealPlans, workoutPlans, filter, openMeal }: { selected: string; today: string; items: CalendarItem[]; mealPlans: CalendarMealPlan[]; workoutPlans: WorkoutCalendarTemplate[]; filter: PlannerFilter; openMeal: (date: string) => void }) {
  const start = startOfWeek(selected);
  return <section className={styles.weekView} aria-label="Седмичен календар">
    {Array.from({ length: 7 }, (_, index) => addDays(start, index)).map((day, index) => {
      const dayItems = itemsOn(items, day).filter((item) => matchesFilter(item, filter));
      const plan = showMeals(filter) ? mealOn(mealPlans, day) : undefined;
      const workouts = showWorkouts(filter) ? workoutsOn(workoutPlans, day) : [];
      const count = dayItems.length + (plan ? 1 : 0) + workouts.length;
      return <article className={styles.weekDay} data-today={day === today || undefined} key={day}>
        <header><div><span>{weekDaysLong[index]}</span><strong>{Number(day.slice(8))}</strong><small>{capitalized(shortMonth.format(parseDateKey(day)))}</small></div><Link href={href("day", day)}>Отвори деня <b aria-hidden="true">›</b></Link></header>
        <div className={styles.weekDayMeta}><span>{count ? `${count} плана` : "Свободен ден"}</span>{day === today ? <b>ДНЕС</b> : null}</div>
        <div className={styles.weekDayPlans}>
          {plan ? <MealPlanCard date={day} plan={plan} openMeal={openMeal} compact /> : showMeals(filter) ? <button className={styles.addMeal} type="button" onClick={() => openMeal(day)}>＋ Добави меню</button> : null}
          {workouts.map((workout) => <WorkoutPlanCard workout={workout} compact key={workout.id} />)}
          {dayItems.map((item) => <ItemCard item={item} compact key={item.id} />)}
          {!showMeals(filter) && !workouts.length && !dayItems.length ? <p className={styles.compactEmpty}>Няма планове в тази категория.</p> : null}
        </div>
      </article>;
    })}
  </section>;
}

function DayView({ selected, items, mealPlans, workoutPlans, filter, openMeal }: { selected: string; items: CalendarItem[]; mealPlans: CalendarMealPlan[]; workoutPlans: WorkoutCalendarTemplate[]; filter: PlannerFilter; openMeal: (date: string) => void }) {
  const dayItems = itemsOn(items, selected).filter((item) => matchesFilter(item, filter));
  const plan = showMeals(filter) ? mealOn(mealPlans, selected) : undefined;
  const workouts = showWorkouts(filter) ? workoutsOn(workoutPlans, selected) : [];
  const total = dayItems.length + (plan ? 1 : 0) + workouts.length;
  return <section className={styles.dayView} aria-label="Дневен календар">
    <header className={styles.dayOverview}><div><p>ДНЕВЕН ФОКУС</p><h2>{total ? `${total} плана за деня` : "Свободен ден"}</h2><span>{total ? "Всичко важно е събрано на едно място." : "Остави го свободен или добави нещо ново."}</span></div><button type="button" onClick={() => openQuickCapture(selected)}>＋ Добави</button></header>
    <div className={styles.dayList}>
      {showMeals(filter) ? <MealPlanCard date={selected} plan={plan} openMeal={openMeal} /> : null}
      {workouts.map((workout) => <WorkoutPlanCard workout={workout} key={workout.id} />)}
      {dayItems.map((item) => <ItemCard item={item} key={item.id} />)}
      {!showMeals(filter) && !workouts.length && !dayItems.length ? <EmptyPlans date={selected} /> : null}
    </div>
  </section>;
}

function EmptyPlans({ date }: { date: string }) {
  return <div className={styles.emptyPlans}><span aria-hidden="true">✦</span><strong>Тук още няма планове</strong><p>Добави задача, събитие, тренировка или хранене.</p><button type="button" onClick={() => openQuickCapture(date)}>Добави към деня</button></div>;
}
