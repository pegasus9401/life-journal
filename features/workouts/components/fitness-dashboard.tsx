"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { START_WORKOUT_EVENT, type StartWorkoutDetail } from "./active-workout-tracker";
import { OPEN_WORKOUT_BUILDER_EVENT, WorkoutExperience } from "./workout-experience";
import {
  fitnessSummary,
  MUSCLE_ORDER,
  sessionMetrics,
  strengthProgression,
  workoutStartTime,
  workoutStatus,
} from "../domain/fitness-analytics";
import type { WorkoutSession } from "../types";
import styles from "./fitness-dashboard.module.css";

const PERIODS = [
  { label: "7 дни", short: "7D", days: 7 },
  { label: "30 дни", short: "30D", days: 30 },
  { label: "3 месеца", short: "3M", days: 90 },
  { label: "6 месеца", short: "6M", days: 183 },
  { label: "1 година", short: "1Y", days: 365 },
] as const;

type HubView = "overview" | "programs" | "history";

const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const minusDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() - days + 1);
  return isoDate(value);
};
const duration = (minutes: number) => minutes < 60 ? `${minutes} мин` : `${Math.floor(minutes / 60)} ч${minutes % 60 ? ` ${minutes % 60} мин` : ""}`;
const compact = (value: number) => new Intl.NumberFormat("bg-BG", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(Math.round(value));
const dayLabel = (date: string) => new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));

function templateCount(raw: unknown) {
  return Array.isArray(raw) ? raw.length : 1;
}

function Icon({ name }: { name: HubView | "plus" | "coach" }) {
  const paths = {
    overview: <><path d="M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z" /></>,
    programs: <><path d="M6 4v16M18 4v16M3 8h6M15 8h6M3 16h6M15 16h6M9 6v12M15 6v12" /></>,
    history: <><path d="M12 7v5l3 2"/><path d="M5.2 5.2A9 9 0 1 1 3 12"/><path d="M3 5v5h5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    coach: <><path d="m12 3 1.7 5.4L19 10l-5.3 1.6L12 17l-1.7-5.4L5 10l5.3-1.6L12 3Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function MiniTrend({ values }: { values: number[] }) {
  if (values.length < 2) return <span className={styles.noTrend}>Нужни са още данни</span>;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const points = values.map((value, index) => `${index / (values.length - 1) * 100},${34 - (value - min) / span * 30}`).join(" ");
  return <svg className={styles.trend} viewBox="0 0 100 38" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} /></svg>;
}

function ActivityCalendar({ sessions, today, onSelect }: { sessions: WorkoutSession[]; today: string; onSelect: (date: string) => void }) {
  const days = Array.from({ length: 56 }, (_, index) => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() - 55 + index);
    return isoDate(date);
  });
  const counts = new Map<string, number>();
  for (const session of sessions) counts.set(session.workout_date, (counts.get(session.workout_date) ?? 0) + 1);
  return <div className={styles.activityGrid}>{days.map((date) => {
    const count = counts.get(date) ?? 0;
    return <button key={date} type="button" className={styles[`level${Math.min(3, count)}`]} title={`${dayLabel(date)}: ${count} активности`} aria-label={`${dayLabel(date)}: ${count} активности`} onClick={() => onSelect(date)} />;
  })}</div>;
}

