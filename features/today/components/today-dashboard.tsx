import Link from "next/link";
import type { ReactNode } from "react";
import { buildDailyBrief } from "../domain/daily-brief";
import type { TodayDashboardData } from "../types";
import { LifeTimeline } from "./life-timeline";
import styles from "./today-dashboard.module.css";
import { workoutStartTime, workoutStatus } from "@/features/workouts/domain/fitness-analytics";

const pct = (value: number, goal: number) => Math.min(100, Math.round(goal > 0 ? value / goal * 100 : 0));

export function TodayDashboard({ data, dateNavigation }: { data: TodayDashboardData; dateNavigation?: ReactNode }) {
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
      <div><h1>{data.displayName ? `Здравей, ${data.displayName}` : "Здравей"}</h1></div>
      <Link href="/profile" aria-label="Отвори профила" className={styles.avatar}>{data.displayName?.slice(0, 1).toUpperCase() ?? "P"}</Link>
    </header>
    {dateNavigation}

    <section className={`${styles.brief} intelligence-dashboard-card`} aria-labelledby="daily-brief-title"><span>✦</span><div><p id="daily-brief-title">PEGASOS INTELLIGENCE</p><h2>{buildDailyBrief(data)}</h2><small>{tasks.filter((item) => !item.completed).length} задачи · {schedule.length} събития · {data.workouts.length} тренировки</small></div></section>

    <section className={styles.status} aria-label="Дневен статус">
      {([["Recovery", data.wellness.recovery], ["Strain", data.wellness.strain], ["Sleep", data.wellness.sleep], ["Energy", data.wellness.energy]] as const).map(([label, score]) =>
        <div key={label}><strong>{score ? `${score}%` : "—"}</strong><span>{label}</span></div>)}
    </section>

    <div className={styles.grid}>
      <section className={styles.primarySection}>
        <div className={styles.sectionHead}><div><p>ХРАНЕНЕ</p><h2>{Math.round(nutrition.calories)} <small>/ {nutrition.calorieGoal} kcal</small></h2></div><Link href={`/nutrition?date=${data.date}`}>Детайли</Link></div>
        <div className={styles.calorieTrack}><span style={{ width: `${pct(nutrition.calories, nutrition.calorieGoal)}%` }} /></div>
        <div className={styles.macros}>{macros.map(([label, value, goal, tone]) => <div key={label}><span><b>{label}</b><small>{Math.round(value)} / {goal} g</small></span><i className={styles[tone]}><em style={{ width: `${pct(value, goal)}%` }} /></i></div>)}</div>
        {nutrition.nextMeal ? <p className={styles.next}>Следващо хранене <strong>{nutrition.nextMeal}</strong></p> : null}
      </section>

      <section>
        <div className={styles.sectionHead}><div><p>АКТИВНОСТ</p><h2>{data.isToday ? "Днес" : "За деня"}</h2></div><Link href={`/workouts?date=${data.date}`}>Тренировки</Link></div>
        <div className={styles.stack}>{data.workouts.length ? data.workouts.map((workout) => { const status = workoutStatus(workout); return <article className={styles.workout} key={workout.id}><div><span>{status === "completed" ? "ЗАВЪРШЕНА" : status === "in_progress" ? "В ПРОЦЕС" : "ПЛАНИРАНА"}</span><h3>{workout.title}</h3><p>{workoutStartTime(workout)} · ~{workout.duration_minutes || 45} мин</p></div><Link href="/workouts">{status === "completed" ? "Виж" : status === "in_progress" ? "Продължи" : "Започни"}</Link></article>; }) : <div className={styles.empty}><p>Няма планирана тренировка.</p><Link href="/workouts">Добави тренировка</Link></div>}</div>
      </section>

      <LifeTimeline items={data.timeline} calories={data.nutrition.calories} calorieGoal={data.nutrition.calorieGoal} protein={data.nutrition.protein} proteinGoal={data.nutrition.proteinGoal}/>

      <section className={styles.progress}>
        <div className={styles.sectionHead}><div><p>ПРОГРЕС</p><h2>Текущ статус</h2></div><Link href="/profile">Профил</Link></div>
        <div><strong>{data.currentWeight ? `${data.currentWeight} kg` : "—"}</strong><span>Текущо тегло</span><strong>{data.workouts.filter((workout) => workout.completed).length}</strong><span>Тренировки днес</span></div>
      </section>
    </div>

  </div>;
}
