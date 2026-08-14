import assert from "node:assert/strict";
import test from "node:test";
import { expandRecurrence, nextOccurrence, startOfWeek, zonedDateTimeToUtc } from "./date-utils.ts";

test("седмицата започва в понеделник", () => {
  assert.equal(startOfWeek("2026-08-14"), "2026-08-10");
});

test("месечното повторение не прескача кратък месец", () => {
  assert.equal(nextOccurrence("2026-01-31", "monthly"), "2026-02-28");
});

test("повторенията се ограничават от избрания период", () => {
  assert.deepEqual(expandRecurrence("2026-08-01", "weekly", 1, "2026-08-10", "2026-08-31"), ["2026-08-15", "2026-08-22", "2026-08-29"]);
});

test("локалният час в София се записва като точен UTC момент", () => {
  assert.equal(zonedDateTimeToUtc("2026-08-14", "09:30", "Europe/Sofia"), "2026-08-14T06:30:00.000Z");
});
