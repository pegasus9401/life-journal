"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

// Active workouts persist locally so the tracker survives navigation and refreshes.
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
  sessionId?: string;
  name: string;
  exercises: StartExercise[];
};

type SetResult = {
  reps: string;
  weight: string;
  done: boolean;
  previous?: string;
};

type ActiveExercise = StartExercise & {
  results: SetResult[];
};

type ActiveWorkout = {
  version: 1;
  id: string;
  templateId: string;
  sessionId: string | null;
  name: string;
  startedAt: string;
  restEndsAt: number | null;
  restNotificationSentFor?: number | null;
  exercises: ActiveExercise[];
};

const NOTIFICATION_WORKER = "/workout-notifications-sw.js";

function supportsWorkoutNotifications() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

async function prepareWorkoutNotifications(requestPermission = false) {
  if (!supportsWorkoutNotifications()) return false;
  let permission = Notification.permission;
  if (requestPermission && permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  await navigator.serviceWorker.register(NOTIFICATION_WORKER, { scope: "/" });
  return true;
}

async function showRestCompleteNotification(workoutName: string, nextExercise?: string) {
  if (!await prepareWorkoutNotifications()) return;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification("Почивката приключи", {
    body: nextExercise ? `Време е за следващата серия: ${nextExercise}` : `Продължи с ${workoutName}.`,
    icon: "/images/pegas-friend.png",
    badge: "/images/pegas-friend.png",
    tag: "pegasos-rest-timer",
    data: { url: "/workouts" },
  });
  navigator.vibrate?.([180, 80, 180]);
}

function resultReps(target: string) {
  const matches = target.match(/\d+(?:[.,]\d+)?/g);
  return matches?.at(-1)?.replace(",", ".") ?? "";
}

function previousSets(raw: unknown, exerciseName: string) {
  if (!Array.isArray(raw)) return [] as string[];
  const previous = raw.find((item) => item && typeof item === "object" && (item as { name?: unknown }).name === exerciseName) as { set_results?: unknown; sets?: unknown; reps?: unknown; weight?: unknown } | undefined;
  if (!previous) return [] as string[];

  if (Array.isArray(previous.set_results)) {
    return previous.set_results.map((item) => {
      if (!item || typeof item !== "object") return "—";
      const value = item as { weight?: unknown; reps?: unknown };
      const weight = Number(value.weight) || 0;
      const reps = Number(value.reps) || 0;
      return weight ? `${weight} кг × ${reps}` : `${reps} повторения`;
    });
  }

  const sets = Math.max(0, Number(previous.sets) || 0);
  const reps = String(previous.reps ?? "—").split("/").map((value) => value.trim());
  const weight = Number(previous.weight) || 0;
  return Array.from({ length: sets }, (_, index) => weight ? `${weight} кг × ${reps[index] ?? reps[0] ?? "—"}` : `${reps[index] ?? reps[0] ?? "—"} повторения`);
}

function createActiveWorkout(template: StartWorkoutDetail, previousExercises?: unknown): ActiveWorkout {
  return {
    version: 1,
    id: `active-${Date.now()}`,
    templateId: template.id,
    sessionId: template.sessionId ?? null,
    name: template.name,
    startedAt: new Date().toISOString(),
    restEndsAt: null,
    restNotificationSentFor: null,
    exercises: template.exercises.map((exercise) => {
      const previous = previousSets(previousExercises, exercise.name);
      return {
        ...exercise,
        results: Array.from({ length: Math.max(1, exercise.sets) }, (_, index) => ({
          reps: resultReps(exercise.reps),
          weight: "",
          done: false,
          previous: previous[index],
        })),
      };
    }),
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

function progressionSuggestion(exercise: ActiveExercise) {
  const previous = exercise.results.find((result) => result.previous && result.previous !== "—")?.previous;
  if (!previous) return "Запиши първо изпълнение, за да получиш препоръка.";
  const match = previous.match(/([\d.,]+)\s*кг\s*×\s*(\d+)/i);
  if (!match) return `Повтори предишното: ${previous}`;
  const weight = Number(match[1].replace(",", ".")) || 0; const reps = Number(match[2]) || 0;
  const target = Number(resultReps(exercise.reps)) || reps;
  return reps >= target ? `${weight + 2.5} кг × ${Math.max(1, target - 2)}–${target}` : `${weight} кг × ${Math.min(target, reps + 1)}`;
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
  const exerciseDone = exercise.results.filter((result) => result.done).length;
  const [isOpen, setIsOpen] = useState(exerciseIndex === 0);

  return <article className={`active-exercise-card${isOpen ? " is-open" : ""}`}>
    <button
      className="active-exercise-toggle"
      type="button"
      aria-expanded={isOpen}
      aria-controls={`active-exercise-sets-${exercise.id}`}
      onClick={() => setIsOpen((current) => !current)}
    >
      <span>{String(exerciseIndex + 1).padStart(2, "0")}</span>
      <div><small>{exercise.group}</small><strong>{exercise.name}</strong><p>{exercise.results.length} серии × {exercise.reps} · {exercise.restSeconds} сек. почивка</p></div>
      <b>{exerciseDone}/{exercise.results.length}</b>
      <i aria-hidden="true">⌄</i>
    </button>
    {isOpen ? <div className="active-exercise-suggestion">Предложение: {progressionSuggestion(exercise)}</div> : null}
    {isOpen ? <div className="active-set-table" id={`active-exercise-sets-${exercise.id}`}>
      <div className="active-set-head"><span>Серия</span><span>Предишно</span><span>кг</span><span>Повторения</span><span>✓</span></div>
      {exercise.results.map((result, index) => <div className={result.done ? "is-done" : ""} key={index}>
        <b className={result.done ? "is-done" : ""}>{result.done ? "✓" : index + 1}</b>
        <span className="active-set-previous">{result.previous ?? "—"}</span>
        <input aria-label={`Тежест за серия ${index + 1} на ${exercise.name}`} inputMode="decimal" value={result.weight} onChange={(event) => updateSet(exercise.id, index, { weight: event.target.value })} placeholder="0" />
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
    const frame = window.requestAnimationFrame(() => {
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
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (active) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [active, hydrated]);

  useEffect(() => {
    const start = async (event: Event) => {
      const detail = (event as CustomEvent<StartWorkoutDetail>).detail;
      if (!detail?.name || !Array.isArray(detail.exercises)) return;

      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && !window.confirm("Вече има активна тренировка. Да я заменя ли с новата?")) return;

      let previousExercises: unknown;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from("workout_sessions")
          .select("exercises")
          .eq("title", detail.name)
          .eq("completed", true)
          .order("workout_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) console.warn("[active-workout] Previous performance was not loaded.", error.message);
        previousExercises = data?.exercises;

        const startedAt = new Date().toISOString();
        let sessionId = detail.sessionId ?? null;
        if (sessionId) {
          const { error: startError } = await supabase.from("workout_sessions").update({ status: "in_progress", started_at: startedAt, completed: false }).eq("id", sessionId).eq("owner_id", user.id);
          if (startError) throw startError;
        } else {
          const { data: created, error: createError } = await supabase.from("workout_sessions").insert({ owner_id: user.id, workout_date: localDateKey(), title: detail.name, workout_type: "strength", duration_minutes: 0, calories_burned: 0, exercises: detail.exercises.map((exercise) => ({ name: exercise.name, muscle_group: exercise.group, sets: exercise.sets, reps: exercise.reps, weight: 0, rest_seconds: exercise.restSeconds })), completed: false, status: "in_progress", started_at: startedAt }).select("id").single();
          if (createError) throw createError;
          sessionId = created.id;
        }
        detail.sessionId = sessionId ?? undefined;
      } catch (error) {
        console.warn("[active-workout] Previous performance lookup failed.", error);
      }

      setExpanded(true);
      setMessage("");
      setActive(createActiveWorkout(detail, previousExercises));
    };
    window.addEventListener(START_WORKOUT_EVENT, start);
    return () => window.removeEventListener(START_WORKOUT_EVENT, start);
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!hydrated || !active?.sessionId) return;
    let cancelled = false;
    const reconcileSessions = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { error } = await supabase
        .from("workout_sessions")
        .update({ status: "cancelled", completed: false, skipped_at: new Date().toISOString() })
        .eq("owner_id", user.id)
        .eq("status", "in_progress")
        .neq("id", active.sessionId);
      if (error) console.warn("[active-workout] Stale sessions were not reconciled.", error.message);
      else if (!cancelled) router.refresh();
    };
    void reconcileSessions();
    return () => { cancelled = true; };
  }, [active?.sessionId, hydrated, router]);

  useEffect(() => {
    if (!active?.restEndsAt || active.restNotificationSentFor === active.restEndsAt || now < active.restEndsAt) return;
    const completedRestEnd = active.restEndsAt;
    const nextExercise = active.exercises.find((exercise) => exercise.results.some((result) => !result.done))?.name;
    const notificationTimer = window.setTimeout(() => {
      setActive((current) => current ? { ...current, restNotificationSentFor: completedRestEnd } : current);
      void showRestCompleteNotification(active.name, nextExercise).catch((error) => {
        console.warn("[active-workout] Rest notification failed.", error);
      });
    }, 0);
    return () => window.clearTimeout(notificationTimer);
  }, [active, now]);

  useEffect(() => {
    const collapse = () => setExpanded(false);
    window.addEventListener("gesture-close-overlay", collapse);
    return () => window.removeEventListener("gesture-close-overlay", collapse);
  }, []);

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
    if (willComplete && exercise.restSeconds && supportsWorkoutNotifications() && Notification.permission === "default") {
      void prepareWorkoutNotifications(true).catch((error) => {
        console.warn("[active-workout] Notification permission failed.", error);
      });
    }
    setActive((current) => current ? {
      ...current,
      restEndsAt: willComplete && exercise.restSeconds ? Date.now() + exercise.restSeconds * 1000 : current.restEndsAt,
      restNotificationSentFor: willComplete && exercise.restSeconds ? null : current.restNotificationSentFor,
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
    setActive((current) => current ? {
      ...current,
      restEndsAt: seconds === null ? null : Date.now() + Math.max(0, seconds) * 1000,
      restNotificationSentFor: null,
    } : current);
    setNow(Date.now());
  };

  const cancelWorkout = async () => {
    if (!window.confirm("Да прекратя ли тренировката без да запазвам резултат?")) return;
    setFinishing(true);
    setMessage("Прекратяване на тренировката…");
    if (active.sessionId) {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setFinishing(false);
        setMessage("Сесията е изтекла. Тренировката още не е прекратена.");
        return;
      }
      const { error } = await supabase
        .from("workout_sessions")
        .update({ status: "cancelled", completed: false, skipped_at: new Date().toISOString() })
        .eq("id", active.sessionId)
        .eq("owner_id", user.id);
      if (error) {
        setFinishing(false);
        setMessage(`Тренировката не беше прекратена: ${error.message}`);
        return;
      }
    }
    setActive(null);
    setExpanded(false);
    setFinishing(false);
    setMessage("Тренировката е прекратена.");
    window.setTimeout(() => setMessage(""), 4000);
    router.refresh();
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
    const sessionRow = {
      owner_id: user.id,
      workout_date: localDateKey(),
      title: active.name,
      workout_type: "strength",
      duration_minutes: duration,
      calories_burned: 0,
      notes: `Изпълнени ${totals.done} от ${totals.all} серии · общ обем ${Math.round(totals.volume)} кг`,
      exercises,
      completed: true,
      status: "completed",
      started_at: active.startedAt,
      completed_at: new Date().toISOString(),
    };
    const result = active.sessionId
      ? await supabase.from("workout_sessions").update(sessionRow).eq("id", active.sessionId).eq("owner_id", user.id).select("id").single()
      : await supabase.from("workout_sessions").insert(sessionRow).select("id").single();
    const { data: savedSession, error } = result;

    if (error) {
      console.error("[active-workout] Result save failed.", error.message);
      setFinishing(false);
      setMessage(`Резултатът не се запази: ${error.message}`);
      return;
    }

    const normalizedSets = active.exercises.flatMap((exercise) => exercise.results.flatMap((set, index) => set.done ? [{
      owner_id: user.id, workout_session_id: savedSession.id, exercise_key: exercise.id, exercise_name: exercise.name, muscle_group: exercise.group,
      set_number: index + 1, weight_kg: Number(set.weight.replace(",", ".")) || 0, reps: Number(set.reps.replace(",", ".")) || 0, completed_at: new Date().toISOString(),
    }] : []));
    if (normalizedSets.length) {
      const { error: setsError } = await supabase.from("workout_sets").upsert(normalizedSets, { onConflict: "workout_session_id,exercise_key,set_number" });
      if (setsError) console.warn("[active-workout] Normalized sets were not saved.", setsError.message);
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
        <b className={`active-workout-dock-timer${restSeconds ? " is-rest" : ""}`}>
          <small>{restSeconds ? "Почивка" : "Време"}</small>
          <time>{formatTimer(restSeconds || elapsedSeconds)}</time>
        </b>
      </button>
      <div className="active-workout-dock-stat"><small>{restSeconds ? "Почивка" : "Време"}</small><strong className={restSeconds ? "is-rest" : ""}>{formatTimer(restSeconds || elapsedSeconds)}</strong></div>
      <div className="active-workout-dock-stat"><small>Прогрес</small><strong>{progress}%</strong></div>
      <button className="active-workout-expand" type="button" onClick={() => setExpanded(true)}>Отвори</button>
    </aside> : <aside className="active-workout-panel" aria-label="Екран на активната тренировка">
      <header>
        <div><p className="life-kicker">Активна тренировка</p><h2>{active.name}</h2><span>{formatTimer(elapsedSeconds)} · {totals.done}/{totals.all} серии · {Math.round(totals.volume)} кг обем</span></div>
        <div className="active-workout-header-actions">
          <button type="button" aria-label="Минимизирай тренировката" onClick={() => setExpanded(false)}>⌄</button>
          <button className="finish" type="button" onClick={finishWorkout} disabled={finishing}>{finishing ? "Запазване…" : "Приключи"}</button>
        </div>
      </header>

      {restSeconds ? <section className="active-rest-timer" aria-live="polite">
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

      <footer><button type="button" onClick={() => void cancelWorkout()} disabled={finishing}>Прекрати тренировката</button><button type="button" onClick={() => setExpanded(false)} disabled={finishing}>Минимизирай и продължи в приложението</button></footer>
    </aside>}
  </>;
}
