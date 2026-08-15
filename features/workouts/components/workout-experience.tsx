"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteWorkout, saveWorkout, toggleWorkout, type WorkoutActionState } from "../actions";
import { WORKOUT_TYPE_LABELS, type WorkoutExercise, type WorkoutSession, type WorkoutType } from "../types";

const initialState: WorkoutActionState = { status: "idle", message: "" };
const workoutTypes = Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[];

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
}

function WorkoutForm({ date, session, onClose }: { date: string; session: WorkoutSession | null; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveWorkout, initialState);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(session?.exercises ?? []);
  useEffect(() => { if (state.status === "success") { router.refresh(); const timer = setTimeout(onClose, 350); return () => clearTimeout(timer); } }, [state, router, onClose]);

  function updateExercise(index: number, field: keyof WorkoutExercise, raw: string) {
    setExercises((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: field === "name" ? raw : Number(raw) } : item));
  }

  return <div className="quick-add-backdrop workout-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="quick-add-sheet workout-sheet" role="dialog" aria-modal="true" aria-labelledby="workout-form-title">
      <header><div><p className="life-kicker">Дневник на движението</p><h2 id="workout-form-title">{session ? "Редактирай тренировката" : "Нова тренировка"}</h2></div><button type="button" aria-label="Затвори" onClick={onClose}>×</button></header>
      <form action={action} className="quick-form workout-form">
        <input type="hidden" name="id" value={session?.id ?? ""} /><input type="hidden" name="workoutDate" value={date} /><input type="hidden" name="exercises" value={JSON.stringify(exercises)} />
        <label><span>Име</span><input name="title" autoFocus required maxLength={160} defaultValue={session?.title ?? ""} placeholder="Напр. Силова тренировка" /></label>
        <div className="quick-form-row"><label><span>Вид</span><select name="workoutType" defaultValue={session?.workout_type ?? "strength"}>{workoutTypes.map((type) => <option key={type} value={type}>{WORKOUT_TYPE_LABELS[type]}</option>)}</select></label><label><span>Продължителност (мин)</span><input name="durationMinutes" type="number" min="0" max="1440" required defaultValue={session?.duration_minutes ?? 45} /></label></div>
        <label><span>Изгорени калории</span><input name="caloriesBurned" type="number" min="0" required defaultValue={session?.calories_burned ?? 0} /></label>
        <fieldset className="workout-exercise-builder"><legend>Упражнения</legend>
          {exercises.map((exercise, index) => <div className="workout-exercise-row" key={index}>
            <input aria-label={`Упражнение ${index + 1}`} value={exercise.name} onChange={(event) => updateExercise(index, "name", event.target.value)} placeholder="Упражнение" />
            <input aria-label={`Серии ${index + 1}`} type="number" min="0" value={exercise.sets} onChange={(event) => updateExercise(index, "sets", event.target.value)} placeholder="Серии" />
            <input aria-label={`Повторения ${index + 1}`} type="number" min="0" value={exercise.reps} onChange={(event) => updateExercise(index, "reps", event.target.value)} placeholder="Повт." />
            <input aria-label={`Тежест ${index + 1}`} type="number" min="0" step="0.1" value={exercise.weight} onChange={(event) => updateExercise(index, "weight", event.target.value)} placeholder="Кг" />
            <button type="button" aria-label={`Премахни упражнение ${index + 1}`} onClick={() => setExercises((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button>
          </div>)}
          <button className="workout-add-exercise" type="button" onClick={() => setExercises((items) => [...items, { name: "", sets: 3, reps: 10, weight: 0 }])}>+ Добави упражнение</button>
        </fieldset>
        <label><span>Бележки</span><textarea name="notes" rows={3} maxLength={3000} defaultValue={session?.notes ?? ""} placeholder="Как се чувстваше?" /></label>
        <label className="inline-check"><input name="completed" type="checkbox" defaultChecked={session?.completed ?? true} /> Тренировката е завършена</label>
        <button className="primary-button" disabled={pending}>{pending ? "Запазване…" : "Запази тренировката"}</button><p className={`form-message ${state.status}`} aria-live="polite">{state.message}</p>
      </form>
    </section>
  </div>;
}

export function WorkoutExperience({ date, today, sessions }: { date: string; today: string; sessions: WorkoutSession[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<WorkoutSession | "new" | null>(null);
  const minutes = sessions.reduce((sum, item) => sum + item.duration_minutes, 0);
  const calories = sessions.reduce((sum, item) => sum + item.calories_burned, 0);
  const exerciseCount = sessions.reduce((sum, item) => sum + item.exercises.length, 0);
  const completedCount = sessions.filter((item) => item.completed).length;
  const volume = sessions.reduce((total, session) => total + session.exercises.reduce((sum, exercise) => sum + exercise.sets * exercise.reps * exercise.weight, 0), 0);

  async function remove(session: WorkoutSession) {
    if (!window.confirm(`Да изтрия ли „${session.title}“?`)) return;
    await deleteWorkout(session.id); router.refresh();
  }

  async function toggle(session: WorkoutSession) {
    await toggleWorkout(session.id, !session.completed); router.refresh();
  }

  return <>
    <header className="workout-header">
      <div>
        <p className="life-kicker">Движение и сила</p>
        <h1>Тренировки</h1>
        <p><strong>{date === today ? "Днес" : formatDate(date)}</strong>{sessions.length ? ` · ${sessions.length} ${sessions.length === 1 ? "тренировка" : "тренировки"}` : " · Денят е готов за движение."}</p>
      </div>
      <div className="nutrition-date-controls workout-date-controls">
        <Link href={`/workouts?date=${shiftDate(date, -1)}`} aria-label="Предишен ден">←</Link>
        <Link href="/workouts">Днес</Link>
        <Link href={`/workouts?date=${shiftDate(date, 1)}`} aria-label="Следващ ден">→</Link>
      </div>
    </header>
    <section className="workout-summary">
      <article><span>Време</span><strong>{minutes}<small> мин</small></strong></article>
      <article><span>Калории</span><strong>{calories}<small> kcal</small></strong></article>
      <article><span>Обем</span><strong>{Math.round(volume).toLocaleString("bg-BG")}<small> кг</small></strong></article>
      <article><span>Изпълнени</span><strong>{completedCount}<small> / {sessions.length}</small></strong></article>
      <button className="primary-button" type="button" onClick={() => setEditor("new")}><span>＋</span> Добави тренировка</button>
    </section>
    {sessions.length ? <section className="workout-list">{sessions.map((session) => <article className={`workout-card ${session.completed ? "completed" : ""}`} key={session.id}>
      <header><div><span className={`workout-type type-${session.workout_type}`}>{WORKOUT_TYPE_LABELS[session.workout_type]}</span><h2>{session.title}</h2></div><button className="workout-complete" type="button" aria-label={session.completed ? "Маркирай като незавършена" : "Маркирай като завършена"} onClick={() => toggle(session)}>{session.completed ? "✓" : "○"}</button></header>
      <div className="workout-card-stats"><span><b>{session.duration_minutes}</b> минути</span><span><b>{session.calories_burned}</b> kcal</span><span><b>{session.exercises.length}</b> упражнения</span><span><b>{Math.round(session.exercises.reduce((sum, exercise) => sum + exercise.sets * exercise.reps * exercise.weight, 0)).toLocaleString("bg-BG")}</b> кг обем</span></div>
      {session.exercises.length ? <div className="workout-exercises">{session.exercises.map((exercise, index) => <div key={`${exercise.name}-${index}`}><strong>{exercise.name}</strong><span>{exercise.sets} × {exercise.reps}{exercise.weight ? ` · ${exercise.weight} кг` : ""}</span></div>)}</div> : <p className="workout-no-exercises">Няма добавени упражнения.</p>}
      {session.notes ? <p className="workout-notes">{session.notes}</p> : null}<footer><button type="button" onClick={() => setEditor(session)}>Редактирай</button><button type="button" onClick={() => remove(session)}>Изтрий</button></footer>
    </article>)}</section> : <section className="workout-empty"><p className="life-kicker">Първа крачка</p><h2>Запиши движението си.</h2><p>Добави тренировка, упражненията и тежестите. След време ще виждаш реалния си напредък.</p><button className="primary-button" type="button" onClick={() => setEditor("new")}><span>＋</span> Добави тренировка</button></section>}
    {editor ? <WorkoutForm date={date} session={editor === "new" ? null : editor} onClose={() => setEditor(null)} /> : null}
  </>;
}
