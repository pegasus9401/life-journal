import Link from "next/link";
import { CalendarItem as ItemCard } from "@/features/calendar/components/calendar-item";
import { buildDailyBrief } from "../domain/daily-brief";
import type { TodayDashboardData } from "../types";
import styles from "./today-dashboard.module.css";

const dayFormat = new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const pct = (value: number, goal: number) => Math.min(100, Math.round(goal > 0 ? value / goal * 100 : 0));

export function TodayDashboard({ data }: { data: TodayDashboardData }) {
  const tasks = data.plannerItems.filter((item) => item.type === "task");
  const schedule = data.plannerItems.filter((item) => item.type !== "task").slice(0, 4);
  const nutrition = data.nutrition;
  const macros = [
    ["Протеин", nutrition.protein, nutrition.proteinGoal, "protein"],
    ["Въглехидрати", nutrition.carbs, nutrition.carbsGoal, "carbs"],
    ["Мазнини", nutrition.fat, nutrition.fatGoal, "fat"],
  ] as const;

  return <div className={styles.dashboard}>
    <header className={styles.header}>
      <div><p>{dayFormat.format(new Date(`${data.date}T12:00:00Z`))}</p><h1>{data.displayName ? `Здравей, ${data.displayName}` : "Здравей"}</h1></div>
      <Link href="/profile" aria-label="Отвори профила" className={styles.avatar}>{data.displayName?.slice(0, 1).toUpperCase() ?? "P"}</Link>
    </header>

    <section className={`${styles.brief} intelligence-dashboard-card`} aria-labelledby="daily-brief-title"><span>✦</span><div><p id="daily-brief-title">PEGASOS INTELLIGENCE</p><h2>{buildDailyBrief(data)}</h2><small>{tasks.filter((item) => !item.completed).length} задачи · {schedule.length} събития · {data.workouts.length} тренировки</small></div></section>

    <section className={styles.status} aria-label="Дневен статус">
      {([["Recovery", data.wellness.recovery], ["Strain", data.wellness.strain], ["Sleep", data.wellness.sleep], ["Energy", data.wellness.energy]] as const).map(([label, score]) =>
        <div key={label}><strong>{score ? `${score}%` : "—"}</strong><span>{label}</span></div>)}
    </section>

    <div className={styles.grid}>
      <section className={styles.primarySection}>
        <div className={styles.sectionHead}><div><p>ХРАНЕНЕ</p><h2>{Math.round(nutrition.calories)} <small>/ {nutrition.calorieGoal} kcal</small></h2></div><Link href="/nutrition">Детайли</Link></div>
        <div className={styles.calorieTrack}><span style={{ width: `${pct(nutrition.calories, nutrition.calorieGoal)}%` }} /></div>
        <div className={styles.macros}>{macros.map(([label, value, goal, tone]) => <div key={label}><span><b>{label}</b><small>{Math.round(value)} / {goal} g</small></span><i className={styles[tone]}><em style={{ width: `${pct(value, goal)}%` }} /></i></div>)}</div>
        {nutrition.nextMeal ? <p className={styles.next}>Следващо хранене <strong>{nutrition.nextMeal}</strong></p> : null}
      </section>

      <section>
        <div className={styles.sectionHead}><div><p>АКТИВНОСТ</p><h2>Днес</h2></div><Link href="/workouts">Тренировки</Link></div>
        <div className={styles.stack}>{data.workouts.length ? data.workouts.map((workout) => <article className={styles.workout} key={workout.id}><div><span>{workout.completed ? "ЗАВЪРШЕНА" : "ПЛАНИРАНА"}</span><h3>{workout.title}</h3><p>{workout.duration_minutes} мин · {workout.calories_burned} kcal</p></div><Link href="/workouts">{workout.completed ? "Виж" : "Започни"}</Link></article>) : <div className={styles.empty}><p>Няма планирана тренировка.</p><Link href="/workouts">Добави тренировка</Link></div>}</div>
      </section>

      <section>
        <div className={styles.sectionHead}><div><p>PLANNER</p><h2>Следва</h2></div><Link href="/calendar">Отвори</Link></div>
        <div className={styles.stack}>{schedule.length ? schedule.map((item) => <ItemCard key={item.id} item={item} compact />) : <div className={styles.empty}><p>Няма предстоящи събития днес.</p></div>}{tasks.slice(0, 3).map((item) => <ItemCard key={item.id} item={item} compact />)}</div>
      </section>

      <section className={styles.progress}>
        <div className={styles.sectionHead}><div><p>ПРОГРЕС</p><h2>Текущ статус</h2></div><Link href="/profile">Профил</Link></div>
        <div><strong>{data.currentWeight ? `${data.currentWeight} kg` : "—"}</strong><span>Текущо тегло</span><strong>{data.workouts.filter((workout) => workout.completed).length}</strong><span>Тренировки днес</span></div>
      </section>
    </div>

    <footer className={styles.journal}><div><p>ДНЕВНИК</p><strong>Какво си струва да запазиш от днес?</strong></div><Link href="/journal/new">Запиши</Link></footer>
  </div>;
}

