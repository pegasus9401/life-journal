"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "life-journal:active-workout:v1";
export const START_WORKOUT_EVENT = "life-journal:start-workout";

type StartExercise = {
  id: string;
  group: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
};

export type StartWorkoutDetail = {
  id: string;
  name: string;
  exercises: StartExercise[];
};

type SetResult = {
  reps: string;
  weight: string;
  done: boolean;
};

type ActiveExercise = StartExercise & {
  results: SetResult[];
};

type ActiveWorkout = {
  version: 1;
  id: string;
  templateId: string;
  name: string;
  startedAt: string;
  restEndsAt: number | null;
  exercises: ActiveExercise[];
};

function resultReps(target: string) {
  const matches = target.match(/\d+(?:[.,]\d+)?/g);
  return matches?.at(-1)?.replace(",", ".") ?? "";
}

function createActiveWorkout(template: StartWorkoutDetail): ActiveWorkout {
  return {
    version: 1,
    id: `active-${Date.now()}`,
    templateId: template.id,
    name: template.name,
    startedAt: new Date().toISOString(),
    restEndsAt: null,
    exercises: template.exercises.map((exercise) => ({
      ...exercise,
      results: Array.from({ length: Math.max(1, exercise.sets) }, () => ({
        reps: resultReps(exercise.reps),
        weight: "",
        done: false,
      })),
    })),
  };
}

function isActiveWorkout(value: unknown): value is ActiveWorkout {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ActiveWorkout>;
  return item.version === 1 && typeof item.id === "string" && typeof item.name === "string" && typeof item.startedAt === "string" && Array.isArray(item.exercises);
}

