import type { WorkoutExercise, WorkoutSession, WorkoutStatus } from "../types";

export const MUSCLE_ORDER = ["Гърди", "Гръб", "Рамене", "Ръце", "Крака", "Корем"] as const;
export type MuscleGroup = (typeof MUSCLE_ORDER)[number];

const aliases: Record<string, MuscleGroup> = {
  chest: "Гърди", "гърди": "Гърди", back: "Гръб", "гръб": "Гръб", shoulders: "Рамене", shoulder: "Рамене", "рамене": "Рамене",
  arms: "Ръце", biceps: "Ръце", triceps: "Ръце", "ръце": "Ръце", legs: "Крака", quads: "Крака", hamstrings: "Крака", glutes: "Крака", "крака": "Крака",
  core: "Корем", abs: "Корем", "корем": "Корем",
};

export function workoutStatus(session: WorkoutSession): WorkoutStatus {
  return session.status ?? (session.completed ? "completed" : "planned");
}

export function workoutStartTime(session: WorkoutSession) {
  const source = session.scheduled_at ?? session.started_at ?? session.created_at;
  return new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(source));
}

export function exerciseSets(exercise: WorkoutExercise) {
  if (Array.isArray(exercise.set_results) && exercise.set_results.length) return exercise.set_results.map((set) => ({ reps: Number(set.reps) || 0, weight: Number(set.weight) || 0 }));
  const reps = String(exercise.reps).split("/").map((value) => Number(value.trim().replace(",", ".")) || 0);
  return Array.from({ length: Math.max(0, Number(exercise.sets) || 0) }, (_, index) => ({ reps: reps[index] ?? reps[0] ?? 0, weight: Number(exercise.weight) || 0 }));
}

export function sessionMetrics(session: WorkoutSession) {
  let sets = 0; let volume = 0;
  for (const exercise of session.exercises) for (const set of exerciseSets(exercise)) { sets += 1; volume += set.reps * set.weight; }
  return { sets, volume };
}

export function muscleFor(exercise: WorkoutExercise): MuscleGroup | null {
  const raw = String(exercise.muscle_group ?? "").trim().toLocaleLowerCase("bg-BG");
  if (aliases[raw]) return aliases[raw];
  const name = exercise.name.toLocaleLowerCase("bg-BG");
  if (/chest|гърд|bench|pec/.test(name)) return "Гърди";
  if (/row|pulldown|греб|гръб|скрипец/.test(name)) return "Гръб";
  if (/shoulder|lateral|рамен/.test(name)) return "Рамене";
  if (/biceps|triceps|curl|бицеп|трицеп/.test(name)) return "Ръце";
  if (/leg|squat|бедро|крак|glute|calf/.test(name)) return "Крака";
  if (/abdominal|crunch|корем|plank/.test(name)) return "Корем";
  return null;
}

export function fitnessSummary(sessions: WorkoutSession[]) {
  const completed = sessions.filter((session) => workoutStatus(session) === "completed");
  let minutes = 0; let sets = 0; let volume = 0; let cardioMinutes = 0; let cardioSessions = 0;
  const muscles = Object.fromEntries(MUSCLE_ORDER.map((group) => [group, 0])) as Record<MuscleGroup, number>;
  for (const session of completed) {
    minutes += Number(session.duration_minutes) || 0;
    if (session.workout_type === "cardio") { cardioSessions += 1; cardioMinutes += Number(session.duration_minutes) || 0; }
    const metrics = sessionMetrics(session); sets += metrics.sets; volume += metrics.volume;
    for (const exercise of session.exercises) {
      const group = muscleFor(exercise); if (!group) continue;
      const exerciseVolume = exerciseSets(exercise).reduce((sum, set) => sum + set.reps * set.weight, 0);
      muscles[group] += exerciseVolume || exerciseSets(exercise).length;
    }
  }
  return { workouts: completed.length, minutes, sets, volume, cardioMinutes, cardioSessions, muscles };
}

export type ExerciseProgress = { name: string; previous: string; latest: string; percent: number | null; latestVolume: number; history: number[] };

export function strengthProgression(sessions: WorkoutSession[]): ExerciseProgress[] {
  const history = new Map<string, { name: string; date: string; top: string; volume: number }[]>();
  for (const session of sessions.filter((item) => workoutStatus(item) === "completed" && item.workout_type === "strength")) {
    for (const exercise of session.exercises) {
      const sets = exerciseSets(exercise); if (!sets.length) continue;
      const volume = sets.reduce((sum, set) => sum + set.reps * set.weight, 0);
      const best = sets.toSorted((left, right) => right.weight - left.weight || right.reps - left.reps)[0];
      const key = exercise.name.trim().toLocaleLowerCase("bg-BG");
      history.set(key, [...(history.get(key) ?? []), { name: exercise.name, date: session.workout_date, top: best.weight ? `${best.weight} kg × ${best.reps}` : `${best.reps} reps`, volume }]);
    }
  }
  return [...history.values()].flatMap((entries) => {
    const sorted = entries.toSorted((a, b) => a.date.localeCompare(b.date));
    if (!sorted.length) return [];
    const first = sorted[0]; const latest = sorted.at(-1)!; const previous = sorted.at(-2) ?? first;
    return [{ name: latest.name, previous: previous.top, latest: latest.top, percent: first.volume > 0 ? Math.round((latest.volume - first.volume) / first.volume * 100) : null, latestVolume: latest.volume, history: sorted.map((item) => item.volume) }];
  }).toSorted((a, b) => (b.percent ?? -Infinity) - (a.percent ?? -Infinity));
}
