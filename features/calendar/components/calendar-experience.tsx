import Link from "next/link";
import { addDays, dateKey, parseDateKey, startOfWeek } from "../domain/date-utils";
import type { CalendarItem, CalendarView } from "../types";
import { CalendarItem as ItemCard } from "./calendar-item";

const weekDays = ["Пон", "Вто", "Сря", "Чет", "Пет", "Съб", "Нед"];
const fullDate = new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric", timeZone: "UTC" });
const dayNumber = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "short", timeZone: "UTC" });

function href(view: CalendarView, date: string) { return `/calendar?view=${view}&date=${date}`; }
function itemsOn(items: CalendarItem[], date: string) { return items.filter((item) => item.date <= date && (item.endDate ?? item.date) >= date); }

export function CalendarExperience({ view, selected, today, items }: { view: CalendarView; selected: string; today: string; items: CalendarItem[] }) {
  const selectedDate = parseDateKey(selected);
  const title = view === "month" ? monthName.format(selectedDate) : view === "week" ? `${dayNumber.format(parseDateKey(startOfWeek(selected)))} – ${dayNumber.format(parseDateKey(addDays(startOfWeek(selected), 6)))}` : fullDate.format(selectedDate);
  const previous = view === "month" ? dateKey(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() - 1, 1))) : addDays(selected, view === "week" ? -7 : -1);
  const next = view === "month" ? dateKey(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1, 1))) : addDays(selected, view === "week" ? 7 : 1);

  return <>
    <header className="calendar-header">
      <div><p className="life-kicker">Твоето време</p><h1>{title}</h1></div>
      <div className="calendar-controls">
        <div className="view-switcher">{(["month", "week", "day"] as CalendarView[]).map((value) => <Link key={value} className={view === value ? "active" : ""} href={href(value, selected)}>{value === "month" ? "Месец" : value === "week" ? "Седмица" : "Ден"}</Link>)}</div>
        <div className="date-navigation"><Link aria-label="Назад" href={href(view, previous)}>←</Link><Link href={href(view, today)}>Днес</Link><Link aria-label="Напред" href={href(view, next)}>→</Link></div>
      </div>
    </header>
    {view === "month" ? <MonthView selected={selected} today={today} items={items} /> : null}
    {view === "week" ? <WeekView selected={selected} today={today} items={items} /> : null}
    {view === "day" ? <DayView selected={selected} items={items} /> : null}
  </>;
}

function MonthView({ selected, today, items }: { selected: string; today: string; items: CalendarItem[] }) {
  const date = parseDateKey(selected);
  const first = dateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  return <section className="month-calendar" aria-label="Месечен календар">
    <div className="month-weekdays">{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
    <div className="month-grid">{days.map((day) => { const dayItems = itemsOn(items, day); const outside = day.slice(0, 7) !== selected.slice(0, 7); return <article key={day} className={`month-day ${day === today ? "today" : ""} ${outside ? "outside" : ""}`}>
      <Link className="month-day-number" href={href("day", day)}>{Number(day.slice(8))}</Link>
      <div>{dayItems.slice(0, 4).map((item) => <ItemCard key={item.id} item={item} compact />)}{dayItems.length > 4 ? <Link className="more-items" href={href("day", day)}>+ още {dayItems.length - 4}</Link> : null}</div>
    </article>; })}</div>
  </section>;
}

function WeekView({ selected, today, items }: { selected: string; today: string; items: CalendarItem[] }) {
  const start = startOfWeek(selected);
  return <section className="week-calendar">{Array.from({ length: 7 }, (_, index) => addDays(start, index)).map((day, index) => <article key={day} className={`week-day ${day === today ? "today" : ""}`}><header><span>{weekDays[index]}</span><Link href={href("day", day)}>{Number(day.slice(8))}</Link></header><div className="day-stack">{itemsOn(items, day).map((item) => <ItemCard key={item.id} item={item} />)}{itemsOn(items, day).length === 0 ? <p className="empty-day">Свободно пространство</p> : null}</div></article>)}</section>;
}

function DayView({ selected, items }: { selected: string; items: CalendarItem[] }) {
  const dayItems = itemsOn(items, selected);
  return <section className="day-calendar"><div className="day-time-rail">{["06", "09", "12", "15", "18", "21"].map((hour) => <span key={hour}>{hour}:00</span>)}</div><div className="day-agenda">{dayItems.length ? dayItems.map((item) => <ItemCard key={item.id} item={item} />) : <div className="calendar-empty"><p>Нищо не е планирано.</p><span>Остави деня отворен или добави нещо, което има значение.</span></div>}</div></section>;
}