function formatTimer(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function localDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function ActiveExerciseTracker({
  exercise,
  exerciseIndex,
  updateSet,
  toggleSet,
  addSet,
}: {
  exercise: ActiveExercise;
  exerciseIndex: number;
  updateSet: (exerciseId: string, index: number, patch: Partial<SetResult>) => void;
  toggleSet: (exercise: ActiveExercise, index: number) => void;
  addSet: (exerciseId: string, targetReps: string) => void;
}) {
  const [open, setOpen] = useState(exerciseIndex === 0);
  const exerciseDone = exercise.results.filter((result) => result.done).length;

  return <article className={`active-exercise-card ${open ? "is-open" : ""}`}>
    <button className="active-exercise-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span>{String(exerciseIndex + 1).padStart(2, "0")}</span>
      <div><small>{exercise.group}</small><strong>{exercise.name}</strong><p>{exercise.sets} серии × {exercise.reps} · {exercise.restSeconds} сек. почивка</p></div>
      <b>{exerciseDone}/{exercise.results.length}</b>
      <i aria-hidden="true">⌄</i>
    </button>
    {open ? <div className="active-set-table">
      <div className="active-set-head"><span>Серия</span><span>Килограми</span><span>Повторения</span><span>Готово</span></div>
      {exercise.results.map((result, index) => <div className={result.done ? "is-done" : ""} key={index}>
        <b>{index + 1}</b>
        <input aria-label={`Тежест за серия ${index + 1} на ${exercise.name}`} inputMode="decimal" value={result.weight} onChange={(event) => updateSet(exercise.id, index, { weight: event.target.value })} placeholder="кг" />
        <input aria-label={`Повторения за серия ${index + 1} на ${exercise.name}`} inputMode="numeric" value={result.reps} onChange={(event) => updateSet(exercise.id, index, { reps: event.target.value })} placeholder={exercise.reps} />
        <button type="button" aria-label={result.done ? "Отбележи серията като незавършена" : "Завърши серията и започни почивката"} aria-pressed={result.done} onClick={() => toggleSet(exercise, index)}>{result.done ? "✓" : "○"}</button>
      </div>)}
      <button className="active-add-set" type="button" onClick={() => addSet(exercise.id, exercise.reps)}>＋ Добави серия</button>
    </div> : null}
  </article>;
}

export function ActiveWorkoutTracker() {
  const router = useRouter();
  const [active, setActive] = useState<ActiveWorkout | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isActiveWorkout(parsed)) setActive(parsed);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (active) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [active, hydrated]);

  useEffect(() => {
    const start = (event: Event) => {
      const detail = (event as CustomEvent<StartWorkoutDetail>).detail;
      if (!detail?.name || !Array.isArray(detail.exercises)) return;
      setActive((current) => {
        if (current && !window.confirm("Вече има активна тренировка. Да я заменя ли с новата?")) return current;
        setExpanded(true);
        setMessage("");
        return createActiveWorkout(detail);
      });
    };
    window.addEventListener(START_WORKOUT_EVENT, start);
    return () => window.removeEventListener(START_WORKOUT_EVENT, start);
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  const totals = useMemo(() => {
    if (!active) return { all: 0, done: 0, volume: 0 };
    let all = 0;
    let done = 0;
    let volume = 0;
    for (const exercise of active.exercises) {
      for (const result of exercise.results) {
        all += 1;
        if (result.done) {
          done += 1;
          volume += (Number(result.reps.replace(",", ".")) || 0) * (Number(result.weight.replace(",", ".")) || 0);
        }
      }
    }
    return { all, done, volume };
  }, [active]);

  if (!hydrated) return null;
  if (!active) return message ? <div className="active-workout-toast">{message}</div> : null;

  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(active.startedAt).getTime()) / 1000));
  const restSeconds = active.restEndsAt ? Math.max(0, Math.ceil((active.restEndsAt - now) / 1000)) : 0;
  const progress = totals.all ? Math.round((totals.done / totals.all) * 100) : 0;

  const updateSet = (exerciseId: string, index: number, patch: Partial<SetResult>) => {
    setActive((current) => current ? {
      ...current,
      exercises: current.exercises.map((exercise) => exercise.id === exerciseId ? {
        ...exercise,
        results: exercise.results.map((result, resultIndex) => resultIndex === index ? { ...result, ...patch } : result),
      } : exercise),
    } : current);
  };

  const toggleSet = (exercise: ActiveExercise, index: number) => {
    const result = exercise.results[index];
    const willComplete = !result.done;
    setActive((current) => current ? {
      ...current,
      restEndsAt: willComplete && exercise.restSeconds ? Date.now() + exercise.restSeconds * 1000 : current.restEndsAt,
      exercises: current.exercises.map((item) => item.id === exercise.id ? {
        ...item,
        results: item.results.map((set, setIndex) => setIndex === index ? { ...set, done: willComplete } : set),
      } : item),
    } : current);
    setNow(Date.now());
  };

  const addSet = (exerciseId: string, targetReps: string) => {
    setActive((current) => current ? {
      ...current,
      exercises: current.exercises.map((exercise) => exercise.id === exerciseId ? {
        ...exercise,
        results: [...exercise.results, { reps: resultReps(targetReps), weight: "", done: false }],
      } : exercise),
    } : current);
  };

  const changeRest = (seconds: number | null) => {
    setActive((current) => current ? { ...current, restEndsAt: seconds === null ? null : Date.now() + Math.max(0, seconds) * 1000 } : current);
    setNow(Date.now());
  };

  const cancelWorkout = () => {
    if (!window.confirm("Да прекратя ли тренировката без да запазвам резултат?")) return;
    setActive(null);
    setExpanded(false);
    setMessage("");
  };

  const finishWorkout = async () => {
    if (!totals.done) {
      setMessage("Отбележи поне една изпълнена серия.");
      setExpanded(true);
      return;
    }
    if (!window.confirm("Да приключа и запазя резултата от тренировката?")) return;

    setFinishing(true);
    setMessage("Запазване на резултата…");
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setFinishing(false);
      setMessage("Сесията е изтекла. Резултатът още не е изтрит.");
      return;
    }

    const exercises = active.exercises.flatMap((exercise) => {
      const completed = exercise.results.filter((result) => result.done);
      if (!completed.length) return [];
      const weights = completed.map((result) => Number(result.weight.replace(",", ".")) || 0);
      return [{
        name: exercise.name,
        muscle_group: exercise.group,
        sets: completed.length,
        reps: completed.map((result) => result.reps || "0").join(" / "),
        weight: Math.max(...weights),
        rest_seconds: exercise.restSeconds,
        set_results: completed.map((result, index) => ({
          set: index + 1,
          reps: Number(result.reps.replace(",", ".")) || 0,
          weight: Number(result.weight.replace(",", ".")) || 0,
        })),
      }];
    });

    const duration = Math.max(1, Math.round((Date.now() - new Date(active.startedAt).getTime()) / 60000));
    const { error } = await supabase.from("workout_sessions").insert({
      owner_id: user.id,
      workout_date: localDateKey(),
      title: active.name,
      workout_type: "strength",
      duration_minutes: duration,
      calories_burned: 0,
      notes: `Изпълнени ${totals.done} от ${totals.all} серии · общ обем ${Math.round(totals.volume)} кг`,
      exercises,
      completed: true,
    });

    if (error) {
      setFinishing(false);
      setMessage(`Резултатът не се запази: ${error.message}`);
      return;
    }

    setActive(null);
    setExpanded(false);
    setFinishing(false);
    setMessage("✓ Тренировката е приключена и резултатът е записан.");
    window.setTimeout(() => setMessage(""), 5000);
    router.refresh();
  };

  return <>
    {!expanded ? <aside className="active-workout-dock" aria-label="Активна тренировка">
      <button className="active-workout-dock-main" type="button" onClick={() => setExpanded(true)}>
        <span className="active-workout-pulse" />
        <span><small>Активна тренировка</small><strong>{active.name}</strong></span>
      </button>
      <div className="active-workout-dock-stat"><small>{restSeconds ? "Почивка" : "Време"}</small><strong className={restSeconds ? "is-rest" : ""}>{formatTimer(restSeconds || elapsedSeconds)}</strong></div>
      <div className="active-workout-dock-stat"><small>Прогрес</small><strong>{progress}%</strong></div>
      <button className="active-workout-expand" type="button" onClick={() => setExpanded(true)}>Отвори</button>
    </aside> : <aside className="active-workout-panel" aria-label="Активна тренировка">
      <header>
        <div><p className="life-kicker">Активна тренировка</p><h2>{active.name}</h2><span>{formatTimer(elapsedSeconds)} · {totals.done}/{totals.all} серии · {Math.round(totals.volume)} кг обем</span></div>
        <button type="button" aria-label="Минимизирай тренировката" onClick={() => setExpanded(false)}>—</button>
      </header>

      {restSeconds ? <section className="active-rest-timer">
        <div><span>Почивка</span><strong>{formatTimer(restSeconds)}</strong></div>
        <div><button type="button" onClick={() => changeRest(restSeconds + 30)}>＋30 сек.</button><button type="button" onClick={() => changeRest(null)}>Пропусни</button></div>
      </section> : null}

      <div className="active-workout-progress"><span style={{ width: `${progress}%` }} /><b>{progress}%</b></div>
      {message ? <p className="active-workout-message">{message}</p> : null}

      <div className="active-workout-exercises">
        {active.exercises.map((exercise, exerciseIndex) => <ActiveExerciseTracker
          key={exercise.id}
          exercise={exercise}
          exerciseIndex={exerciseIndex}
          updateSet={updateSet}
          toggleSet={toggleSet}
          addSet={addSet}
        />)}
      </div>

      <footer><button type="button" onClick={cancelWorkout}>Прекрати</button><button type="button" onClick={() => setExpanded(false)}>Минимизирай</button><button className="finish" type="button" onClick={finishWorkout} disabled={finishing}>{finishing ? "Запазване…" : "Приключи тренировката"}</button></footer>
    </aside>}
  </>;
}
