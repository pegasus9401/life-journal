import assert from "node:assert/strict";
import test from "node:test";
import { fitnessSummary, sessionMetrics, strengthProgression, workoutStatus } from "./fitness-analytics.ts";
import type { WorkoutSession } from "../types.ts";

const session = (patch: Partial<WorkoutSession>): WorkoutSession => ({
  id: crypto.randomUUID(), owner_id: "owner", workout_date: "2026-08-28", title: "Full Body A", workout_type: "strength", duration_minutes: 50,
  calories_burned: 0, notes: null, completed: true, created_at: "2026-08-28T16:00:00Z", updated_at: "2026-08-28T17:00:00Z",
  exercises: [{ name: "Chest Press", muscle_group: "Гърди", sets: 2, reps: "10", weight: 50, set_results: [{ set: 1, reps: 10, weight: 50 }, { set: 2, reps: 8, weight: 50 }] }],
  ...patch,
});

test("legacy completed sessions remain completed", () => {
  assert.equal(workoutStatus(session({ status: undefined, completed: true })), "completed");
  assert.equal(workoutStatus(session({ status: undefined, completed: false })), "planned");
});

test("volume and sets are calculated from actual set results", () => {
  assert.deepEqual(sessionMetrics(session({})), { sets: 2, volume: 900 });
});

test("summary uses only completed records and separates cardio", () => {
  const data = fitnessSummary([session({}), session({ id: "cardio", workout_type: "cardio", duration_minutes: 30, exercises: [] }), session({ id: "planned", completed: false, status: "planned" })]);
  assert.equal(data.workouts, 2); assert.equal(data.minutes, 80); assert.equal(data.cardioSessions, 1); assert.equal(data.cardioMinutes, 30); assert.equal(data.volume, 900);
});

test("strength progression compares first and latest real volume", () => {
  const latest = session({ id: "latest", workout_date: "2026-08-28", exercises: [{ name: "Chest Press", muscle_group: "Гърди", sets: 2, reps: "10", weight: 60, set_results: [{ set: 1, reps: 10, weight: 60 }, { set: 2, reps: 10, weight: 60 }] }] });
  const progress = strengthProgression([session({ workout_date: "2026-07-01" }), latest]);
  assert.equal(progress[0].name, "Chest Press"); assert.equal(progress[0].percent, 33); assert.equal(progress[0].latest, "60 kg × 10");
});
