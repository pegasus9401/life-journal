"use client";

import { useMemo, useState } from "react";
import { START_WORKOUT_EVENT, type StartWorkoutDetail } from "./active-workout-tracker";
import { fitnessSummary, MUSCLE_ORDER, sessionMetrics, strengthProgression, workoutStartTime, workoutStatus } from "../domain/fitness-analytics";
import type { WorkoutSession } from "../types";
import styles from "./fitness-dashboard.module.css";

const PERIODS = [{ label: "7D", days: 7 }, { label: "30D", days: 30 }, { label: "3M", days: 90 }, { label: "6M", days: 183 }, { label: "1Y", days: 365 }] as const;

const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const minusDays = (date: string, days: number) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() - days + 1); return isoDate(value); };
const duration = (minutes: number) => minutes < 60 ? `${minutes} мин` : `${Math.floor(minutes / 60)} ч ${minutes % 60 ? `${minutes % 60} мин` : ""}`.trim();
const compact = (value: number) => new Intl.NumberFormat("bg-BG", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(Math.round(value));

function MiniTrend({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1); const min = Math.min(...values); const span = Math.max(1, max - min);
  const points = values.map((value, index) => `${index / (values.length - 1) * 100},${34 - (value - min) / span * 30}`).join(" ");
  return <svg className={styles.trend} viewBox="0 0 100 38" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} /></svg>;
}

function ActivityCalendar({ sessions, today, onSelect }: { sessions: WorkoutSession[]; today: string; onSelect: (date: string) => void }) {
  const days = Array.from({ length: 56 }, (_, index) => { const date = new Date(`${today}T12:00:00`); date.setDate(date.getDate() - 55 + index); return isoDate(date); });
  const counts = new Map<string, number>();
  for (const session of sessions) counts.set(session.workout_date, (counts.get(session.workout_date) ?? 0) + 1);
  return <div className={styles.activityGrid}>{days.map((date) => { const count = counts.get(date) ?? 0; return <button key={date} type="button" className={styles[`level${Math.min(3, count)}`]} title={`${date}: ${count} активности`} aria-label={`${date}: ${count} активности`} onClick={() => onSelect(date)} />; })}</div>;
}

