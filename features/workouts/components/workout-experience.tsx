"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { START_WORKOUT_EVENT, type StartWorkoutDetail } from "./active-workout-tracker";

const DAYS = [
  { key: "monday", short: "Пон", label: "Понеделник" },
  { key: "tuesday", short: "Вто", label: "Вторник" },
  { key: "wednesday", short: "Сря", label: "Сряда" },
  { key: "thursday", short: "Чет", label: "Четвъртък" },
  { key: "friday", short: "Пет", label: "Петък" },
  { key: "saturday", short: "Съб", label: "Събота" },
  { key: "sunday", short: "Нед", label: "Неделя" },
] as const;

const MUSCLE_GROUPS = ["Крака", "Гърди", "Гръб", "Рамене", "Ръце", "Корем", "Кардио", "Друго"] as const;

type DayKey = (typeof DAYS)[number]["key"];

type ExerciseTemplate = {
  id: string;
  group: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
};

type WorkoutTemplate = {
  id: string;
  name: string;
  durationMinutes: number;
  days: DayKey[];
  progression: string;
  exercises: ExerciseTemplate[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

const FULL_BODY: WorkoutTemplate = {
  id: "full-body",
  name: "Full Body - Цяло тяло",
  durationMinutes: 60,
  days: ["monday", "wednesday", "friday"],
  progression: "Оставяй 1–2 повторения в резерв. Последните 2–3 повторения трябва да са трудни, но с чисто изпълнение. Когато направиш максималните повторения във всички серии, увеличи тежестта с една стъпка.",
  exercises: [
    { id: "full-body-1", group: "Крака", name: "Leg Press - Лег преса", sets: 3, reps: "10–12", restSeconds: 90 },
    { id: "full-body-2", group: "Крака", name: "Seated Leg Curl - Задно бедро", sets: 3, reps: "10–12", restSeconds: 75 },
    { id: "full-body-3", group: "Гърди", name: "Chest Press - Преса за гърди", sets: 3, reps: "8–12", restSeconds: 90 },
    { id: "full-body-4", group: "Гръб", name: "Lat Pulldown - Скрипец пред гърди", sets: 3, reps: "8–12", restSeconds: 90 },
    { id: "full-body-5", group: "Гръб", name: "Seated Row - Гребане на машина", sets: 3, reps: "8–12", restSeconds: 90 },
    { id: "full-body-6", group: "Рамене", name: "Shoulder Press - Раменна преса", sets: 3, reps: "8–12", restSeconds: 75 },
    { id: "full-body-7", group: "Рамене", name: "Lateral Raise Machine - Странично рамо", sets: 3, reps: "12–15", restSeconds: 60 },
    { id: "full-body-8", group: "Ръце", name: "Biceps Curl Machine - Бицепс", sets: 2, reps: "10–15", restSeconds: 60 },
    { id: "full-body-9", group: "Ръце", name: "Triceps Extension / Press Machine - Трицепс", sets: 2, reps: "10–15", restSeconds: 60 },
    { id: "full-body-10", group: "Корем", name: "Abdominal Crunch Machine - Корем", sets: 3, reps: "12–20", restSeconds: 60 },
  ],
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function blankTemplate(): WorkoutTemplate {
  return {
    id: makeId("workout"),
    name: "Нова тренировка",
    durationMinutes: 60,
    days: [],
    progression: "",
    exercises: [
      { id: makeId("exercise"), group: "Друго", name: "", sets: 3, reps: "8–12", restSeconds: 60 },
    ],
  };
}

function normalizeTemplates(raw: unknown): WorkoutTemplate[] {
  if (!Array.isArray(raw)) return [FULL_BODY];

  const templates = raw.flatMap((item, templateIndex) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    const validDays = Array.isArray(value.days)
      ? value.days.filter((day): day is DayKey => DAYS.some((option) => option.key === day))
      : [];
    const exercises = Array.isArray(value.exercises)
      ? value.exercises.flatMap((exercise, exerciseIndex) => {
          if (!exercise || typeof exercise !== "object") return [];
          const entry = exercise as Record<string, unknown>;
          return [{
            id: typeof entry.id === "string" ? entry.id : `exercise-${templateIndex}-${exerciseIndex}`,
            group: typeof entry.group === "string" ? entry.group : "Друго",
            name: typeof entry.name === "string" ? entry.name : "",
            sets: Math.max(1, Number(entry.sets) || 1),
            reps: typeof entry.reps === "string" ? entry.reps : String(entry.reps ?? "8–12"),
            restSeconds: Math.max(0, Number(entry.restSeconds) || 0),
          }];
        })
      : [];

    return [{
      id: typeof value.id === "string" ? value.id : `workout-${templateIndex}`,
      name: typeof value.name === "string" ? value.name : "Тренировка",
      durationMinutes: Math.max(0, Number(value.durationMinutes) || 0),
      days: validDays,
      progression: typeof value.progression === "string" ? value.progression : "",
      exercises,
    }];
  });

  return templates;
}

function cloneTemplate(template: WorkoutTemplate): WorkoutTemplate {
  return { ...template, days: [...template.days], exercises: template.exercises.map((exercise) => ({ ...exercise })) };
}

function TemplateEditor({ template, onCancel, onSave }: { template: WorkoutTemplate; onCancel: () => void; onSave: (template: WorkoutTemplate) => Promise<void> }) {
  const [draft, setDraft] = useState(() => cloneTemplate(template));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateExercise = (id: string, patch: Partial<ExerciseTemplate>) => {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) => exercise.id === id ? { ...exercise, ...patch } : exercise),
    }));
  };

  const toggleDay = (day: DayKey) => {
    setDraft((current) => ({
      ...current,
      days: current.days.includes(day) ? current.days.filter((value) => value !== day) : [...current.days, day],
    }));
  };

  const save = async () => {
    if (!draft.name.trim()) {
      setError("Добави име на тренировката.");
      return;
    }
    if (draft.exercises.some((exercise) => !exercise.name.trim())) {
      setError("Всяко упражнение трябва да има име.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ ...draft, name: draft.name.trim(), exercises: draft.exercises.map((exercise) => ({ ...exercise, name: exercise.name.trim() })) });
    } catch {
      setError("Промените не се запазиха. Опитай отново.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="workout-library-editor">
    <header>
      <div><p className="life-kicker">Редактиране</p><h2>{draft.name}</h2></div>
      <button type="button" onClick={onCancel}>Отказ</button>
    </header>

    <div className="workout-library-editor-basics">
      <label><span>Име на тренировката</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
      <label><span>Продължителност</span><div><input type="number" min="0" value={draft.durationMinutes || ""} onChange={(event) => setDraft((current) => ({ ...current, durationMinutes: Math.max(0, Number(event.target.value) || 0) }))} /><b>минути</b></div></label>
    </div>

    <fieldset className="workout-library-days">
      <legend>Дни за тренировка</legend>
      <div>{DAYS.map((day) => <button className={draft.days.includes(day.key) ? "active" : ""} key={day.key} type="button" onClick={() => toggleDay(day.key)}><b>{day.short}</b><span>{day.label}</span></button>)}</div>
    </fieldset>

    <div className="workout-library-exercise-editor">
      <header><div><strong>Упражнения</strong><span>{draft.exercises.length} общо</span></div><button type="button" onClick={() => setDraft((current) => ({ ...current, exercises: [...current.exercises, { id: makeId("exercise"), group: "Друго", name: "", sets: 3, reps: "8–12", restSeconds: 60 }] }))}>＋ Добави упражнение</button></header>
      <div className="workout-library-editor-labels" aria-hidden="true"><span>Група</span><span>Упражнение</span><span>Серии</span><span>Повторения</span><span>Почивка</span><span /></div>
      {draft.exercises.map((exercise, index) => <div className="workout-library-exercise-row" key={exercise.id}>
        <span className="workout-library-row-number">{index + 1}</span>
        <select aria-label={`Мускулна група за упражнение ${index + 1}`} value={exercise.group} onChange={(event) => updateExercise(exercise.id, { group: event.target.value })}>{MUSCLE_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}</select>
        <input aria-label={`Име на упражнение ${index + 1}`} value={exercise.name} onChange={(event) => updateExercise(exercise.id, { name: event.target.value })} placeholder="Име на упражнението" />
        <input aria-label={`Серии за упражнение ${index + 1}`} type="number" min="1" value={exercise.sets} onChange={(event) => updateExercise(exercise.id, { sets: Math.max(1, Number(event.target.value) || 1) })} />
        <input aria-label={`Повторения за упражнение ${index + 1}`} value={exercise.reps} onChange={(event) => updateExercise(exercise.id, { reps: event.target.value })} placeholder="8–12" />
        <div className="workout-library-rest-input"><input aria-label={`Почивка за упражнение ${index + 1}`} type="number" min="0" step="5" value={exercise.restSeconds || ""} onChange={(event) => updateExercise(exercise.id, { restSeconds: Math.max(0, Number(event.target.value) || 0) })} /><b>сек.</b></div>
        <button type="button" aria-label={`Премахни упражнение ${index + 1}`} onClick={() => setDraft((current) => ({ ...current, exercises: current.exercises.filter((item) => item.id !== exercise.id) }))}>×</button>
      </div>)}
    </div>

    <label className="workout-library-progression-editor"><span>Правило за прогресия</span><textarea rows={4} value={draft.progression} onChange={(event) => setDraft((current) => ({ ...current, progression: event.target.value }))} placeholder="Опиши кога се увеличават повторенията или тежестта." /></label>
    {error ? <p className="workout-library-message is-error">{error}</p> : null}
    <button className="workout-library-save" type="button" onClick={save} disabled={saving}>{saving ? "Запазване…" : "Запази тренировката"}</button>
  </section>;
}

function TemplateView({ template, onStart, onEdit, onDelete }: { template: WorkoutTemplate; onStart: () => void; onEdit: () => void; onDelete: () => void }) {
  const groups = MUSCLE_GROUPS.flatMap((group) => {
    const exercises = template.exercises.filter((exercise) => exercise.group === group);
    return exercises.length ? [{ group, exercises }] : [];
  });
  const uncategorized = template.exercises.filter((exercise) => !MUSCLE_GROUPS.includes(exercise.group as (typeof MUSCLE_GROUPS)[number]));
  if (uncategorized.length) groups.push({ group: "Друго", exercises: uncategorized });

  return <section className="workout-library-view">
    <header>
      <div><p className="life-kicker">Тренировъчна програма</p><h2>{template.name}</h2><p>{template.days.length ? `${template.days.length} пъти седмично` : "Без избрани дни"} · около {template.durationMinutes} минути</p></div>
      <div><button className="start" type="button" onClick={onStart}>▶ Започни тренировка</button><button type="button" onClick={onEdit}>Редактирай</button><button className="danger" type="button" onClick={onDelete}>Изтрий</button></div>
    </header>

    <div className="workout-library-week">
      {DAYS.map((day) => <div className={template.days.includes(day.key) ? "is-training" : ""} key={day.key}><b>{day.short}</b><span>{template.days.includes(day.key) ? template.name : "Почивка"}</span></div>)}
    </div>

    <div className="workout-library-groups">
      {groups.map(({ group, exercises }) => <section key={group}>
        <header><span>{group}</span><b>{exercises.length} {exercises.length === 1 ? "упражнение" : "упражнения"}</b></header>
        <div>{exercises.map((exercise, index) => <article key={exercise.id}><span>{String(template.exercises.indexOf(exercise) + 1).padStart(2, "0")}</span><div><strong>{exercise.name}</strong><p><b>{exercise.sets}</b> серии <i>×</i> <b>{exercise.reps}</b> повторения <i>·</i> Почивка <b>{exercise.restSeconds} сек.</b></p></div></article>)}</div>
      </section>)}
      {!template.exercises.length ? <div className="workout-library-no-exercises">Все още няма добавени упражнения.</div> : null}
    </div>

    {template.progression ? <aside className="workout-library-progression"><span>↗</span><div><strong>Прогресия</strong><p>{template.progression}</p></div></aside> : null}
  </section>;
}

export function WorkoutExperience({ initialTemplates }: { initialTemplates?: unknown }) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => normalizeTemplates(initialTemplates));
  const [selectedId, setSelectedId] = useState(() => normalizeTemplates(initialTemplates)[0]?.id ?? "");
  const [draft, setDraft] = useState<WorkoutTemplate | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  const selected = templates.find((template) => template.id === selectedId) ?? templates[0] ?? null;

  const persist = async (next: WorkoutTemplate[]) => {
    setSaveState("saving");
    setMessage("Запазване…");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { workout_templates: next } });
    if (error) {
      setSaveState("error");
      setMessage(`Тренировките не се запазиха: ${error.message}`);
      throw error;
    }
    setTemplates(next);
    setSaveState("saved");
    setMessage("✓ Тренировките са запазени.");
  };

  const saveTemplate = async (template: WorkoutTemplate) => {
    const exists = templates.some((item) => item.id === template.id);
    const next = exists ? templates.map((item) => item.id === template.id ? template : item) : [...templates, template];
    await persist(next);
    setSelectedId(template.id);
    setDraft(null);
  };

  const deleteTemplate = async (template: WorkoutTemplate) => {
    if (!window.confirm(`Да изтрия ли „${template.name}“?`)) return;
    const next = templates.filter((item) => item.id !== template.id);
    await persist(next);
    setSelectedId(next[0]?.id ?? "");
    setDraft(null);
  };

  const startWorkout = (template: WorkoutTemplate) => {
    if (!template.exercises.length) {
      setSaveState("error");
      setMessage("Добави поне едно упражнение, преди да започнеш.");
      return;
    }
    const detail: StartWorkoutDetail = {
      id: template.id,
      name: template.name,
      exercises: template.exercises.map((exercise) => ({
        id: exercise.id,
        group: exercise.group,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
      })),
    };
    window.dispatchEvent(new CustomEvent(START_WORKOUT_EVENT, { detail }));
  };

  const addTemplate = () => {
    const next = blankTemplate();
    setSelectedId(next.id);
    setDraft(next);
    setSaveState("idle");
    setMessage("");
  };

  return <section className="workout-library">
    <header className="workout-library-header">
      <div><p className="life-kicker">Моите програми</p><h1>Тренировки</h1><p>Създавай и подреждай тренировъчните си програми. Изпълнението и тежестите не се записват на този екран.</p></div>
      <button type="button" onClick={addTemplate}>＋ Добави тренировка</button>
    </header>

    {templates.length ? <nav className="workout-library-tabs" aria-label="Тренировъчни програми">{templates.map((template) => <button className={selected?.id === template.id && !draft ? "active" : ""} key={template.id} type="button" onClick={() => { setSelectedId(template.id); setDraft(null); }}><span>{template.name}</span><small>{template.exercises.length} упражнения</small></button>)}</nav> : null}

    {draft ? <TemplateEditor key={draft.id} template={draft} onCancel={() => setDraft(null)} onSave={saveTemplate} /> : selected ? <TemplateView template={selected} onStart={() => startWorkout(selected)} onEdit={() => setDraft(cloneTemplate(selected))} onDelete={() => deleteTemplate(selected)} /> : <section className="workout-library-empty"><h2>Добави първата си тренировка</h2><p>Задай упражнения, серии, повторения, почивки и дни от седмицата.</p><button type="button" onClick={addTemplate}>＋ Добави тренировка</button></section>}

    {message ? <p className={`workout-library-message ${saveState === "error" ? "is-error" : saveState === "saved" ? "is-success" : ""}`}>{message}</p> : null}
  </section>;
}
