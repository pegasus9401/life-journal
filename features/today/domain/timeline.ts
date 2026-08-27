import type { CalendarItem } from "@/features/calendar/types";
import { MEAL_LABELS, type NutritionEntry } from "@/features/nutrition/types";
import { mealTotals, type DynamicMeal } from "@/features/nutrition/dynamic-types";
import type { JournalEntry } from "@/features/travel/journal/types";
import type { DailyWellness } from "@/features/wellness/types";
import type { WorkoutSession } from "@/features/workouts/types";
import type { TimelineItem, TimelineStatus } from "../types";

const localTime = (iso: string) => new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
const statusFor = (completed: boolean | undefined, date: string, today: string): TimelineStatus => completed ? "completed" : date < today ? "missed" : "planned";

export function buildTimeline(input: { date: string; today: string; calendar: CalendarItem[]; nutrition: NutritionEntry[]; meals: DynamicMeal[]; workouts: WorkoutSession[]; journal: JournalEntry[]; wellness: DailyWellness | null }): TimelineItem[] {
  const result: TimelineItem[] = [];
  for (const item of input.calendar) {
    if (item.type === "birthday" || item.type === "workout") continue;
    if (item.type === "meal" && input.meals.length) continue;
    const category = item.type === "task" ? "tasks" : item.type === "meal" ? "food" : "events";
    result.push({ id: item.id, category, title: item.title, detail: item.location ?? undefined, time: item.time, sortAt: item.time ?? "23:50", status: statusFor(item.completed, input.date, input.today), href: `/calendar/edit/${item.type === "task" ? "task" : "event"}/${item.sourceId}`, icon: item.type === "task" ? "✓" : "▣" });
  }
  if (input.meals.length) {
    for (const meal of input.meals) {
      const totals = mealTotals(meal);
      result.push({ id: `meal:${meal.id}`, category: "food", title: meal.name, detail: meal.items.map((item) => item.label).slice(0, 3).join(" · "), meta: `${Math.round(totals.calories)} kcal · ${Math.round(totals.protein)} g протеин`, time: meal.plannedTime ?? undefined, sortAt: meal.plannedTime ?? `12:${String(meal.position).padStart(2, "0")}`, status: input.date < input.today ? "completed" : "planned", href: `/nutrition?date=${input.date}`, icon: "🍽" });
    }
  } else {
    const grouped = new Map<string, NutritionEntry[]>();
    for (const entry of input.nutrition) grouped.set(entry.meal_type, [...(grouped.get(entry.meal_type) ?? []), entry]);
    for (const [type, entries] of grouped) {
      const calories = entries.reduce((sum, entry) => sum + Number(entry.calories), 0);
      const protein = entries.reduce((sum, entry) => sum + Number(entry.protein_g), 0);
      const created = entries[0].created_at;
      result.push({ id: `nutrition:${type}`, category: "food", title: MEAL_LABELS[type as keyof typeof MEAL_LABELS], detail: entries.map((entry) => entry.name).join(" · "), meta: `${Math.round(calories)} kcal · ${Math.round(protein)} g протеин`, time: localTime(created), sortAt: localTime(created), status: "completed", href: `/nutrition?date=${input.date}`, icon: "🍽" });
    }
  }
  for (const workout of input.workouts) {
    const time = localTime(workout.created_at);
    result.push({ id: `workout:${workout.id}`, category: "workout", title: workout.title, detail: workout.workout_type === "cardio" ? "Кардио" : "Тренировка", meta: `${workout.duration_minutes} мин · ${workout.exercises.length} упражнения${workout.calories_burned ? ` · ${workout.calories_burned} kcal` : ""}`, time, sortAt: time, status: statusFor(workout.completed, input.date, input.today), href: "/workouts", icon: workout.workout_type === "cardio" ? "◒" : "◆" });
  }
  for (const entry of input.journal) {
    const time = localTime(entry.created_at);
    result.push({ id: `journal:${entry.id}`, category: "journal", title: entry.title, detail: entry.content_text.slice(0, 140), meta: [entry.mood, entry.journal_photos.length ? `${entry.journal_photos.length} снимки` : ""].filter(Boolean).join(" · "), time, sortAt: time, status: "completed", href: `/journal/${entry.id}`, icon: entry.journal_photos.length ? "▧" : "□" });
  }
  if (input.wellness) result.push({ id: `health:${input.date}`, category: "health", title: "Дневно състояние", detail: `${input.wellness.sleep_hours} ч сън · енергия ${input.wellness.energy}/5`, meta: input.wellness.resting_heart_rate ? `${input.wellness.resting_heart_rate} bpm в покой` : undefined, sortAt: "06:00", status: "completed", href: "/profile", icon: "♡" });
  return result.sort((a, b) => a.sortAt.localeCompare(b.sortAt) || a.title.localeCompare(b.title, "bg"));
}

