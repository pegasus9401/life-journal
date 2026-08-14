import Link from "next/link";
import type { CalendarItem } from "@/features/calendar/types";
import { CalendarItem as ItemCard } from "@/features/calendar/components/calendar-item";

const headingDate = new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("bg-BG", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function TodayExperience({ today, todayItems, upcoming }: { today: string; todayItems: CalendarItem[]; upcoming: CalendarItem[] }) {
  const tasks = todayItems.filter((item) => item.type === "task");
  const schedule = todayItems.filter((item) => item.type !== "task");
  const futureByDate = upcoming.filter((item) => item.date > today).reduce<Record<string, CalendarItem[]>>((groups, item) => { (groups[item.date] ??= []).push(item); return groups; }, {});

  return <>
    <header className="today-hero"><div><p className="life-kicker">Днес</p><h1>{headingDate.format(new Date(`${today}T00:00:00Z`))}</h1><p>Един спокоен поглед към деня ти.</p></div><Link className="today-calendar-link" href={`/calendar?view=day&date=${today}`}>Отвори календара →</Link></header>
    <div className="today-layout">
      <section className="today-main-panel"><div className="section-heading"><div><p className="life-kicker">Твоят ритъм</p><h2>Дневен план</h2></div><span>{schedule.length} {schedule.length === 1 ? "събитие" : "събития"}</span></div>
        <div className="today-timeline">{schedule.length ? schedule.map((item) => <ItemCard key={item.id} item={item} />) : <div className="calendar-empty"><p>Денят е свободен.</p><span>Няма нужда всеки час да бъде запълнен.</span></div>}</div>
      </section>
      <aside className="today-side-panel">
        <section className="today-widget"><div className="section-heading"><h2>Задачи</h2><span>{tasks.filter((task) => !task.completed).length} оставащи</span></div><div className="day-stack">{tasks.length ? tasks.map((item) => <ItemCard key={item.id} item={item} />) : <p className="widget-empty">Нямаш задачи за днес.</p>}</div></section>
        <section className="today-widget"><div className="section-heading"><h2>Следващите дни</h2><Link href="/calendar?view=week">Виж всички</Link></div><div className="upcoming-list">{Object.entries(futureByDate).slice(0, 4).map(([date, items]) => <div key={date}><time>{shortDate.format(new Date(`${date}T00:00:00Z`))}</time><div>{items.slice(0, 3).map((item) => <ItemCard key={item.id} item={item} compact />)}</div></div>)}{Object.keys(futureByDate).length === 0 ? <p className="widget-empty">Хоризонтът е чист.</p> : null}</div></section>
        <section className="today-widget today-journal-prompt"><p className="life-kicker">Спомен</p><h2>Какво искаш да запазиш от този ден?</h2><Link href="/journal/new">Напиши в дневника →</Link></section>
      </aside>
    </div>
  </>;
}
