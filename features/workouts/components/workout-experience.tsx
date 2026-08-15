"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { deleteWorkout, saveWorkout, toggleWorkout, type WorkoutActionState } from "../actions";
import { WORKOUT_TYPE_LABELS, type WorkoutExercise, type WorkoutSession, type WorkoutType } from "../types";

const initialState: WorkoutActionState = { status: "idle", message: "" };
const workoutTypes = Object.keys(WORKOUT_TYPE_LABELS) as WorkoutType[];
const muscleGroups = ["Крака", "Гърди", "Гръб", "Рамене", "Ръце", "Корем"];

const FULL_BODY_EXERCISES: WorkoutExercise[] = [
  { name: "Leg Press - Лег преса", muscle_group: "Крака", sets: 3, reps: "10–12", weight: 0, rest_seconds: 90 },
  { name: "Seated Leg Curl - Задно бедро", muscle_group: "Крака", sets: 3, reps: "10–12", weight: 0, rest_seconds: 75 },
  { name: "Chest Press - Преса за гърди", muscle_group: "Гърди", sets: 3, reps: "8–12", weight: 0, rest_seconds: 90 },
  { name: "Lat Pulldown - Скрипец пред гърди", muscle_group: "Гръб", sets: 3, reps: "8–12", weight: 0, rest_seconds: 90 },
  { name: "Seated Row - Гребане на машина", muscle_group: "Гръб", sets: 3, reps: "8–12", weight: 0, rest_seconds: 90 },
  { name: "Shoulder Press - Раменна преса", muscle_group: "Рамене", sets: 3, reps: "8–12", weight: 0, rest_seconds: 75 },
  { name: "Lateral Raise Machine - Странично рамо", muscle_group: "Рамене", sets: 3, reps: "12–15", weight: 0, rest_seconds: 60 },
  { name: "Biceps Curl Machine - Бицепс", muscle_group: "Ръце", sets: 2, reps: "10–15", weight: 0, rest_seconds: 60 },
  { name: "Triceps Extension / Press Machine - Трицепс", muscle_group: "Ръце", sets: 2, reps: "10–15", weight: 0, rest_seconds: 60 },
  { name: "Abdominal Crunch Machine - Корем", muscle_group: "Корем", sets: 3, reps: "12–20", weight: 0, rest_seconds: 60 },
];

const FULL_BODY_NOTES = `Оставяй 1–2 повторения в резерв. Последните 2–3 повторения трябва да са трудни, но с чисто изпълнение.

Когато направиш максималните повторения във всички серии, увеличи тежестта с една стъпка.`;

const SCHEDULE = [
  ["Пон", "Full Body"],
  ["Вто", "Почивка / разходка"],
  ["Сря", "Full Body"],
  ["Чет", "Почивка / разходка"],
  ["Пет", "Full Body"],
  ["Съб", "Леко кардио"],
  ["Нед", "Почивка"],
] as const;

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
}

function numericReps(value: WorkoutExercise["reps"]) {
  const match = String(value).match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : 0;
}

function exerciseVolume(exercise: WorkoutExercise) {
  return exercise.sets * numericReps(exercise.reps) * exercise.weight;
}

function workoutVolume(session: WorkoutSession) {
  return session.exercises.reduce((sum, exercise) => sum + exerciseVolume(exercise), 0);
}

function initialExercises(session: WorkoutSession | null, preset: boolean) {
  const source = session?.exercises ?? (preset ? FULL_BODY_EXERCISES : []);
  return source.map((exercise) => ({
    ...exercise,
    reps: String(exercise.reps),
    rest_seconds: exercise.rest_seconds ?? 0,
    muscle_group: exercise.muscle_group ?? "",
  }));
}