export function FitnessDashboard({
  sessions,
  today,
  initialTemplates,
  initialHistory,
}: {
  sessions: WorkoutSession[];
  today: string;
  initialTemplates?: unknown;
  initialHistory: WorkoutSession[];
}) {
  const [view, setView] = useState<HubView>("overview");
  const [periodDays, setPeriodDays] = useState(30);
  const [selectedDate, setSelectedDate] = useState(today);
  const rangeSessions = useMemo(() => sessions.filter((session) => session.workout_date >= minusDays(today, periodDays) && session.workout_date <= today), [sessions, today, periodDays]);
  const summary = useMemo(() => fitnessSummary(rangeSessions), [rangeSessions]);
  const progression = useMemo(() => strengthProgression(rangeSessions), [rangeSessions]);
  const selectedSessions = sessions.filter((session) => session.workout_date === selectedDate);
  const todayWorkout = sessions.find((session) => session.workout_date === today && !["cancelled", "skipped"].includes(workoutStatus(session)));
  const totalMuscle = MUSCLE_ORDER.reduce((sum, group) => sum + summary.muscles[group], 0);
  const currentPeriod = PERIODS.find((period) => period.days === periodDays) ?? PERIODS[1];

  useEffect(() => {
    const syncHash = () => {
      if (window.location.hash === "#workout-templates") setView("programs");
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const changeView = (next: HubView) => {
    setView(next);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const createProgram = () => {
    setView("programs");
    window.requestAnimationFrame(() => window.dispatchEvent(new Event(OPEN_WORKOUT_BUILDER_EVENT)));
  };

  const start = (session: WorkoutSession) => {
    const detail: StartWorkoutDetail = {
      id: session.workout_template_id ?? session.id,
      sessionId: session.id,
      name: session.title,
      exercises: session.exercises.map((exercise, index) => ({
        id: `${session.id}:${index}`,
        group: exercise.muscle_group || "Друго",
        name: exercise.name,
        sets: exercise.sets,
        reps: String(exercise.reps),
        restSeconds: exercise.rest_seconds ?? 60,
      })),
    };
    window.dispatchEvent(new CustomEvent(START_WORKOUT_EVENT, { detail }));
  };

  return <div className={styles.dashboard}>
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.brand}><span aria-hidden="true">✦</span> PEGASOS · FITNESS</p>
        <h1>Тренировки</h1>
        <p>План, изпълнение и прогрес в един подреден поток.</p>
      </div>
      <button className={styles.newProgram} type="button" onClick={createProgram}><Icon name="plus"/><span>Нова програма</span></button>
    </header>

    <nav className={styles.hubNav} aria-label="Раздели в Тренировки">
      {([
        { key: "overview", label: "Преглед", detail: "Днес" },
        { key: "programs", label: "Програми", detail: String(templateCount(initialTemplates)) },
        { key: "history", label: "История", detail: String(initialHistory.length) },
      ] as const).map((item) => <button type="button" key={item.key} className={view === item.key ? styles.activeNav : ""} onClick={() => changeView(item.key)} aria-pressed={view === item.key}><Icon name={item.key}/><span>{item.label}</span><small>{item.detail}</small></button>)}
    </nav>

    {view === "overview" ? <>
      <section className={styles.todayCard}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <Image className={styles.pegas} src="/images/pegas-friend.png" alt="" width={260} height={174} sizes="(max-width: 720px) 150px, 260px" />
        <div className={styles.todayTop}><p>{todayWorkout && workoutStatus(todayWorkout) === "completed" ? "ЗАВЪРШЕНО ДНЕС" : "ДНЕШЕН ФОКУС"}</p><time>{dayLabel(today)}</time></div>
        {todayWorkout ? <div className={styles.todayBody}>
          <span>{workoutStartTime(todayWorkout)} · {todayWorkout.workout_type === "cardio" ? "Кардио" : "Силова тренировка"}</span>
          <h2>{todayWorkout.title}</h2>
          <p>{todayWorkout.exercises.length} упражнения · около {todayWorkout.duration_minutes || 45} минути</p>
          {workoutStatus(todayWorkout) === "completed" ? <div className={styles.completeSummary}>{(() => {
            const value = sessionMetrics(todayWorkout);
            return <><span><strong>{todayWorkout.duration_minutes}</strong> минути</span><span><strong>{value.sets}</strong> серии</span><span><strong>{compact(value.volume)}</strong> kg обем</span></>;
          })()}</div> : <div className={styles.heroActions}><button type="button" className={styles.primary} onClick={() => start(todayWorkout)}>Започни тренировка</button><button type="button" onClick={() => changeView("programs")}>Виж програмата</button></div>}
        </div> : <div className={styles.todayBody}>
          <span>Възстановяване и подготовка</span>
          <h2>Днес няма планирана тренировка</h2>
          <p>Остави деня за почивка или избери програма, когато си готов.</p>
          <div className={styles.heroActions}><button type="button" className={styles.primary} onClick={() => changeView("programs")}>Избери програма</button></div>
        </div>}
      </section>

      <nav className={styles.periods} aria-label="Период за статистиката">
        <span>ПЕРИОД</span>
        <div>{PERIODS.map((period) => <button type="button" key={period.short} title={period.label} className={periodDays === period.days ? styles.activePeriod : ""} onClick={() => setPeriodDays(period.days)}>{period.short}</button>)}</div>
      </nav>

      <section className={styles.metricsGrid} aria-label={`Обобщение за ${currentPeriod.label}`}>
        <article><small>ТРЕНИРОВКИ</small><strong>{summary.workouts}</strong><span>за {currentPeriod.label}</span></article>
        <article><small>ВРЕМЕ</small><strong>{duration(summary.minutes)}</strong><span>общо движение</span></article>
        <article><small>ОБЕМ</small><strong>{compact(summary.volume)} kg</strong><span>{summary.sets} изпълнени серии</span></article>
        <article><small>КАРДИО</small><strong>{summary.cardioMinutes} мин</strong><span>{summary.cardioSessions} {summary.cardioSessions === 1 ? "сесия" : "сесии"}</span></article>
      </section>

      <section className={styles.activityCard}>
        <header className={styles.sectionHead}><div><p>ПОСТОЯНСТВО</p><h2>Последните 8 седмици</h2></div><span><i className={styles.dot1}/>1 <i className={styles.dot2}/>2 <i className={styles.dot3}/>3+</span></header>
        <ActivityCalendar sessions={sessions} today={today} onSelect={setSelectedDate}/>
        <div className={styles.dayDetail}><strong>{dayLabel(selectedDate)}</strong>{selectedSessions.length ? selectedSessions.map((session) => <span key={session.id}>{session.title} · {session.duration_minutes} мин · {workoutStatus(session) === "completed" ? "завършена" : "планирана"}</span>) : <span>Няма активност</span>}</div>
      </section>

      <div className={styles.analysisGrid}>
        <section className={styles.analysisCard}>
          <header className={styles.sectionHead}><div><p>СИЛОВ ПРОГРЕС</p><h2>По упражнения</h2></div><span>{progression.length} упражнения</span></header>
          {progression.length ? <div className={styles.progressList}>{progression.slice(0, 6).map((exercise) => <article key={exercise.name}><div><strong>{exercise.name}</strong><span>{exercise.previous} → {exercise.latest}</span></div><b className={(exercise.percent ?? 0) >= 0 ? styles.positive : styles.negative}>{exercise.percent === null ? "–" : `${exercise.percent > 0 ? "+" : ""}${exercise.percent}%`}</b><MiniTrend values={exercise.history}/></article>)}</div> : <div className={styles.empty}><h3>Прогресът започва от първата серия</h3><p>Записвай тежестите и повторенията, за да виждаш реалната промяна.</p><button type="button" onClick={() => changeView("programs")}>Отвори програмите</button></div>}
        </section>

        <section className={styles.analysisCard}>
          <header className={styles.sectionHead}><div><p>МУСКУЛЕН БАЛАНС</p><h2>Разпределение</h2></div><span>{currentPeriod.label}</span></header>
          {totalMuscle ? <div className={styles.muscles}>{MUSCLE_ORDER.map((group) => {
            const percent = Math.round(summary.muscles[group] / totalMuscle * 100);
            return <div key={group}><span><strong>{group}</strong><b>{percent}%</b></span><i><em style={{ width: `${percent}%` }}/></i></div>;
          })}</div> : <div className={styles.empty}><h3>Още няма данни за баланс</h3><p>След завършена силова тренировка тук ще видиш кои групи натоварваш най-много.</p></div>}
        </section>
      </div>

      <section className={styles.coachCard}>
        <span><Icon name="coach"/></span>
        <div><p>PEGAS · ЛИЧЕН COACH</p><h2>{summary.workouts ? "Следи прогреса, не само отделната тренировка" : "Започни спокойно и изгради ритъм"}</h2><small>{summary.workouts ? `За ${currentPeriod.label} имаш ${summary.workouts} тренировки и ${summary.sets} серии. Pegas може да прецени натоварването и следващата стъпка.` : "Pegas може да подреди първата ти седмица спрямо целите, времето и възстановяването."}</small></div>
        <button type="button" onClick={() => window.dispatchEvent(new Event("open-assistant-popup"))}>Попитай Pegas <b>›</b></button>
      </section>
    </> : <WorkoutExperience initialTemplates={initialTemplates} initialHistory={initialHistory} screen={view} />}
  </div>;
}