export function FitnessDashboard({ sessions, today }: { sessions: WorkoutSession[]; today: string }) {
  const [periodDays, setPeriodDays] = useState(30);
  const [selectedDate, setSelectedDate] = useState(today);
  const rangeSessions = useMemo(() => sessions.filter((session) => session.workout_date >= minusDays(today, periodDays) && session.workout_date <= today), [sessions, today, periodDays]);
  const summary = useMemo(() => fitnessSummary(rangeSessions), [rangeSessions]);
  const progression = useMemo(() => strengthProgression(rangeSessions), [rangeSessions]);
  const selectedSessions = sessions.filter((session) => session.workout_date === selectedDate);
  const todayWorkout = sessions.find((session) => session.workout_date === today && workoutStatus(session) !== "cancelled" && workoutStatus(session) !== "skipped");
  const totalMuscle = MUSCLE_ORDER.reduce((sum, group) => sum + summary.muscles[group], 0);

  const start = (session: WorkoutSession) => {
    const detail: StartWorkoutDetail = {
      id: session.workout_template_id ?? session.id,
      sessionId: session.id,
      name: session.title,
      exercises: session.exercises.map((exercise, index) => ({ id: `${session.id}:${index}`, group: exercise.muscle_group || "Друго", name: exercise.name, sets: exercise.sets, reps: String(exercise.reps), restSeconds: exercise.rest_seconds ?? 60 })),
    };
    window.dispatchEvent(new CustomEvent(START_WORKOUT_EVENT, { detail }));
  };

  return <section className={styles.dashboard}>
    <header className={styles.hero}><div><p>FITNESS</p><h1>Тренировъчен център</h1><span>Една тренировка · всички изгледи</span></div><a href="#workout-templates" aria-label="Добави тренировъчна програма">＋</a></header>

    <section className={styles.todayCard}>
      <p>{todayWorkout && workoutStatus(todayWorkout) === "completed" ? "ТРЕНИРОВКАТА Е ЗАВЪРШЕНА" : "ДНЕС"}</p>
      {todayWorkout ? <><div className={styles.todayTitle}><div><h2>{todayWorkout.title}</h2><span>{todayWorkout.exercises.length} упражнения · ~{todayWorkout.duration_minutes || 45} мин</span></div><em>{workoutStartTime(todayWorkout)}</em></div>
        {workoutStatus(todayWorkout) === "completed" ? <div className={styles.completeSummary}>{(() => { const value = sessionMetrics(todayWorkout); return <><strong>{todayWorkout.duration_minutes} мин</strong><strong>{value.sets} серии</strong><strong>{compact(value.volume)} kg обем</strong></>; })()}</div> : <button type="button" className={styles.primary} onClick={() => start(todayWorkout)}>Започни тренировка</button>}
      </> : <div className={styles.empty}><h2>Днес няма планирана тренировка</h2><p>Избери програма, създай нова или остави деня за възстановяване.</p><div><a href="#workout-templates">Избери тренировка</a><a href="#workout-templates">Създай</a><button type="button">Почивен ден</button></div></div>}
    </section>

    <section className={styles.card}>
      <div className={styles.cardHead}><div><p>АКТИВНОСТ</p><h2>Последните 8 седмици</h2></div><span><i className={styles.dot1}/>1 <i className={styles.dot2}/>2 <i className={styles.dot3}/>3+</span></div>
      <ActivityCalendar sessions={sessions} today={today} onSelect={setSelectedDate}/>
      <div className={styles.dayDetail}><strong>{new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long" }).format(new Date(`${selectedDate}T12:00:00`))}</strong>{selectedSessions.length ? selectedSessions.map((session) => <span key={session.id}>{session.workout_type === "cardio" ? "Кардио" : session.title} · {session.duration_minutes} мин · {workoutStatus(session)}</span>) : <span>Няма активност</span>}</div>
    </section>

    <nav className={styles.periods} aria-label="Период за Fitness статистика">{PERIODS.map((period) => <button type="button" key={period.label} className={periodDays === period.days ? styles.active : ""} onClick={() => setPeriodDays(period.days)}>{period.label}</button>)}</nav>

    <section className={styles.summaryGrid}>
      <article className={styles.card}><p>ОБОБЩЕНИЕ</p><h2>{summary.workouts} тренировки</h2><div className={styles.metrics}><span><strong>{duration(summary.minutes)}</strong>време</span><span><strong>{compact(summary.volume)} kg</strong>обем</span><span><strong>{summary.sets}</strong>серии</span></div><MiniTrend values={rangeSessions.toSorted((a,b) => a.workout_date.localeCompare(b.workout_date)).map((session) => sessionMetrics(session).volume)} /></article>
      <article className={styles.card}><p>КАРДИО</p>{summary.cardioSessions ? <><h2>{summary.cardioSessions} сесии</h2><strong className={styles.bigMetric}>{summary.cardioMinutes} мин</strong><span>за избрания период</span></> : <div className={styles.smallEmpty}><h2>Все още няма cardio данни</h2><p>Завърши cardio тренировка, за да започне проследяването.</p></div>}</article>
    </section>

    <section className={styles.card}>
      <div className={styles.cardHead}><div><p>СИЛОВ ПРОГРЕС</p><h2>По упражнения</h2></div><span>{progression.length} упражнения</span></div>
      {progression.length ? <div className={styles.progressList}>{progression.slice(0, 6).map((exercise) => <article key={exercise.name}><div><strong>{exercise.name}</strong><span>{exercise.previous} → {exercise.latest}</span></div><b className={(exercise.percent ?? 0) >= 0 ? styles.positive : styles.negative}>{exercise.percent === null ? "—" : `${exercise.percent > 0 ? "+" : ""}${exercise.percent}%`}</b><MiniTrend values={exercise.history}/></article>)}</div> : <div className={styles.smallEmpty}><h2>Все още няма силови данни</h2><p>Завърши първата си тренировка със серии, тежести и повторения.</p></div>}
    </section>

    <section className={styles.card}>
      <div className={styles.cardHead}><div><p>МУСКУЛЕН БАЛАНС</p><h2>Разпределение на обема</h2></div><span>{periodDays} дни</span></div>
      {totalMuscle ? <div className={styles.muscles}>{MUSCLE_ORDER.map((group) => { const percent = Math.round(summary.muscles[group] / totalMuscle * 100); return <div key={group}><span><strong>{group}</strong><b>{percent}%</b></span><i><em style={{ width: `${percent}%` }}/></i></div>; })}</div> : <div className={styles.smallEmpty}><h2>Няма достатъчно данни за баланс</h2><p>Мускулното разпределение ще се появи след записани силови тренировки.</p></div>}
    </section>
  </section>;
}