function WorkoutForm({ date, session, preset, onClose }: { date: string; session: WorkoutSession | null; preset: boolean; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveWorkout, initialState);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(() => initialExercises(session, preset));

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
      const timer = setTimeout(onClose, 350);
      return () => clearTimeout(timer);
    }
  }, [state, router, onClose]);

  function updateExercise(index: number, field: keyof WorkoutExercise, raw: string) {
    const textFields: (keyof WorkoutExercise)[] = ["name", "reps", "muscle_group"];
    setExercises((items) => items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: textFields.includes(field) ? raw : Number(raw) } : item,
    ));
  }

  return <div className="quick-add-backdrop workout-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="quick-add-sheet workout-sheet" role="dialog" aria-modal="true" aria-labelledby="workout-form-title">
      <header>
        <div><p className="life-kicker">{preset ? "Full Body шаблон" : "Дневник на движението"}</p><h2 id="workout-form-title">{session ? "Редактирай тренировката" : preset ? "Full Body - Цяло тяло" : "Нова тренировка"}</h2></div>
        <button type="button" aria-label="Затвори" onClick={onClose}>×</button>
      </header>
      <form action={action} className="quick-form workout-form">
        <input type="hidden" name="id" value={session?.id ?? ""} />
        <input type="hidden" name="workoutDate" value={date} />
        <input type="hidden" name="exercises" value={JSON.stringify(exercises)} />
        <label><span>Име</span><input name="title" autoFocus={!preset} required maxLength={160} defaultValue={session?.title ?? (preset ? "Full Body - Цяло тяло" : "")} placeholder="Напр. Силова тренировка" /></label>
        <div className="quick-form-row">
          <label><span>Вид</span><select name="workoutType" defaultValue={session?.workout_type ?? "strength"}>{workoutTypes.map((type) => <option key={type} value={type}>{WORKOUT_TYPE_LABELS[type]}</option>)}</select></label>
          <label><span>Продължителност (мин)</span><input name="durationMinutes" type="number" min="0" max="1440" required defaultValue={session?.duration_minutes ?? (preset ? 60 : 45)} /></label>
        </div>
        <label><span>Изгорени калории</span><input name="caloriesBurned" type="number" min="0" required defaultValue={session?.calories_burned ?? 0} /></label>
        <fieldset className="workout-exercise-builder">
          <legend>Упражнения</legend>
          <div className="workout-exercise-columns" aria-hidden="true"><span>Група</span><span>Упражнение</span><span>Серии</span><span>Повторения</span><span>Кг</span><span>Почивка</span><span /></div>
          {exercises.map((exercise, index) => <div className="workout-exercise-row" key={index}>
            <select aria-label={`Мускулна група ${index + 1}`} value={exercise.muscle_group ?? ""} onChange={(event) => updateExercise(index, "muscle_group", event.target.value)}>
              <option value="">Група</option>
              {muscleGroups.map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
            <input aria-label={`Упражнение ${index + 1}`} value={exercise.name} onChange={(event) => updateExercise(index, "name", event.target.value)} placeholder="Упражнение" />
            <input aria-label={`Серии ${index + 1}`} type="number" min="0" value={exercise.sets} onChange={(event) => updateExercise(index, "sets", event.target.value)} placeholder="Серии" />
            <input aria-label={`Повторения ${index + 1}`} value={String(exercise.reps)} onChange={(event) => updateExercise(index, "reps", event.target.value)} placeholder="8–12" />
            <input aria-label={`Тежест ${index + 1}`} type="number" min="0" step="0.1" value={exercise.weight || ""} onChange={(event) => updateExercise(index, "weight", event.target.value)} placeholder="Кг" />
            <input aria-label={`Почивка в секунди ${index + 1}`} type="number" min="0" step="5" value={exercise.rest_seconds || ""} onChange={(event) => updateExercise(index, "rest_seconds", event.target.value)} placeholder="Сек." />
            <button type="button" aria-label={`Премахни упражнение ${index + 1}`} onClick={() => setExercises((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button>
          </div>)}
          <button className="workout-add-exercise" type="button" onClick={() => setExercises((items) => [...items, { name: "", muscle_group: "", sets: 3, reps: "10", weight: 0, rest_seconds: 60 }])}>＋ Добави упражнение</button>
        </fieldset>
        <label><span>Бележки и прогресия</span><textarea name="notes" rows={5} maxLength={3000} defaultValue={session?.notes ?? (preset ? FULL_BODY_NOTES : "")} placeholder="Как се чувстваше?" /></label>
        <label className="inline-check"><input name="completed" type="checkbox" defaultChecked={session?.completed ?? false} /> Тренировката е завършена</label>
        <button className="primary-button" disabled={pending}>{pending ? "Запазване…" : "Запази тренировката"}</button>
        <p className={`form-message ${state.status}`} aria-live="polite">{state.message}</p>
      </form>
    </section>
  </div>;
}

function FullBodyProgram({ onUse }: { onUse: () => void }) {
  return <section className="full-body-program">
    <header>
      <div><p className="life-kicker">Моят тренировъчен план</p><h2>Full Body <span>Цяло тяло</span></h2><p>Три балансирани тренировки седмично с фокус върху чисто изпълнение и постепенен прогрес.</p></div>
      <div className="full-body-program-meta"><span><b>3×</b> седмично</span><span><b>~60</b> минути</span><button type="button" onClick={onUse}>＋ Добави за този ден</button></div>
    </header>
    <div className="full-body-schedule">
      {SCHEDULE.map(([day, activity]) => <div className={activity === "Full Body" ? "is-training" : ""} key={day}><b>{day}</b><span>{activity}</span></div>)}
    </div>
    <details className="full-body-details">
      <summary><span>Виж всички 10 упражнения</span><b>⌄</b></summary>
      <div className="full-body-exercise-grid">
        {FULL_BODY_EXERCISES.map((exercise, index) => <article key={exercise.name}>
          <span className="full-body-number">{String(index + 1).padStart(2, "0")}</span>
          <div><small>{exercise.muscle_group}</small><strong>{exercise.name}</strong><p>{exercise.sets} серии × {exercise.reps} повторения <i>·</i> Почивка {exercise.rest_seconds} сек.</p></div>
        </article>)}
      </div>
    </details>
    <aside className="full-body-progression"><span>↗</span><div><strong>Как прогресираш</strong><p>Оставяй 1–2 повторения в резерв. Когато направиш максималните повторения във всички серии с чиста техника, увеличи тежестта с една стъпка.</p></div></aside>
  </section>;
}

export function WorkoutExperience({ date, today, sessions }: { date: string; today: string; sessions: WorkoutSession[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<WorkoutSession | "new" | "full-body" | null>(null);
  const minutes = sessions.reduce((sum, item) => sum + item.duration_minutes, 0);
  const calories = sessions.reduce((sum, item) => sum + item.calories_burned, 0);
  const completedCount = sessions.filter((item) => item.completed).length;
  const volume = sessions.reduce((total, session) => total + workoutVolume(session), 0);

  async function remove(session: WorkoutSession) {
    if (!window.confirm(`Да изтрия ли „${session.title}“?`)) return;
    await deleteWorkout(session.id);
    router.refresh();
  }

  async function toggle(session: WorkoutSession) {
    await toggleWorkout(session.id, !session.completed);
    router.refresh();
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

    <FullBodyProgram onUse={() => setEditor("full-body")} />

    <section className="workout-summary">
      <article><span>Време</span><strong>{minutes}<small> мин</small></strong></article>
      <article><span>Калории</span><strong>{calories}<small> kcal</small></strong></article>
      <article><span>Обем</span><strong>{Math.round(volume).toLocaleString("bg-BG")}<small> кг</small></strong></article>
      <article><span>Изпълнени</span><strong>{completedCount}<small> / {sessions.length}</small></strong></article>
      <button className="primary-button" type="button" onClick={() => setEditor("new")}><span>＋</span> Добави друга</button>
    </section>

    {sessions.length ? <section className="workout-list">{sessions.map((session) => <article className={`workout-card ${session.completed ? "completed" : ""}`} key={session.id}>
      <header><div><span className={`workout-type type-${session.workout_type}`}>{WORKOUT_TYPE_LABELS[session.workout_type]}</span><h2>{session.title}</h2></div><button className="workout-complete" type="button" aria-label={session.completed ? "Маркирай като незавършена" : "Маркирай като завършена"} onClick={() => toggle(session)}>{session.completed ? "✓" : "○"}</button></header>
      <div className="workout-card-stats"><span><b>{session.duration_minutes}</b> минути</span><span><b>{session.calories_burned}</b> kcal</span><span><b>{session.exercises.length}</b> упражнения</span><span><b>{Math.round(workoutVolume(session)).toLocaleString("bg-BG")}</b> кг обем</span></div>
      {session.exercises.length ? <div className="workout-exercises">{session.exercises.map((exercise, index) => <div key={`${exercise.name}-${index}`}><strong>{exercise.muscle_group ? <small>{exercise.muscle_group}</small> : null}{exercise.name}</strong><span>{exercise.sets} × {exercise.reps}{exercise.weight ? ` · ${exercise.weight} кг` : ""}{exercise.rest_seconds ? ` · ${exercise.rest_seconds} сек.` : ""}</span></div>)}</div> : <p className="workout-no-exercises">Няма добавени упражнения.</p>}
      {session.notes ? <p className="workout-notes">{session.notes}</p> : null}
      <footer><button type="button" onClick={() => setEditor(session)}>Редактирай</button><button type="button" onClick={() => remove(session)}>Изтрий</button></footer>
    </article>)}</section> : <section className="workout-empty"><p className="life-kicker">Тренировка за деня</p><h2>Готов ли си за Full Body?</h2><p>Зареди готовия план с всички серии, повторения и почивки. Остава само да въведеш използваните тежести.</p><button className="primary-button" type="button" onClick={() => setEditor("full-body")}><span>＋</span> Зареди Full Body</button></section>}

    {editor ? <WorkoutForm date={date} session={editor === "new" || editor === "full-body" ? null : editor} preset={editor === "full-body"} onClose={() => setEditor(null)} /> : null}
  </>;
}
