import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { buildDailyBrief } from "../domain/daily-brief";
import type { TodayDashboardData } from "../types";
import { LifeTimeline } from "./life-timeline";
import styles from "./today-dashboard.module.css";
import { workoutStartTime, workoutStatus } from "@/features/workouts/domain/fitness-analytics";

const pct = (value: number, goal: number) => Math.min(100, Math.round(goal > 0 ? value / goal * 100 : 0));

function greetingForToday() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Sofia" }).format(new Date()));
  if (hour < 11) return "Добро утро";
  if (hour < 18) return "Добър ден";
  return "Добър вечер";
}

export function TodayDashboard({ data, dateNavigation }: { data: TodayDashboardData; dateNavigation?: ReactNode }) {
  const tasks = data.plannerItems.filter((item) => item.type === "task");
  const schedule = data.plannerItems.filter((item) => item.type !== "task").slice(0, 4);
  const openTasks = tasks.filter((item) => !item.completed).length;
  const nutrition = data.nutrition;
  const macros = [
    ["Протеин", nutrition.protein, nutrition.proteinGoal, "protein"],
    ["Въглехидрати", nutrition.carbs, nutrition.carbsGoal, "carbs"],
    ["Мазнини", nutrition.fat, nutrition.fatGoal, "fat"],
  ] as const;
  const wellness = [
    ["Възстановяване", data.wellness.recovery, "#59cfa1"],
    ["Сън", data.wellness.sleep, "#7d8cff"],
    ["Енергия", data.wellness.energy, "#f0b85a"],
    ["Натоварване", data.wellness.strain, "#ef759d"],
  ] as const;
  const nextItem = data.timeline.find((item) => item.status !== "completed");
  const nextWorkout = data.workouts.find((workout) => workoutStatus(workout) !== "completed") ?? data.workouts[0];
  const firstName = data.displayName?.trim().split(/\s+/)[0];
  const greeting = data.isToday ? `${greetingForToday()}${firstName ? `, ${firstName}` : ""}` : "Преглед на деня";
  const caloriesProgress = pct(nutrition.calories, nutrition.calorieGoal);
  const caloriesLeft = Math.max(0, Math.round(nutrition.calorieGoal - nutrition.calories));

  return <div className={styles.dashboard}>
    <header className={styles.header}>
      <div>
        <p className={styles.brand}><span aria-hidden="true">✦</span> PEGASOS</p>
        <h1>{greeting}</h1>
        <small>{data.isToday ? "Твоят ден, подреден на едно място." : "Запазената картина според наличните записи."}</small>
      </div>
      <Link href="/profile" aria-label="Отвори профила" className={styles.avatar}><span>{data.displayName?.slice(0, 1).toUpperCase() ?? "P"}</span></Link>
    </header>

    {dateNavigation}

    <section className={styles.brief} aria-labelledby="daily-brief-title">
      <div className={styles.briefGlow} aria-hidden="true" />
      <Image className={styles.briefOrb} src="/images/pegas-friend.png" alt="" width={220} height={148} priority sizes="(max-width: 760px) 150px, 220px" />
      <div className={styles.briefContent}>
        <p id="daily-brief-title"><span aria-hidden="true" /> PEGAS {nextItem ? `· СЛЕДВАЩО${nextItem.time ? ` В ${nextItem.time}` : ""}` : "· ДНЕВЕН ФОКУС"}</p>
        <h2>{nextItem?.title ?? "Денят е под контрол"}</h2>
        <div className={styles.briefInsight}>{buildDailyBrief(data)}</div>
        <div className={styles.briefStats} aria-label="Обобщение на деня"><span><b>{openTasks}</b> задачи</span><span><b>{schedule.length}</b> събития</span><span><b>{data.workouts.length}</b> тренировки</span></div>
        <div className={styles.briefActions}>{nextItem ? <Link href={nextItem.href}>Отвори</Link> : null}<Link href="/assistant">Попитай Pegas</Link></div>
      </div>
    </section>

    <section className={styles.status} aria-label="Дневен статус">
      {wellness.map(([label, score, tone]) => <article key={label}>
        <i style={{ "--metric-score": `${score || 0}%`, "--metric-tone": tone } as CSSProperties}><strong>{score ? Math.round(score) : "–"}</strong></i>
        <div><span>{label}</span><small>{score ? "от 100" : "Няма данни"}</small></div>
      </article>)}
    </section>

    <div className={styles.grid}>
      <section className={styles.primarySection}>
        <div className={styles.sectionHead}><div><p>ХРАНЕНЕ</p><h2>Дневна цел</h2></div><Link href={`/nutrition?date=${data.date}`}>Детайли <span>›</span></Link></div>
        <div className={styles.nutritionOverview}>
          <div className={styles.calorieDial} style={{ "--calorie-progress": `${caloriesProgress}%` } as CSSProperties}><div><strong>{Math.round(nutrition.calories)}</strong><span>kcal</span></div></div>
          <div className={styles.calorieCopy}><small>ОСТАВАТ</small><strong>{caloriesLeft} kcal</strong><p>от дневна цел {nutrition.calorieGoal} kcal</p></div>
        </div>
        <div className={styles.macros}>{macros.map(([label, value, goal, tone]) => <div key={label}><span><b>{label}</b><small>{Math.round(value)} / {goal} g</small></span><i className={styles[tone]}><em style={{ width: `${pct(value, goal)}%` }} /></i></div>)}</div>
        {nutrition.nextMeal ? <p className={styles.next}><span>Следващо хранене</span><strong>{nutrition.nextMeal}</strong></p> : null}
      </section>

      <section className={styles.workoutSection}>
        <div className={styles.sectionHead}><div><p>ДВИЖЕНИЕ</p><h2>{data.isToday ? "Активност днес" : "Активност за деня"}</h2></div><Link href={`/workouts?date=${data.date}`}>Всички <span>›</span></Link></div>
        <div className={styles.stack}>{nextWorkout ? (() => { const status = workoutStatus(nextWorkout); return <article className={styles.workout} key={nextWorkout.id}><div className={styles.workoutIcon} aria-hidden="true">↗</div><div><span>{status === "completed" ? "ЗАВЪРШЕНА" : status === "in_progress" ? "В ПРОЦЕС" : "ПЛАНИРАНА"}</span><h3>{nextWorkout.title}</h3><p>{workoutStartTime(nextWorkout)} · около {nextWorkout.duration_minutes || 45} мин</p></div><Link href="/workouts">{status === "completed" ? "Виж" : status === "in_progress" ? "Продължи" : "Започни"}</Link></article>; })() : <div className={styles.empty}><div className={styles.workoutIcon} aria-hidden="true">＋</div><div><strong>Няма планирана тренировка</strong><p>Добави движение, когато си готов.</p></div><Link href="/workouts">Добави</Link></div>}</div>
      </section>

      <LifeTimeline items={data.timeline} calories={data.nutrition.calories} calorieGoal={data.nutrition.calorieGoal} protein={data.nutrition.protein} proteinGoal={data.nutrition.proteinGoal}/>

      <Link className={styles.journalEntry} href="/journal/new"><span aria-hidden="true">✎</span><div><small>ДНЕВНИК</small><strong>Запази нещо от този ден</strong><p>Мисъл, снимка или кратък спомен</p></div><b aria-hidden="true">›</b></Link>
    </div>
  </div>;
}
